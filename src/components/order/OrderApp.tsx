import { useEffect, useMemo, useState } from "react";
import { menu, getAdicionalesFor } from "../../data/menu";
import { DELIVERY_FEE_COP, SCHEDULE_LABEL } from "../../lib/constants";
import { formatCOP } from "../../lib/format";
import { cartSubtotal, newCartLine } from "../../lib/order";
import {
  adjustMeatSplitToTotal,
  buildCartLinesForItem,
  defaultMeatSplit,
  itemNeedsMeatStyle,
  previewItemTotal,
  validateMeatSplit,
  type MeatStyleSplit,
} from "../../lib/meat-style";
import type { MenuItem } from "../../types/menu";
import type { CartLine, CustomerInfo } from "../../types/order";
import MeatStyleSplitControl from "./MeatStyleSplitControl";
import QuantityStepper from "./QuantityStepper";

type Step = "menu" | "customize" | "cart" | "checkout" | "done";

type ShopStatus = {
  acceptingOrders: boolean;
  isOpen: boolean;
  message: string;
  scheduleLabel: string;
};

const emptyCustomer: CustomerInfo = {
  name: "",
  phone: "",
  notes: "",
  fulfillment: "pickup",
  address: "",
  pickup: "asap",
};

export default function OrderApp() {
  const [step, setStep] = useState<Step>("menu");
  const [tab, setTab] = useState<"platos" | "bebidas">("platos");
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [addonQuantities, setAddonQuantities] = useState<
    Record<string, number>
  >({});
  const [mainMeatSplit, setMainMeatSplit] = useState<MeatStyleSplit>({
    picante: 1,
    tradicional: 0,
  });
  const [addonMeatSplits, setAddonMeatSplits] = useState<
    Record<string, MeatStyleSplit>
  >({});
  const [quantity, setQuantity] = useState(1);
  const [drinkQuantities, setDrinkQuantities] = useState<
    Record<string, number>
  >({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>(emptyCustomer);
  const [orderCode, setOrderCode] = useState("");
  const [shop, setShop] = useState<ShopStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");

  const subtotal = useMemo(() => cartSubtotal(cart), [cart]);
  const deliveryFee =
    customer.fulfillment === "delivery" ? DELIVERY_FEE_COP : 0;
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
      <header className="mb-8 text-center">
        <h1 className="font-display text-4xl md:text-6xl text-fire transition duration-300">Callejeros</h1>
        <p className="mt-2 text-sm md:text-base text-smoke">Sabor brutal directo al fuego</p>
        <p className="mt-2 text-xs md:text-sm text-smoke">
          Horario habitual: {shop?.scheduleLabel ?? SCHEDULE_LABEL}
        </p>
      </header>

      {shop && !shop.acceptingOrders && (
        <div className="mb-6 rounded-xl border border-ember/50 bg-ember/10 px-4 py-3 text-center text-sm animate-pulse">
          <p className="font-semibold text-cream">{shop.message}</p>
          <a
            href="/admin"
            className="mt-1 inline-block text-xs text-gold underline hover:text-amber-400"
          >
            ¿Eres del equipo? Abrir tienda
          </a>
        </div>
      )}

      {step === "done" ? (
        <div className="mx-auto w-full max-w-lg animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="card-ash flex flex-col items-center gap-6 p-8 text-center shadow-xl shadow-flame/5 border-flame/20">
            <div className="size-16 rounded-full bg-linear-to-r from-gold to-flame flex items-center justify-center text-4xl shadow-inner animate-bounce">
              🐺
            </div>
            <h2 className="font-display text-3xl text-fire">¡Pedido recibido!</h2>
            <div className="w-full rounded-xl bg-void/50 border border-white/5 py-4 px-6">
              <p className="text-xs text-smoke uppercase tracking-wider">Tu código de pedido</p>
              <p className="text-3xl font-mono font-bold text-gold mt-1">{orderCode}</p>
            </div>
            <p className="text-sm leading-relaxed text-smoke">
              Guarda tu código. El equipo se comunicará contigo al WhatsApp que dejaste para confirmar el tiempo estimado de entrega o recogida.
            </p>
            <button
              type="button"
              className="btn-fire w-full cursor-pointer"
              onClick={() => {
                setCart([]);
                setCustomer(emptyCustomer);
                setStep("menu");
              }}
            >
              Hacer otro pedido
            </button>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-start">
          {/* Columna Izquierda: Menú */}
          <div className={`md:col-span-7 lg:col-span-8 space-y-6 ${step === 'menu' ? 'block' : 'hidden md:block'}`}>
            <div className="mb-4 flex gap-2">
              {(["platos", "bebidas"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTab(t)}
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
              {(tab === "platos" ? platos : bebidas).map((item) => (
                <li key={item.id} className="card-ash p-4 md:p-5 transition-all duration-300 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-flame/5 hover:border-flame/30 group">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h2 className="font-display text-xl md:text-2xl text-cream group-hover:text-gold transition">
                          {item.name}
                        </h2>
                        {item.category === 'plato' && (
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
                        onChange={(v) =>
                          setDrinkQuantities((prev) => ({
                            ...prev,
                            [item.id]: v,
                          }))
                        }
                      />
                    )}
                  </div>
                  {tab === "platos" ? (
                    <button
                      type="button"
                      disabled={shop !== null && !shop.acceptingOrders}
                      onClick={() => openCustomize(item)}
                      className="btn-fire mt-4 w-full disabled:opacity-50 cursor-pointer"
                    >
                      Elegir opciones
                    </button>
                  ) : (
                    <button
                      type="button"
                      disabled={shop !== null && !shop.acceptingOrders}
                      onClick={() => addDrinkToCart(item)}
                      className="btn-fire mt-4 w-full disabled:opacity-50 cursor-pointer"
                    >
                      Agregar —{" "}
                      {formatCOP(item.price * (drinkQuantities[item.id] ?? 1))}
                    </button>
                  )}
                </li>
              ))}
            </ul>
            {cart.length > 0 && (
              <button
                type="button"
                className="btn-fire mt-6 w-full md:hidden cursor-pointer"
                onClick={() => setStep("cart")}
              >
                Ver pedido ({cartItemCount}) — {formatCOP(total)}
              </button>
            )}
          </div>

          {/* Modal / Sección de Personalización (Customize) */}
          {step === "customize" && editing && (
            <div 
              className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-void/80 backdrop-blur-md animate-in fade-in duration-200 md:bg-void/85"
              onClick={() => setStep("menu")}
            >
              <div 
                className="w-full max-w-lg card-ash p-5 md:p-6 shadow-2xl shadow-flame/15 max-h-[90vh] overflow-y-auto scrollbar-thin animate-in zoom-in-95 duration-200"
                onClick={(e) => e.stopPropagation()}
              >
                <div className="flex items-center justify-between border-b border-white/5 pb-3 mb-4">
                  <h3 className="font-display text-xl text-gold">Personalizar</h3>
                  <button
                    type="button"
                    className="text-smoke hover:text-cream text-lg font-bold size-8 flex items-center justify-center rounded-full hover:bg-white/5 transition cursor-pointer"
                    onClick={() => setStep("menu")}
                  >
                    ✕
                  </button>
                </div>
                
                <div className="flex items-center justify-between gap-3 bg-void/30 p-3.5 rounded-xl border border-white/5 mb-4">
                  <div className="min-w-0">
                    <h2 className="font-display text-lg md:text-xl text-cream">
                      {editing.name}
                    </h2>
                    <p className="font-semibold text-gold text-sm">
                      {formatCOP(editing.price)} c/u
                    </p>
                  </div>
                  <QuantityStepper
                    min={1}
                    value={quantity}
                    onChange={setMainQuantity}
                  />
                </div>

                <div className="space-y-4">
                  {itemNeedsMeatStyle(editing) && (
                    <fieldset className="rounded-xl border border-white/5 bg-void/20 p-4">
                      <legend className="px-2 text-xs font-semibold text-cream uppercase tracking-wider">
                        Estilo de la carne / chorizo
                        <span className="text-ember"> *</span>
                      </legend>
                      <p className="mb-3 mt-1 text-xs text-smoke">
                        Reparte las {quantity} unidades entre picante y tradicional.
                      </p>
                      <MeatStyleSplitControl
                        total={quantity}
                        split={mainMeatSplit}
                        onChange={setMainMeatSplit}
                      />
                    </fieldset>
                  )}

                  {editing.category === "plato" && (
                    <fieldset className="rounded-xl border border-white/5 bg-void/20 p-4">
                      <legend className="px-2 text-xs font-semibold text-cream uppercase tracking-wider">
                        Adicionales (Opcional)
                      </legend>
                      <div className="flex flex-col gap-2.5 mt-2">
                        {getAdicionalesFor(editing.id).map((addon) => {
                          const qty = addonQuantities[addon.id] ?? 0;
                          const active = qty > 0;
                          const addonSplit =
                            addonMeatSplits[addon.id] ?? defaultMeatSplit(0);
                          return (
                            <div
                              key={addon.id}
                              className={`rounded-lg border px-3 py-2.5 transition-all duration-200 ${
                                active 
                                  ? "border-flame bg-flame/10 shadow-lg shadow-flame/5" 
                                  : "border-white/5 bg-ash/50 hover:border-white/15"
                              }`}
                            >
                              <div className="flex items-center justify-between gap-2">
                                <div className="min-w-0 flex-1">
                                  <p className="text-sm font-semibold text-cream flex items-center gap-1.5">
                                    {addon.name}
                                    {addon.id === "enchula-choriarepa" && (
                                      <span className="text-gold animate-pulse">🔥</span>
                                    )}
                                  </p>
                                  <p className="text-xs font-semibold text-gold mt-0.5">
                                    +{formatCOP(addon.price)} c/u
                                    {qty > 0 && (
                                      <span className="ml-2 text-cream font-normal">
                                        = {" "}
                                        {formatCOP(
                                          previewItemTotal(addon, qty, addonSplit),
                                        )}
                                      </span>
                                    )}
                                  </p>
                                </div>
                                <QuantityStepper
                                  size="sm"
                                  min={0}
                                  value={qty}
                                  onChange={(v) => setAddonQuantity(addon, v)}
                                />
                              </div>
                              {active && itemNeedsMeatStyle(addon) && (
                                <div className="mt-2.5 pt-2.5 border-t border-white/5">
                                  <MeatStyleSplitControl
                                    total={qty}
                                    split={addonSplit}
                                    onChange={(split) =>
                                      setAddonMeatSplits((prev) => ({
                                        ...prev,
                                        [addon.id]: split,
                                      }))
                                    }
                                  />
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </fieldset>
                  )}
                </div>

                <div className="mt-6 border-t border-white/5 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm text-smoke">Subtotal de este plato:</span>
                    <span className="font-bold text-gold text-lg">
                      {formatCOP(customizePreviewTotal)}
                    </span>
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="button"
                      className="flex-1 rounded-xl border border-white/10 bg-ash/50 py-3 text-sm font-semibold text-cream transition hover:bg-white/5 cursor-pointer"
                      onClick={() => setStep("menu")}
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      className="flex-2 btn-fire py-3 text-sm font-semibold cursor-pointer"
                      onClick={confirmCustomize}
                    >
                      Agregar — {formatCOP(customizePreviewTotal)}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Columna Derecha: Carrito y Checkout */}
          <div className={`md:col-span-5 lg:col-span-4 md:sticky md:top-6 md:max-h-[calc(100vh-3rem)] md:overflow-y-auto scrollbar-thin space-y-6 ${
            step === 'cart' || step === 'checkout' ? 'block' : 'hidden md:block'
          }`}>
            {cart.length === 0 ? (
              <div className="card-ash p-6 text-center flex flex-col items-center justify-center py-12 border-dashed border-white/10 bg-ash/40">
                <div className="size-14 rounded-full bg-white/5 flex items-center justify-center text-xl mb-3 text-smoke">
                  🛒
                </div>
                <h3 className="font-display text-lg text-cream mb-1">Tu pedido está vacío</h3>
                <p className="text-xs text-smoke max-w-[200px] mx-auto leading-relaxed">
                  Agrega platos deliciosos del menú para comenzar tu orden.
                </p>
              </div>
            ) : (
              <div className="space-y-6">
                {/* Sección 1: El Carrito */}
                <div className={`${step === 'checkout' ? 'hidden md:block' : 'block'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="font-display text-lg text-cream flex items-center gap-2">
                      <span>Tu Pedido</span>
                      <span className="text-xs font-sans font-bold bg-flame/20 text-flame px-2 py-0.5 rounded-full">
                        {cartItemCount} {cartItemCount === 1 ? 'item' : 'items'}
                      </span>
                    </h3>
                    <button
                      type="button"
                      className="text-xs text-smoke hover:text-cream md:hidden cursor-pointer"
                      onClick={() => setStep("menu")}
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
                            onClick={() =>
                              setCart((c) => c.filter((l) => l.id !== line.id))
                            }
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
                      onClick={() => setStep("checkout")}
                    >
                      Datos de entrega
                    </button>
                  </div>
                </div>

                {/* Sección 2: El Checkout */}
                <div className={`${step === 'cart' ? 'hidden md:block' : 'block'} md:border-t md:border-white/5 md:pt-6`}>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-display text-lg text-cream">Datos de Entrega</h3>
                    <button
                      type="button"
                      className="text-xs text-smoke hover:text-cream md:hidden cursor-pointer"
                      onClick={() => setStep("cart")}
                    >
                      ← Volver al pedido
                    </button>
                  </div>

                  <form className="flex flex-col gap-4" onSubmit={submitOrder}>
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
                      <p className="text-center text-sm font-semibold text-ember animate-shake">{submitError}</p>
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
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
