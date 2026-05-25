import type { APIRoute } from 'astro';
import { DELIVERY_FEE_COP } from '../../lib/constants';
import { sendOrderWebhook } from '../../lib/notify-order-server';
import { getSupabaseAdmin } from '../../lib/supabase-admin';
import type { CartLine, CustomerInfo } from '../../types/order';
import { cartSubtotal } from '../../lib/order';

export const prerender = false;

type Body = {
  lines: CartLine[];
  customer: CustomerInfo;
};

function generateCode() {
  return `CW-${Math.floor(1000 + Math.random() * 9000)}`;
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = (await request.json()) as Body;
    const { lines, customer } = body;

    if (!lines?.length) {
      return new Response(JSON.stringify({ error: 'El pedido está vacío' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!customer?.name?.trim() || !customer?.phone?.trim()) {
      return new Response(JSON.stringify({ error: 'Nombre y teléfono obligatorios' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (customer.fulfillment === 'delivery' && !customer.address?.trim()) {
      return new Response(JSON.stringify({ error: 'Dirección obligatoria para domicilio' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const supabase = getSupabaseAdmin();

    const { data: shop } = await supabase
      .from('shop_settings')
      .select('is_open')
      .eq('id', 1)
      .single();

    if (!shop?.is_open) {
      return new Response(
        JSON.stringify({ error: 'La tienda está cerrada. Intenta más tarde.' }),
        { status: 403, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const subtotal = cartSubtotal(lines);
    const deliveryFee =
      customer.fulfillment === 'delivery' ? DELIVERY_FEE_COP : 0;
    const total = subtotal + deliveryFee;
    const code = generateCode();

    const { data: order, error: orderError } = await supabase
      .from('orders')
      .insert({
        code,
        customer_name: customer.name.trim(),
        customer_phone: customer.phone.trim(),
        fulfillment: customer.fulfillment,
        delivery_address:
          customer.fulfillment === 'delivery' ? customer.address?.trim() : null,
        delivery_fee: deliveryFee,
        timing: customer.pickup,
        scheduled_time: customer.pickupTime ?? null,
        notes: customer.notes?.trim() || null,
        subtotal,
        total,
        status: 'placed',
      })
      .select('id, code, created_at')
      .single();

    if (orderError) throw orderError;

    const orderLines = lines.map((line) => ({
      order_id: order.id,
      menu_item_id: line.menuItemId,
      item_name: line.name,
      quantity: line.quantity,
      modifier_labels: line.modifierLabels,
      line_total: line.lineTotal,
    }));

    const { error: linesError } = await supabase
      .from('order_lines')
      .insert(orderLines);

    if (linesError) throw linesError;

    void sendOrderWebhook({
      code: order.code,
      customerName: customer.name.trim(),
      customerPhone: customer.phone.trim(),
      fulfillment: customer.fulfillment,
      deliveryAddress:
        customer.fulfillment === 'delivery' ? customer.address?.trim() ?? null : null,
      total,
      subtotal,
      notes: customer.notes?.trim() || null,
      lines: lines.map((l) => ({
        name: l.name,
        quantity: l.quantity,
        modifiers: l.modifierLabels,
        lineTotal: l.lineTotal,
      })),
      createdAt: order.created_at,
    }).catch(() => {});

    return new Response(
      JSON.stringify({
        code: order.code,
        total,
        deliveryFee,
        createdAt: order.created_at,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error al guardar pedido';
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
