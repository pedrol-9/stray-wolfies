import type { ShopStatus } from "../../types/shop";

interface ShopClosedBannerProps {
  shop: ShopStatus;
}

export default function ShopClosedBanner({ shop }: ShopClosedBannerProps) {
  if (shop.acceptingOrders) return null;

  return (
    <div className="mb-6 rounded-xl border border-ember/50 bg-ember/10 px-4 py-3 text-center text-sm animate-pulse">
      <p className="font-semibold text-cream">{shop.message}</p>
      <a
        href="/admin"
        className="mt-1 inline-block text-xs text-gold underline hover:text-amber-400"
      >
        ¿Eres del equipo? Abrir tienda
      </a>
    </div>
  );
}
