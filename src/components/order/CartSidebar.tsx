import { DELIVERY_FEE_COP } from "../../lib/constants";
import { formatCOP } from "../../lib/format";
import type { CartLine, CustomerInfo } from "../../types/order";

interface CartSidebarProps {
  cart: CartLine[];
  cartItemCount: number;
  subtotal: number;
  total: number;
  customer: CustomerInfo;
  step: string;
  onGoToMenu: () => void;
  onGoToCheckout: () => void;
  onRemoveLine: (lineId: string) => void;
}

export default function CartSidebar({
  cart,
  cartItemCount,
  subtotal,
  total,
  customer,
  step,
  onGoToMenu,
  onGoToCheckout,
  onRemoveLine,
}: CartSidebarProps) {
  return (
    <div className={`${step === "checkout" ? "hidden md:block" : "block"}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display text-lg text-cream flex items-center gap-2">
          <span>Tu Pedido</span>
          <span className="text-xs font-sans font-bold bg-flame/20 text-flame px-2 py-0.5 rounded-full">
            {cartItemCount} {cartItemCount === 1 ? "item" : "items"}
          </span>
        </h3>
        <button
          type="button"
          className="text-xs text-smoke hover:text-cream md:hidden cursor-pointer"
          onClick={onGoToMenu}
        >
          ← Seguir pidiendo
        </button>
      </div>

      <ul className="flex flex-col gap-2">
        {cart.map((line) => (
          <li
            key={line.id}
            className="card-ash flex justify-between gap-3 p-3.5 bg-ash/50 border-white/5 transition hover:border-white/10"
          >
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cream">
                {line.quantity > 1 && (
                  <span className="text-gold font-bold">{line.quantity}x </span>
                )}
                {line.name}
              </p>
              {line.modifierLabels.length > 0 && (
                <p className="text-[11px] text-smoke mt-0.5 leading-relaxed">
                  {line.modifierLabels.join(" · ")}
                </p>
              )}
            </div>
            <div className="flex flex-col items-end justify-between gap-2 shrink-0">
              <span className="text-sm font-semibold text-gold">
                {formatCOP(line.lineTotal)}
                {line.quantity > 1 && (
                  <span className="block text-[10px] font-normal text-smoke text-right">
                    c/u {formatCOP(line.lineTotal / line.quantity)}
                  </span>
                )}
              </span>
              <button
                type="button"
                className="text-xs text-ember hover:text-red-400 font-medium transition cursor-pointer"
                onClick={() => onRemoveLine(line.id)}
              >
                Quitar
              </button>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-4 pt-3 border-t border-white/5 space-y-1.5">
        <div className="flex justify-between text-xs text-smoke">
          <span>Subtotal:</span>
          <span>{formatCOP(subtotal)}</span>
        </div>
        {customer.fulfillment === "delivery" && (
          <div className="flex justify-between text-xs text-smoke">
            <span>Domicilio:</span>
            <span>+{formatCOP(DELIVERY_FEE_COP)}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold pt-1.5 border-t border-white/5">
          <span>Total estimado:</span>
          <span className="text-gold">{formatCOP(total)}</span>
        </div>
      </div>

      <div className="mt-4 md:hidden">
        <button
          type="button"
          className="btn-fire w-full cursor-pointer"
          onClick={onGoToCheckout}
        >
          Datos de entrega
        </button>
      </div>
    </div>
  );
}
