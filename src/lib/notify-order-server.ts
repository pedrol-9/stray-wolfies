import { formatCOP } from './format';

export type OrderNotifyPayload = {
  code: string;
  customerName: string;
  customerPhone: string;
  fulfillment: string;
  deliveryAddress: string | null;
  total: number;
  subtotal: number;
  notes: string | null;
  lines: { name: string; quantity: number; modifiers: string[]; lineTotal: number }[];
  createdAt: string;
};

export function buildWebhookText(p: OrderNotifyPayload): string {
  const items = p.lines
    .map((l) => {
      const m = l.modifiers.length ? ` (${l.modifiers.join(', ')})` : '';
      return `• ${l.quantity > 1 ? `${l.quantity}× ` : ''}${l.name}${m}`;
    })
    .join('\n');

  return [
    `🐺 CALLEJEROS — ${p.code}`,
    `${p.customerName} · ${p.customerPhone}`,
    p.fulfillment === 'delivery'
      ? `Domicilio: ${p.deliveryAddress ?? ''}`
      : 'Recoger en local',
    items,
    `Total: ${formatCOP(p.total)}`,
    p.notes ? `Nota: ${p.notes}` : '',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Webhook genérico (Make, Zapier, n8n) → conectar módulo WhatsApp */
export async function sendOrderWebhook(payload: OrderNotifyPayload): Promise<void> {
  const url = import.meta.env.ORDER_WEBHOOK_URL?.trim();
  if (!url) return;

  await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      event: 'order.placed',
      text: buildWebhookText(payload),
      ...payload,
    }),
  });
}
