import { formatCOP } from './format';
import { formatFulfillment, formatTiming } from './order-status';
import type { AdminOrder } from '../types/admin-order';

export function formatOrderWhatsAppText(order: AdminOrder): string {
  const lines = order.order_lines ?? [];
  const items = lines
    .map((l) => {
      const mods =
        l.modifier_labels?.length > 0 ? ` (${l.modifier_labels.join(', ')})` : '';
      return `• ${l.quantity > 1 ? `${l.quantity}× ` : ''}${l.item_name}${mods} — ${formatCOP(l.line_total)}`;
    })
    .join('\n');

  return [
    `🐺 *CALLEJEROS — Nuevo pedido ${order.code}*`,
    ``,
    `👤 ${order.customer_name}`,
    `📱 ${order.customer_phone}`,
    `📦 ${formatFulfillment(order.fulfillment, order.delivery_address)}`,
    `⏱ ${formatTiming(order.timing, order.scheduled_time)}`,
    ``,
    `*Pedido:*`,
    items,
    ``,
    `💰 *Total:* ${formatCOP(order.total)}`,
    order.notes ? `📝 ${order.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Abre WhatsApp con mensaje listo para enviar al número del dueño */
export function openWhatsAppToOwner(ownerPhone: string, message: string) {
  const digits = ownerPhone.replace(/\D/g, '');
  if (!digits) return;
  const url = `https://wa.me/${digits}?text=${encodeURIComponent(message)}`;
  window.open(url, '_blank', 'noopener,noreferrer');
}

export function getOwnerWhatsApp(): string | undefined {
  const v = import.meta.env.PUBLIC_OWNER_WHATSAPP;
  return v?.trim() || undefined;
}
