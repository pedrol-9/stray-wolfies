import { formatCOP } from '../../lib/format';
import {
  formatFulfillment,
  formatOrderTime,
  formatTiming,
  getOrderActions,
  STATUS_LABELS,
} from '../../lib/order-status';
import {
  formatOrderWhatsAppText,
  getOwnerWhatsApp,
  openWhatsAppToOwner,
} from '../../lib/order-whatsapp';
import type { AdminOrder, OrderStatus } from '../../types/admin-order';

type Props = {
  order: AdminOrder;
  onStatusChange: (orderId: string, status: OrderStatus) => Promise<void>;
  busy: boolean;
};

export default function OrderCard({ order, onStatusChange, busy }: Props) {
  const actions = getOrderActions(order.status, order.fulfillment);
  const ownerWhatsApp = getOwnerWhatsApp();
  const phoneDigits = order.customer_phone.replace(/\D/g, '');
  const waLink = phoneDigits
    ? `https://wa.me/57${phoneDigits.replace(/^57/, '')}`
    : null;

  return (
    <article className="card-ash flex flex-col gap-3 p-4 text-left">
      <div className="flex items-start justify-between gap-2">
        <div>
          <p className="font-display text-lg text-cream">{order.code}</p>
          <p className="text-xs text-smoke">{formatOrderTime(order.created_at)}</p>
        </div>
        <span className="rounded-lg bg-flame/15 px-2 py-1 text-xs font-medium text-gold">
          {STATUS_LABELS[order.status]}
        </span>
      </div>

      <div className="text-sm">
        <p className="font-semibold text-cream">{order.customer_name}</p>
        {waLink ? (
          <a
            href={waLink}
            target="_blank"
            rel="noreferrer"
            className="text-gold underline"
          >
            {order.customer_phone}
          </a>
        ) : (
          <p className="text-smoke">{order.customer_phone}</p>
        )}
        <p className="mt-1 text-xs text-smoke">
          {formatFulfillment(order.fulfillment, order.delivery_address)}
        </p>
        <p className="text-xs text-smoke">
          {formatTiming(order.timing, order.scheduled_time)}
        </p>
        {order.notes && (
          <p className="mt-1 text-xs text-cream">
            <span className="text-smoke">Nota:</span> {order.notes}
          </p>
        )}
      </div>

      <ul className="border-t border-white/10 pt-2 text-sm">
        {order.order_lines?.map((line) => (
          <li key={line.id} className="flex justify-between gap-2 py-1">
            <span>
              {line.quantity > 1 && `${line.quantity}× `}
              {line.item_name}
              {line.modifier_labels?.length > 0 && (
                <span className="block text-xs text-smoke">
                  {line.modifier_labels.join(' · ')}
                </span>
              )}
            </span>
            <span className="shrink-0 text-gold">{formatCOP(line.line_total)}</span>
          </li>
        ))}
      </ul>

      <div className="flex justify-between border-t border-white/10 pt-2 text-sm font-bold">
        <span>Total</span>
        <span className="text-gold">{formatCOP(order.total)}</span>
      </div>

      {ownerWhatsApp && (
        <button
          type="button"
          className="w-full rounded-xl border border-white/15 py-2 text-xs text-cream hover:border-flame/40"
          onClick={() =>
            openWhatsAppToOwner(ownerWhatsApp, formatOrderWhatsAppText(order))
          }
        >
          📲 Enviar resumen por WhatsApp
        </button>
      )}

      {actions.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {actions.map((action) => (
            <button
              key={action.next}
              type="button"
              disabled={busy}
              onClick={() => onStatusChange(order.id, action.next)}
              className={
                action.variant === 'danger'
                  ? 'rounded-xl border border-ember/50 px-3 py-2 text-xs text-ember'
                  : 'btn-fire flex-1 py-2 text-sm'
              }
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
    </article>
  );
}
