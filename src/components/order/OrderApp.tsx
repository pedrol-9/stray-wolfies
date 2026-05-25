import { useEffect, useMemo, useState } from 'react';
import { menu, getAdicionalesFor } from '../../data/menu';
import { DELIVERY_FEE_COP, SCHEDULE_LABEL } from '../../lib/constants';
import { formatCOP } from '../../lib/format';
import { cartSubtotal, newCartLine } from '../../lib/order';
import {
  adjustMeatSplitToTotal,
  buildCartLinesForItem,
  defaultMeatSplit,
  itemNeedsMeatStyle,
  previewItemTotal,
  validateMeatSplit,
  type MeatStyleSplit,
} from '../../lib/meat-style';
import type { MenuItem } from '../../types/menu';
import type { CartLine, CustomerInfo } from '../../types/order';
import MeatStyleSplitControl from './MeatStyleSplitControl';
import QuantityStepper from './QuantityStepper';

type Step = 'menu' | 'customize' | 'cart' | 'checkout' | 'done';

type ShopStatus = {
  acceptingOrders: boolean;
  isOpen: boolean;
  message: string;
  scheduleLabel: string;
};

const emptyCustomer: CustomerInfo = {
  name: '',
  phone: '',
  notes: '',
  fulfillment: 'pickup',
  address: '',
  pickup: 'asap',
};

export default function OrderApp() {
  const [step, setStep] = useState<Step>('menu');
  const [tab, setTab] = useState<'platos' | 'bebidas'>('platos');
  const [editing, setEditing] = useState<MenuItem | null>(null);
  const [addonQuantities, setAddonQuantities] = useState<Record<string, number>>({});
  const [mainMeatSplit, setMainMeatSplit] = useState<MeatStyleSplit>({ picante: 1, tradicional: 0 });
  const [addonMeatSplits, setAddonMeatSplits] = useState<Record<string, MeatStyleSplit>>({});
  const [quantity, setQuantity] = useState(1);
  const [drinkQuantities, setDrinkQuantities] = useState<Record<string, number>>({});
  const [cart, setCart] = useState<CartLine[]>([]);
  const [customer, setCustomer] = useState<CustomerInfo>(emptyCustomer);
  const [orderCode, setOrderCode] = useState('');
  const [shop, setShop] = useState<ShopStatus | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');

  const subtotal = useMemo(() => cartSubtotal(cart), [cart]);
  const deliveryFee =
    customer.fulfillment === 'delivery' ? DELIVERY_FEE_COP : 0;
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
        sum += previewItemTotal(addon, q, addonMeatSplits[addon.id] ?? defaultMeatSplit(0));
      }
    }
    return sum;
  }, [editing, quantity, mainMeatSplit, addonQuantities, addonMeatSplits]);

  useEffect(() => {
    fetch('/api/shop-status')
      .then((r) => r.json())
      .then((data) =>
        setShop({
          acceptingOrders: Boolean(data.acceptingOrders),
          isOpen: Boolean(data.isOpen),
          message: data.message ?? '',
          scheduleLabel: data.scheduleLabel ?? SCHEDULE_LABEL,
        }),
      )
      .catch(() =>
        setShop({
          acceptingOrders: false,
          isOpen: false,
          message: 'No pudimos verificar si la tienda está abierta.',
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
    setStep('customize');
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
      errors.push('Agrega al menos un plato.');
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
      alert(errors.join('\n'));
      return;
    }

    setCart((c) => [...c, ...lines]);
    setEditing(null);
    setStep('cart');
  }

  async function submitOrder(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError('');
    if (!shop?.acceptingOrders) {
      setSubmitError('La tienda está cerrada. Intenta más tarde.');
      return;
    }
    if (!customer.name.trim() || !customer.phone.trim()) {
      setSubmitError('Nombre y teléfono son obligatorios.');
      return;
    }
    if (customer.fulfillment === 'delivery' && !customer.address.trim()) {
      setSubmitError('Escribe la dirección para el domicilio.');
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/orders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lines: cart, customer }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'No se pudo enviar el pedido');
      setOrderCode(data.code);
      setStep('done');
    } catch (err) {
      setSubmitError(err instanceof Error ? err.message : 'Error de red');
    } finally {
      setSubmitting(false);
    }
  }

  const platos = menu.find((s) => s.id === 'platos')!.items;
  const bebidas = menu.find((s) => s.id === 'bebidas')!.items;

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col px-4 pb-8 pt-6">
      <header className="mb-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-smoke">
          Stray-Wolfies
        </p>
        <h1 className="font-display text-4xl text-fire">Callejeros</h1>
        <p className="mt-1 text-sm text-smoke">Sabor brutal directo al fuego</p>
        <p className="mt-2 text-xs text-smoke">
          Horario habitual: {shop?.scheduleLabel ?? SCHEDULE_LABEL}
        </p>
      </header>

      {shop && !shop.acceptingOrders && (
        <div className="mb-4 rounded-xl border border-ember/50 bg-ember/10 px-4 py-3 text-center text-sm">
          <p className="font-semibold text-cream">{shop.message}</p>
          <a href="/admin" className="mt-1 inline-block text-xs text-gold underline">
            ¿Eres del equipo? Abrir tienda
          </a>
        </div>
      )}

      {step === 'menu' && (
        <>
          <div className="mb-4 flex gap-2">
            {(['platos', 'bebidas'] as const).map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setTab(t)}
                className={`flex-1 rounded-xl py-2.5 text-sm font-semibold capitalize transition ${
                  tab === t
                    ? 'btn-fire'
                    : 'border border-white/10 bg-ash text-cream'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <ul className="flex flex-col gap-3">
            {(tab === 'platos' ? platos : bebidas).map((item) => (
              <li key={item.id} className="card-ash p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <h2 className="font-display text-xl text-cream">{item.name}</h2>
                    <p className="font-semibold text-gold">{formatCOP(item.price)}</p>
                    {item.tagline && (
                      <p className="mt-1 text-sm text-smoke">{item.tagline}</p>
                    )}
                    {item.description && tab === 'bebidas' && (
                      <p className="mt-1 text-xs text-smoke">{item.description}</p>
                    )}
                  </div>
                  {tab === 'bebidas' && (
                    <QuantityStepper
                      size="sm"
                      min={1}
                      value={drinkQuantities[item.id] ?? 1}
                      onChange={(v) =>
                        setDrinkQuantities((prev) => ({ ...prev, [item.id]: v }))
                      }
                    />
                  )}
                </div>
                {tab === 'platos' ? (
                  <button
                    type="button"
                    disabled={shop !== null && !shop.acceptingOrders}
                    onClick={() => openCustomize(item)}
                    className="btn-fire mt-3 w-full disabled:opacity-50"
                  >
                    Elegir opciones
                  </button>
                ) : (
                  <button
                    type="button"
                    disabled={shop !== null && !shop.acceptingOrders}
                    onClick={() => addDrinkToCart(item)}
                    className="btn-fire mt-3 w-full disabled:opacity-50"
                  >
                    Agregar — {formatCOP(item.price * (drinkQuantities[item.id] ?? 1))}
                  </button>
                )}
              </li>
            ))}
          </ul>
          {cart.length > 0 && (
            <button
              type="button"
              className="btn-fire mt-6 w-full"
              onClick={() => setStep('cart')}
            >
              Ver pedido ({cartItemCount}) — {formatCOP(total)}
            </button>
          )}
        </>
      )}

      {step === 'customize' && editing && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            className="text-left text-sm text-smoke hover:text-cream"
            onClick={() => setStep('menu')}
          >
            ← Volver al menú
          </button>
          <div className="card-ash flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <h2 className="font-display text-2xl text-cream">{editing.name}</h2>
              <p className="font-semibold text-gold">{formatCOP(editing.price)} c/u</p>
            </div>
            <QuantityStepper
              min={1}
              value={quantity}
              onChange={setMainQuantity}
            />
          </div>

          {itemNeedsMeatStyle(editing) && (
            <fieldset className="card-ash p-4">
              <legend className="mb-1 text-sm font-semibold text-cream">
                Estilo del chorizo / carne
                <span className="text-ember"> *</span>
              </legend>
              <p className="mb-2 text-xs text-smoke">
                Reparte las {quantity} unidades entre picante y tradicional.
              </p>
              <MeatStyleSplitControl
                total={quantity}
                split={mainMeatSplit}
                onChange={setMainMeatSplit}
              />
            </fieldset>
          )}

          {editing.category === 'plato' && (
            <fieldset className="card-ash p-4">
              <legend className="mb-3 text-sm font-semibold text-cream">
                Adicionales
              </legend>
              <div className="flex flex-col gap-2">
                {getAdicionalesFor(editing.id).map((addon) => {
                  const qty = addonQuantities[addon.id] ?? 0;
                  const active = qty > 0;
                  const addonSplit = addonMeatSplits[addon.id] ?? defaultMeatSplit(0);
                  return (
                    <div
                      key={addon.id}
                      className={`rounded-lg border px-3 py-2.5 ${
                        active ? 'border-flame bg-flame/10' : 'border-white/10'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-cream">
                            {addon.name}
                            {addon.id === 'enchula-choriarepa' && (
                              <span className="ml-1 text-gold">🔥</span>
                            )}
                          </p>
                          <p className="text-xs font-semibold text-gold">
                            +{formatCOP(addon.price)} c/u
                            {qty > 0 && (
                              <span className="ml-2 text-cream">
                                = {formatCOP(previewItemTotal(addon, qty, addonSplit))}
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
                      )}
                    </div>
                  );
                })}
              </div>
            </fieldset>
          )}

          <p className="text-center text-sm text-smoke">
            Subtotal de este plato:{' '}
            <span className="font-bold text-gold">{formatCOP(customizePreviewTotal)}</span>
          </p>

          <button type="button" className="btn-fire w-full" onClick={confirmCustomize}>
            Agregar al pedido — {formatCOP(customizePreviewTotal)}
          </button>
        </div>
      )}

      {step === 'cart' && (
        <div className="flex flex-col gap-4">
          <button
            type="button"
            className="text-left text-sm text-smoke"
            onClick={() => setStep('menu')}
          >
            ← Seguir pidiendo
          </button>
          {cart.length === 0 ? (
            <p className="text-smoke">Tu pedido está vacío.</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {cart.map((line) => (
                <li key={line.id} className="card-ash flex justify-between gap-2 p-3">
                  <div>
                    <p className="font-semibold">
                      {line.quantity > 1 && `${line.quantity}× `}
                      {line.name}
                    </p>
                    {line.modifierLabels.length > 0 && (
                      <p className="text-xs text-smoke">
                        {line.modifierLabels.join(' · ')}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-sm font-semibold text-gold">
                      {formatCOP(line.lineTotal)}
                      {line.quantity > 1 && (
                        <span className="block text-xs font-normal text-smoke">
                          {line.quantity} × {formatCOP(line.lineTotal / line.quantity)}
                        </span>
                      )}
                    </span>
                    <button
                      type="button"
                      className="text-xs text-ember"
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
          )}
          {customer.fulfillment === 'delivery' && (
            <p className="text-sm text-smoke">
              Domicilio: +{formatCOP(DELIVERY_FEE_COP)}
            </p>
          )}
          <p className="text-right text-lg font-bold">
            Total estimado: <span className="text-gold">{formatCOP(total)}</span>
          </p>
          <p className="text-center text-xs text-smoke">
            Pago en efectivo o transferencia al recibir.
          </p>
          <button
            type="button"
            className="btn-fire w-full disabled:opacity-40"
            disabled={cart.length === 0}
            onClick={() => setStep('checkout')}
          >
            Datos de entrega
          </button>
        </div>
      )}

      {step === 'checkout' && (
        <form className="flex flex-col gap-4" onSubmit={submitOrder}>
          <button
            type="button"
            className="text-left text-sm text-smoke"
            onClick={() => setStep('cart')}
          >
            ← Volver al pedido
          </button>
          <label className="flex flex-col gap-1 text-sm">
            Nombre *
            <input
              required
              value={customer.name}
              onChange={(e) => setCustomer((c) => ({ ...c, name: e.target.value }))}
              className="rounded-xl border border-white/15 bg-ash px-3 py-2.5 text-cream outline-none focus:border-flame"
              placeholder="Tu nombre"
            />
          </label>
          <label className="flex flex-col gap-1 text-sm">
            WhatsApp / teléfono *
            <input
              required
              type="tel"
              value={customer.phone}
              onChange={(e) => setCustomer((c) => ({ ...c, phone: e.target.value }))}
              className="rounded-xl border border-white/15 bg-ash px-3 py-2.5 text-cream outline-none focus:border-flame"
              placeholder="300 123 4567"
            />
          </label>

          <fieldset className="card-ash p-4">
            <legend className="mb-2 text-sm font-semibold">¿Cómo lo recibes?</legend>
            <label className="mb-2 flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="fulfillment"
                checked={customer.fulfillment === 'pickup'}
                onChange={() =>
                  setCustomer((c) => ({ ...c, fulfillment: 'pickup', address: '' }))
                }
                className="accent-flame"
              />
              Recoger en local (sin cargo extra)
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="fulfillment"
                checked={customer.fulfillment === 'delivery'}
                onChange={() => setCustomer((c) => ({ ...c, fulfillment: 'delivery' }))}
                className="accent-flame"
              />
              Domicilio (+{formatCOP(DELIVERY_FEE_COP)})
            </label>
          </fieldset>

          {customer.fulfillment === 'delivery' && (
            <label className="flex flex-col gap-1 text-sm">
              Dirección de entrega *
              <textarea
                required
                value={customer.address}
                onChange={(e) => setCustomer((c) => ({ ...c, address: e.target.value }))}
                rows={2}
                className="rounded-xl border border-white/15 bg-ash px-3 py-2.5 text-cream outline-none focus:border-flame"
                placeholder="Barrio, calle, casa/apto, referencia…"
              />
            </label>
          )}

          <fieldset className="card-ash p-4">
            <legend className="mb-2 text-sm font-semibold">
              {customer.fulfillment === 'delivery'
                ? '¿Cuándo lo enviamos?'
                : '¿Cuándo recoges?'}
            </legend>
            <label className="mb-2 flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="pickup"
                checked={customer.pickup === 'asap'}
                onChange={() => setCustomer((c) => ({ ...c, pickup: 'asap' }))}
                className="accent-flame"
              />
              Lo antes posible
            </label>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="radio"
                name="pickup"
                checked={customer.pickup === 'scheduled'}
                onChange={() => setCustomer((c) => ({ ...c, pickup: 'scheduled' }))}
                className="accent-flame"
              />
              Hora estimada
            </label>
            {customer.pickup === 'scheduled' && (
              <input
                type="time"
                value={customer.pickupTime ?? ''}
                onChange={(e) =>
                  setCustomer((c) => ({ ...c, pickupTime: e.target.value }))
                }
                className="mt-2 w-full rounded-xl border border-white/15 bg-void px-3 py-2"
              />
            )}
          </fieldset>
          <label className="flex flex-col gap-1 text-sm">
            Notas (opcional)
            <textarea
              value={customer.notes}
              onChange={(e) => setCustomer((c) => ({ ...c, notes: e.target.value }))}
              rows={2}
              className="rounded-xl border border-white/15 bg-ash px-3 py-2.5 text-cream outline-none focus:border-flame"
              placeholder="Sin cebolla, extra limón…"
            />
          </label>
          {submitError && (
            <p className="text-center text-sm text-ember">{submitError}</p>
          )}
          <button
            type="submit"
            className="btn-fire w-full disabled:opacity-50"
            disabled={submitting || !shop?.acceptingOrders}
          >
            {submitting ? 'Enviando…' : `Enviar pedido — ${formatCOP(total)}`}
          </button>
        </form>
      )}

      {step === 'done' && (
        <div className="card-ash flex flex-col items-center gap-4 p-6 text-center">
          <p className="text-4xl">🐺</p>
          <h2 className="font-display text-2xl text-fire">¡Pedido recibido!</h2>
          <p className="text-sm text-smoke">
            Tu código: <strong className="text-cream">{orderCode}</strong>
          </p>
          <p className="text-sm leading-relaxed text-smoke">
            Guarda tu código. El equipo puede escribirte al WhatsApp que dejaste para
            confirmar tiempo de entrega o recogida.
          </p>
          <button
            type="button"
            className="btn-fire w-full"
            onClick={() => {
              setCart([]);
              setCustomer(emptyCustomer);
              setStep('menu');
            }}
          >
            Hacer otro pedido
          </button>
        </div>
      )}
    </div>
  );
}
