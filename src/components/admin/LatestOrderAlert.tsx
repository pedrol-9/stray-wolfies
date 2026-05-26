import {
  formatOrderWhatsAppText,
  getOwnerWhatsApp,
  openWhatsAppToOwner,
} from "../../lib/order-whatsapp";
import type { AdminOrder } from "../../types/admin-order";

interface LatestOrderAlertProps {
  latestNewOrder: AdminOrder;
  onClose: () => void;
}

export default function LatestOrderAlert({
  latestNewOrder,
  onClose,
}: LatestOrderAlertProps) {
  const ownerWhatsApp = getOwnerWhatsApp();

  return (
    <div className="rounded-xl border border-gold/50 bg-gold/10 p-4 text-sm text-left">
      <p className="font-semibold text-cream">
        🔔 Nuevo pedido {latestNewOrder.code}
      </p>
      <p className="text-smoke">{latestNewOrder.customer_name}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {ownerWhatsApp && (
          <button
            type="button"
            className="btn-fire px-3 py-1.5 text-xs"
            onClick={() =>
              openWhatsAppToOwner(
                ownerWhatsApp,
                formatOrderWhatsAppText(latestNewOrder)
              )
            }
          >
            WhatsApp
          </button>
        )}
        <button
          type="button"
          className="rounded-lg border border-white/15 px-3 py-1.5 text-xs transition hover:text-cream"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
