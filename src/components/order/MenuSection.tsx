import { formatCOP } from "../../lib/format";
import type { MenuItem } from "../../types/menu";
import type { ShopStatus } from "../../types/shop";
import QuantityStepper from "./QuantityStepper";

interface MenuSectionProps {
  tab: "platos" | "bebidas";
  onTabChange: (tab: "platos" | "bebidas") => void;
  platos: MenuItem[];
  bebidas: MenuItem[];
  drinkQuantities: Record<string, number>;
  onDrinkQuantityChange: (id: string, qty: number) => void;
  onOpenCustomize: (item: MenuItem) => void;
  onAddDrink: (item: MenuItem) => void;
  shop: ShopStatus | null;
  step: string;
  onGoToCart: () => void;
  cartItemCount: number;
  total: number;
}

export default function MenuSection({
  tab,
  onTabChange,
  platos,
  bebidas,
  drinkQuantities,
  onDrinkQuantityChange,
  onOpenCustomize,
  onAddDrink,
  shop,
  step,
  onGoToCart,
  cartItemCount,
  total,
}: MenuSectionProps) {
  const items = tab === "platos" ? platos : bebidas;

  return (
    <div className={`md:col-span-7 lg:col-span-8 space-y-6 ${step === 'menu' ? 'block' : 'hidden md:block'}`}>
      <div className="mb-4 flex gap-2">
        {(["platos", "bebidas"] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => onTabChange(t)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize transition cursor-pointer ${
              tab === t
                ? "btn-fire"
                : "border border-white/10 bg-ash text-cream hover:bg-white/5"
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <ul className="flex flex-col gap-4">
        {items.map((item) => (
          <li
            key={item.id}
            className="card-ash p-4 md:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-flame/5 hover:border-flame/30 group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h2 className="font-display text-xl md:text-2xl text-cream group-hover:text-gold transition">
                    {item.name}
                  </h2>
                  {item.category === "plato" && (
                    <span className="text-[10px] uppercase font-bold tracking-widest bg-flame/20 text-flame border border-flame/30 rounded px-1.5 py-0.5">
                      Brutal
                    </span>
                  )}
                </div>
                <p className="font-semibold text-gold mt-1 text-base md:text-lg">
                  {formatCOP(item.price)}
                </p>
                {item.tagline && (
                  <p className="mt-1 text-sm text-smoke italic">{item.tagline}</p>
                )}
                {item.description && (
                  <p className="mt-2 text-xs md:text-sm text-smoke leading-relaxed">
                    {item.description}
                  </p>
                )}
              </div>
              {tab === "bebidas" && (
                <QuantityStepper
                  size="sm"
                  min={1}
                  value={drinkQuantities[item.id] ?? 1}
                  onChange={(v) => onDrinkQuantityChange(item.id, v)}
                />
              )}
            </div>
            {tab === "platos" ? (
              <button
                type="button"
                disabled={shop !== null && !shop.acceptingOrders}
                onClick={() => onOpenCustomize(item)}
                className="btn-fire mt-4 w-full disabled:opacity-50 cursor-pointer"
              >
                Elegir opciones
              </button>
            ) : (
              <button
                type="button"
                disabled={shop !== null && !shop.acceptingOrders}
                onClick={() => onAddDrink(item)}
                className="btn-fire mt-4 w-full disabled:opacity-50 cursor-pointer"
              >
                Agregar — {formatCOP(item.price * (drinkQuantities[item.id] ?? 1))}
              </button>
            )}
          </li>
        ))}
      </ul>
      {cartItemCount > 0 && (
        <button
          type="button"
          className="btn-fire mt-6 w-full md:hidden cursor-pointer"
          onClick={onGoToCart}
        >
          Ver pedido ({cartItemCount}) — {formatCOP(total)}
        </button>
      )}
    </div>
  );
}
