import { useEffect, useMemo, useState } from "react";
import { getAdicionalesFor, menu } from "../../data/menu";
import { DELIVERY_FEE_COP, SCHEDULE_LABEL } from "../../lib/constants";
import { formatCOP } from "../../lib/format";
import {
  adjustMeatSplitToTotal,
  buildCartLinesForItem,
  defaultMeatSplit,
  itemNeedsMeatStyle,
  previewItemTotal,
  validateMeatSplit,
  type MeatStyleSplit,
} from "../../lib/meat-style";
import { cartSubtotal, newCartLine } from "../../lib/order";
import type { MenuItem } from "../../types/menu";
import type { CartLine, CustomerInfo } from "../../types/order";
import type { ShopStatus } from "../../types/shop";

import CartSidebar from "./CartSidebar";
import CheckoutForm from "./CheckoutForm";
import CustomizeModal from "./CustomizeModal";
import MenuSection from "./MenuSection";
import OrderHeader from "./OrderHeader";
import OrderSuccessScreen from "./OrderSuccessScreen";
import ShopClosedBanner from "./ShopClosedBanner";

type Step = "menu" | "customize" | "cart" | "checkout" | "done";

const emptyCustomer: CustomerInfo = {
  name: "",
  phone: "",
  notes: "",
  fulfillment: "pickup",
  address: "",
  pickup: "asap",
};

export default function OrderApp() {
  const ownerWhatsApp = import.meta.env.PUBLIC_OWNER_WHATSAPP || "573124915908";
  const instagramUrl = import.meta.env.PUBLIC_INSTAGRAM_URL || "https://www.instagram.com/callejeros_charala/";

  const [step, setStep] = useState<Step>("menu");
  const [tab, setTab] = useState<"platos" | "bebidas">("platos");
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [mainMeatSplit, setMainMeatSplit] = useState<MeatStyleSplit>({
    picante: 1,
    tradicional: 0,
  });
  const [addonMeatSplits, setAddonMeatSplits] = useState<Record<string, MeatStyleSplit>>({});
  const [expandedAddons, setExpandedAddons] = useState<Record<string, boolean>>({});
  const [quantity, setQuantity] = useState(1);
  const [drinkQuantities, setDrinkQuantities] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>(emptyCustomer);
  const [orderCode, setOrderCode] = useState("");
  const [shop, setShop] = useState<ShopStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const subtotal = useMemo(() => cartSubtotal(cart), [cart]);
  const deliveryFee = customer.fulfillment === "delivery" ? DELIVERY_FEE_COP : 0;
  const total = subtotal + deliveryFee;

  const cartItemCount = useMemo(
    () => cart.reduce((sum, line) => sum + line.quantity, 0),
    [cart],
  );

  const customizePreviewTotal = useMemo(() => {
    if (!editing) return 0;
    let sum = previewItemTotal(editing, quantity, mainMeatSplit);
    for (const addon of getAdicionalesFor(editing.id)) {
      const q = addonQuantities[addon.id] ?? 0;
      if (q > 0) {
        sum += previewItemTotal(
          addon,
          q,
          addonMeatSplits[addon.id] ?? defaultMeatSplit(0),
        );
      }
    }
    return sum;
  }, [editing, quantity, mainMeatSplit, addonQuantities, addonMeatSplits]);

  useEffect(() => {
    fetch("/api/shop-status")
      .then((r) => r.json())
      .then((data) =>
        setShop({
          acceptingOrders: Boolean(data.acceptingOrders),
          isOpen: Boolean(data.isOpen),
          message: data.message ?? "",
          scheduleLabel: data.scheduleLabel ?? SCHEDULE_LABEL,
        }),
      )
      .catch(() =>
        setShop({
          acceptingOrders: false,
          isOpen: false,
          message: "No pudimos verificar si la tienda está abierta.",
          scheduleLabel: SCHEDULE_LABEL,
        }),
      );
  }, []);

  function initAddonState(platoId: string) {
    const quantities: Record<string, number> = {};
    const splits: Record<string, MeatStyleSplit> = {};
    for (const addon of getAdicionalesFor(platoId)) {
      quantities[addon.id] = 0;
      if (itemNeedsMeatStyle(addon)) {
        splits[addon.id] = defaultMeatSplit(0);
      }
    }
    return { quantities, splits };
  }

  function setMainQuantity(q: number) {
    setQuantity(q);
    setMainMeatSplit((prev) => adjustMeatSplitToTotal(prev, q));
  }

  function setAddonQuantity(addon: MenuItem, q: number) {
    setAddonQuantities((prev) => ({ ...prev, [addon.id]: q }));
    if (!itemNeedsMeatStyle(addon)) return;
    setAddonMeatSplits((prev) => ({
      ...prev,
      [addon.id]: adjustMeatSplitToTotal(
        q > 0 && meatSplitSumSafe(prev[addon.id]) === 0
          ? defaultMeatSplit(q)
          : (prev[addon.id] ?? defaultMeatSplit(0)),
        q,
      ),
    }));
  }

  function meatSplitSumSafe(split?: MeatStyleSplit) {
    if (!split) return 0;
    return split.picante + split.tradicional;
  }

  function openCustomize(item: MenuItem) {
    const { quantities, splits } = initAddonState(item.id);
    setEditing(item);
    setAddonQuantities(quantities);
    setAddonMeatSplits(splits);
    setQuantity(1);
    setMainMeatSplit(defaultMeatSplit(1));
    setExpandedAddons({});
    setStep("customize");
  }

  function addDrinkToCart(item: MenuItem) {
    const qty = drinkQuantities[item.id] ?? 1;
    if (qty < 1) return;
    setCart((c) => [...c, newCartLine(item, qty, {})]);
    setDrinkQuantities((prev) => ({ ...prev, [item.id]: 1 }));
  }

  function confirmCustomize() {
    if (!editing) return;

    const errors: string[] = [];
    if (itemNeedsMeatStyle(editing)) {
      const err = validateMeatSplit(quantity, mainMeatSplit);
      if (err) errors.push(err);
    }

    const lines: CartLine[] = buildCartLinesForItem(
      editing,
      quantity,
      itemNeedsMeatStyle(editing) ? mainMeatSplit : null,
    );

    if (lines.length === 0) {
      errors.push("Agrega al menos un plato.");
    }

    for (const addon of getAdicionalesFor(editing.id)) {
      const addonQty = addonQuantities[addon.id] ?? 0;
      if (addonQty <= 0) continue;
      if (itemNeedsMeatStyle(addon)) {
        const err = validateMeatSplit(
          addonQty,
          addonMeatSplits[addon.id] ?? defaultMeatSplit(0),
        );
        if (err) errors.push(`${addon.name}: ${err}`);
      }
      lines.push(
        ...buildCartLinesForItem(
          addon,
          addonQty,
          itemNeedsMeatStyle(addon) ? addonMeatSplits[addon.id] : null,
        ),
      );
    }

    if (errors.length) {
      alert(errors.join("\n"));
      return;
    }

    setCart((c) => [...c, ...lines]);
    setEditing(null);
    setStep("cart");
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError("");
    if (!shop?.acceptingOrders) {
      setSubmitError("La tienda está cerrada. Intenta más tarde.");
      return;
    }
    if (!customer.name.trim() || !customer.phone.trim()) {
      setSubmitError("Nombre y teléfono son obligatorios.");
      return;
    }
    if (customer.fulfillment === "delivery" && !customer.address.trim()) {
      setSubmitError("Escribe la dirección para el domicilio.");
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ lines: cart, customer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "No se pudo enviar el pedido");
      setOrderCode(data.code);
      setStep("done");
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : "Error de red");
    } finally {
      setSubmitting(false);
    }
  }

  const platos = menu.find((s) => s.id === "platos")!.items;
  const bebidas = menu.find((s) => s.id === "bebidas")!.items;

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col px-4 pb-8 pt-6 md:px-8">
      <OrderHeader
        shop={shop}
        ownerWhatsApp={ownerWhatsApp}
        instagramUrl={instagramUrl}
      />

      {shop && <ShopClosedBanner shop={shop} />}

      {step === "done" ? (
        <OrderSuccessScreen
          orderCode={orderCode}
          onReset={() => {
            setCart([]);
            setCustomer(emptyCustomer);
            setStep("menu");
          }}
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Menu section */}
          <MenuSection
            tab={tab}
            onTabChange={setTab}
            platos={platos}
            bebidas={bebidas}
            drinkQuantities={drinkQuantities}
            onDrinkQuantityChange={(id, qty) =>
              setDrinkQuantities((prev) => ({ ...prev, [id]: qty }))
            }
            onOpenCustomize={openCustomize}
            onAddDrink={addDrinkToCart}
            shop={shop}
            step={step}
            onGoToCart={() => setStep("cart")}
            cartItemCount={cartItemCount}
            total={total}
          />

          {/* Customize Modal */}
          {step === "customize" && editing && (
            <CustomizeModal
              editing={editing}
              quantity={quantity}
              mainMeatSplit={mainMeatSplit}
              addonQuantities={addonQuantities}
              addonMeatSplits={addonMeatSplits}
              expandedAddons={expandedAddons}
              customizePreviewTotal={customizePreviewTotal}
              onClose={() => setStep("menu")}
              onMainQuantityChange={setMainQuantity}
              onMainMeatSplitChange={(split) => {
                setMainMeatSplit(split);
                setQuantity(meatSplitSumSafe(split));
              }}
              onAddonQuantityChange={setAddonQuantity}
              onAddonMeatSplitChange={(addonId, split) =>
                setAddonMeatSplits((prev) => ({ ...prev, [addonId]: split }))
              }
              onToggleExpandAddon={(addonId) =>
                setExpandedAddons((prev) => ({
                  ...prev,
                  [addonId]: !prev[addonId],
                }))
              }
              onConfirm={confirmCustomize}
            />
          )}

          {/* Cart & Checkout column */}
          <div
            className={`md:col-span-5 lg:col-span-4 md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto scrollbar-thin space-y-6 ${
              step === "cart" || step === "checkout" ? "block" : "hidden md:block"
            }`}
          >
            {cart.length === 0 ? (
              <div className="card-ash p-6 text-center flex flex-col items-center justify-center py-12 border-dashed border-white/10 bg-ash/40">
                <div className="size-14 rounded-full bg-white/5 flex items-center justify-center text-xl mb-3 text-smoke">
                  🛒
                </div>
                <h3 className="font-display text-lg text-cream mb-1">
                  Tu pedido está vacío
                </h3>
                <p className="text-xs text-smoke max-w-[200px] mx-auto leading-relaxed">
                  Agrega platos deliciosos del menú para comenzar tu orden.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                <CartSidebar
                  cart={cart}
                  cartItemCount={cartItemCount}
                  subtotal={subtotal}
                  total={total}
                  customer={customer}
                  step={step}
                  onGoToMenu={() => setStep("menu")}
                  onGoToCheckout={() => setStep("checkout")}
                  onRemoveLine={(lineId) =>
                    setCart((c) => c.filter((l) => l.id !== lineId))
                  }
                />

                <CheckoutForm
                  customer={customer}
                  setCustomer={setCustomer}
                  submitting={submitting}
                  submitError={submitError}
                  shop={shop}
                  total={total}
                  step={step}
                  onGoToCart={() => setStep("cart")}
                  onSubmitOrder={submitOrder}
                />
              </div>
            )}
          </div>
        </div>
      )}

      <footer className="mt-12 border-t border-white/5 pt-6 text-center flex flex-col items-center gap-4">
        <div className="flex items-center gap-4">
          <a
            href={`https://wa.me/${ownerWhatsApp}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-smoke hover:text-emerald-400 transition-colors flex items-center gap-1.5"
          >
            WhatsApp
          </a>
          <span className="text-white/10">•</span>
          <a
            href={instagramUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-smoke hover:text-pink-400 transition-colors flex items-center gap-1.5"
          >
            Instagram
          </a>
        </div>
        <a
          href="/admin"
          className="text-[10px] text-smoke/50 hover:text-gold transition underline"
        >
          ¿Eres del equipo de trabajo? Entrar al panel de control
        </a>
      </footer>
    </div>
  );
}
