import { DELIVERY_FEE_COP } from "../../lib/constants";
import { formatCOP } from "../../lib/format";
import type { CustomerInfo } from "../../types/order";
import type { ShopStatus } from "../../types/shop";

interface CheckoutFormProps {
  customer: CustomerInfo;
  setCustomer: React.Dispatch<React.SetStateAction<CustomerInfo>>;
  submitting: boolean;
  submitError: string;
  shop: ShopStatus | null;
  total: number;
  step: string;
  onGoToCart: () => void;
  onSubmitOrder: (e: React.FormEvent) => void;
}

export default function CheckoutForm({
  customer,
  setCustomer,
  submitting,
  submitError,
  shop,
  total,
  step,
  onGoToCart,
  onSubmitOrder,
}: CheckoutFormProps) {
  return (
    <div
      className={`${step === "cart" ? "hidden md:block" : "block"} md:border-t md:border-white/5 md:pt-6`}
    >
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg text-cream">Datos de Entrega</h3>
        <button
          type="button"
          className="text-xs text-smoke hover:text-cream md:hidden cursor-pointer"
          onClick={onGoToCart}
        >
          ← Volver al pedido
        </button>
      </div>

      <form className="flex flex-col gap-4" onSubmit={onSubmitOrder}>
        <label className="flex flex-col gap-1.5 text-xs font-semibold text-smoke uppercase tracking-wider">
          Nombre Completo *
          <input
            required
            value={customer.name}
            onChange={(e) =>
              setCustomer((c) => ({ ...c, name: e.target.value }))
            }
            className="w-full rounded-xl border border-white/10 bg-ash/70 px-3.5 py-3 text-sm text-cream placeholder-smoke/60 outline-none transition focus:border-flame focus:ring-2 focus:ring-flame/15"
            placeholder="Tu nombre"
          />
        </label>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-smoke uppercase tracking-wider">
          WhatsApp / Celular *
          <input
            required
            type="tel"
            value={customer.phone}
            onChange={(e) =>
              setCustomer((c) => ({ ...c, phone: e.target.value }))
            }
            className="w-full rounded-xl border border-white/10 bg-ash/70 px-3.5 py-3 text-sm text-cream placeholder-smoke/60 outline-none transition focus:border-flame focus:ring-2 focus:ring-flame/15"
            placeholder="300 123 4567"
          />
        </label>

        <fieldset className="rounded-xl border border-white/5 bg-void/30 p-3.5">
          <legend className="px-2 text-xs font-semibold text-smoke uppercase tracking-wider">
            ¿Cómo lo recibes?
          </legend>
          <div className="flex flex-col gap-2 mt-2">
            <label className="flex items-center gap-2.5 text-sm text-cream cursor-pointer">
              <input
                type="radio"
                name="fulfillment"
                checked={customer.fulfillment === "pickup"}
                onChange={() =>
                  setCustomer((c) => ({
                    ...c,
                    fulfillment: "pickup",
                    address: "",
                  }))
                }
                className="accent-flame size-4 cursor-pointer"
              />
              <span>Recoger en local</span>
            </label>
            <label className="flex items-center gap-2.5 text-sm text-cream cursor-pointer">
              <input
                type="radio"
                name="fulfillment"
                checked={customer.fulfillment === "delivery"}
                onChange={() =>
                  setCustomer((c) => ({ ...c, fulfillment: "delivery" }))
                }
                className="accent-flame size-4 cursor-pointer"
              />
              <span>Domicilio (+{formatCOP(DELIVERY_FEE_COP)})</span>
            </label>
          </div>
        </fieldset>

        {customer.fulfillment === "delivery" && (
          <label className="flex flex-col gap-1.5 text-xs font-semibold text-smoke uppercase tracking-wider animate-in fade-in slide-in-from-top-2 duration-200">
            Dirección de entrega *
            <textarea
              required
              value={customer.address}
              onChange={(e) =>
                setCustomer((c) => ({ ...c, address: e.target.value }))
              }
              rows={2}
              className="w-full rounded-xl border border-white/10 bg-ash/70 px-3.5 py-2.5 text-sm text-cream placeholder-smoke/60 outline-none transition focus:border-flame focus:ring-2 focus:ring-flame/15 resize-none"
              placeholder="Barrio, calle, casa/apto, referencia…"
            />
          </label>
        )}

        <fieldset className="rounded-xl border border-white/5 bg-void/30 p-3.5">
          <legend className="px-2 text-xs font-semibold text-smoke uppercase tracking-wider">
            {customer.fulfillment === "delivery"
              ? "¿Cuándo lo enviamos?"
              : "¿Cuándo recoges?"}
          </legend>
          <div className="flex flex-col gap-2 mt-2">
            <label className="flex items-center gap-2.5 text-sm text-cream cursor-pointer">
              <input
                type="radio"
                name="pickup"
                checked={customer.pickup === "asap"}
                onChange={() => setCustomer((c) => ({ ...c, pickup: "asap" }))}
                className="accent-flame size-4 cursor-pointer"
              />
              <span>Lo antes posible</span>
            </label>
            <label className="flex items-center gap-2.5 text-sm text-cream cursor-pointer">
              <input
                type="radio"
                name="pickup"
                checked={customer.pickup === "scheduled"}
                onChange={() =>
                  setCustomer((c) => ({ ...c, pickup: "scheduled" }))
                }
                className="accent-flame size-4 cursor-pointer"
              />
              <span>Hora estimada</span>
            </label>
            {customer.pickup === "scheduled" && (
              <input
                type="time"
                value={customer.pickupTime ?? ""}
                onChange={(e) =>
                  setCustomer((c) => ({ ...c, pickupTime: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/10 bg-void px-3 py-2 text-sm text-cream outline-none focus:border-flame animate-in slide-in-from-top-2 duration-200"
              />
            )}
          </div>
        </fieldset>

        <label className="flex flex-col gap-1.5 text-xs font-semibold text-smoke uppercase tracking-wider">
          Notas (opcional)
          <textarea
            value={customer.notes}
            onChange={(e) =>
              setCustomer((c) => ({ ...c, notes: e.target.value }))
            }
            rows={2}
            className="w-full rounded-xl border border-white/10 bg-ash/70 px-3.5 py-2.5 text-sm text-cream placeholder-smoke/60 outline-none transition focus:border-flame focus:ring-2 focus:ring-flame/15 resize-none"
            placeholder="Sin cebolla, salsas aparte, etc…"
          />
        </label>

        <div className="bg-void/40 border border-white/5 rounded-xl p-3 text-center text-xs text-smoke">
          💵 Pago en efectivo o transferencia al recibir.
        </div>

        {submitError && (
          <p className="text-center text-sm font-semibold text-ember animate-shake">
            {submitError}
          </p>
        )}

        <button
          type="submit"
          className="btn-fire w-full disabled:opacity-50 cursor-pointer text-sm py-3"
          disabled={submitting || !shop?.acceptingOrders}
        >
          {submitting ? "Enviando…" : `Enviar pedido — ${formatCOP(total)}`}
        </button>
      </form>
    </div>
  );
}
