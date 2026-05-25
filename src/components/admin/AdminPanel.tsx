import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  isPushEnabled,
  isSoundEnabled,
  requestPushPermission,
  setPushEnabled,
  setSoundEnabled,
  showOrderNotification,
} from '../../lib/admin-notify-prefs';
import { playNewOrderAlert } from '../../lib/order-alert-sound';
import { ACTIVE_STATUSES, STATUS_LABELS } from '../../lib/order-status';
import {
  formatOrderWhatsAppText,
  getOwnerWhatsApp,
  openWhatsAppToOwner,
} from '../../lib/order-whatsapp';
import type { AdminOrder, OrderStatus } from '../../types/admin-order';
import OrderCard from './OrderCard';

type Tab = 'active' | 'done';

function adminHeaders(pin: string): HeadersInit {
  return { 'x-admin-pin': pin, 'Content-Type': 'application/json' };
}

export default function AdminPanel() {
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>('active');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [soundOn, setSoundOn] = useState(true);
  const [pushOn, setPushOn] = useState(true);
  const [pushPermission, setPushPermission] = useState<NotificationPermission>('default');
  const [latestNewOrder, setLatestNewOrder] = useState<AdminOrder | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const alertsInitializedRef = useRef(false);
  const ownerWhatsApp = getOwnerWhatsApp();

  const loadShop = useCallback(async (adminPin: string) => {
    const res = await fetch('/api/admin/shop', {
      headers: adminHeaders(adminPin),
    });
    if (!res.ok) throw new Error('PIN incorrecto o sin configurar');
    const data = await res.json();
    setIsOpen(data.is_open);
  }, []);

  const isSearching = searchQuery.trim().length >= 2;

  const loadOrders = useCallback(
    async (adminPin: string, opts: { filter?: Tab; q?: string }) => {
      const params = new URLSearchParams();
      if (opts.q && opts.q.trim().length >= 2) {
        params.set('q', opts.q.trim());
      } else {
        params.set('filter', opts.filter ?? 'active');
      }
      const res = await fetch(`/api/admin/orders?${params}`, {
        headers: adminHeaders(adminPin),
      });
      if (!res.ok) throw new Error('No se pudieron cargar pedidos');
      const data = await res.json();
      setOrders(data.orders ?? []);
    },
    [],
  );

  const refresh = useCallback(async () => {
    if (!pin) return;
    setLoading(true);
    try {
      await loadShop(pin);
      await loadOrders(pin, isSearching ? { q: searchQuery } : { filter: tab });
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }, [pin, tab, searchQuery, isSearching, loadShop, loadOrders]);

  const handleNewOrdersDetected = useCallback(
    (fetched: AdminOrder[]) => {
      const newPlaced = fetched.filter(
        (o) => o.status === 'placed' && !knownOrderIdsRef.current.has(o.id),
      );
      for (const o of fetched) knownOrderIdsRef.current.add(o.id);

      if (!alertsInitializedRef.current) {
        alertsInitializedRef.current = true;
        return;
      }

      for (const order of newPlaced) {
        if (soundOn) playNewOrderAlert();
        showOrderNotification(order, pushOn);
        setLatestNewOrder(order);
      }
    },
    [soundOn, pushOn],
  );

  async function login() {
    setLoading(true);
    try {
      setSoundOn(isSoundEnabled());
      setPushOn(isPushEnabled());
      if (typeof Notification !== 'undefined') {
        setPushPermission(Notification.permission);
      }
      knownOrderIdsRef.current = new Set();
      alertsInitializedRef.current = false;
      await loadShop(pin);
      await loadOrders(pin, { filter: tab });
      setAuthed(true);
      setError('');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function enablePush() {
    const perm = await requestPushPermission();
    setPushPermission(perm);
    if (perm === 'granted') setPushOn(true);
  }

  function testAlertSound() {
    playNewOrderAlert();
  }

  async function toggleShop() {
    setLoading(true);
    try {
      const res = await fetch('/api/admin/shop', {
        method: 'PATCH',
        headers: adminHeaders(pin),
        body: JSON.stringify({ isOpen: !isOpen }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar la tienda');
      const data = await res.json();
      setIsOpen(data.is_open);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setBusyId(orderId);
    try {
      const res = await fetch('/api/admin/orders', {
        method: 'PATCH',
        headers: adminHeaders(pin),
        body: JSON.stringify({ id: orderId, status }),
      });
      if (!res.ok) throw new Error('No se pudo actualizar el pedido');
      if (isSearching) {
        await loadOrders(pin, { q: searchQuery });
      } else if (status === 'picked_up' || status === 'cancelled') {
        setTab('done');
        await loadOrders(pin, { filter: 'done' });
      } else {
        await loadOrders(pin, { filter: 'active' });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setBusyId(null);
    }
  }

  useEffect(() => {
    if (!authed || !pin) return;
    const t = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput, authed, pin]);

  useEffect(() => {
    if (!authed || !pin) return;
    if (searchQuery.trim().length >= 2) {
      loadOrders(pin, { q: searchQuery }).catch(() => {});
      return;
    }
    if (searchInput.trim().length === 0) {
      loadOrders(pin, { filter: tab }).catch(() => {});
    }
  }, [searchQuery, tab, authed, pin, loadOrders, searchInput]);

  function clearSearch() {
    setSearchInput('');
    setSearchQuery('');
  }

  useEffect(() => {
    if (!authed || !pin) return;
    const id = setInterval(() => refresh(), 15_000);
    return () => clearInterval(id);
  }, [authed, pin, refresh]);

  /** Sonido + aviso cada 10 s (solo pedidos activos, sin búsqueda) */
  useEffect(() => {
    if (!authed || !pin || isSearching) return;

    async function pollNew() {
      try {
        const res = await fetch('/api/admin/orders?filter=active', {
          headers: adminHeaders(pin),
        });
        if (!res.ok) return;
        const data = await res.json();
        handleNewOrdersDetected(data.orders ?? []);
      } catch {
        /* ignore */
      }
    }

    pollNew();
    const id = setInterval(pollNew, 10_000);
    return () => clearInterval(id);
  }, [authed, pin, isSearching, handleNewOrdersDetected]);

  const groupedActive = useMemo(() => {
    const groups: { status: OrderStatus; orders: AdminOrder[] }[] = [];
    for (const status of ACTIVE_STATUSES) {
      const list = orders.filter((o) => o.status === status);
      if (list.length) groups.push({ status, orders: list });
    }
    return groups;
  }, [orders]);

  if (!authed) {
    return (
      <div className="mx-auto flex max-w-sm flex-col gap-4 p-6">
        <h1 className="font-display text-2xl text-fire">Panel Callejeros</h1>
        <p className="text-sm text-smoke">Pedidos, producción y tienda.</p>
        <input
          type="password"
          inputMode="numeric"
          placeholder="PIN de admin"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          className="rounded-xl border border-white/15 bg-ash px-3 py-2.5 text-cream"
        />
        {error && <p className="text-sm text-ember">{error}</p>}
        <button type="button" className="btn-fire" disabled={loading} onClick={login}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-lg flex-col gap-4 px-4 pb-10 pt-6">
      <header className="text-center">
        <h1 className="font-display text-2xl text-fire">Panel Callejeros</h1>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="mt-1 text-xs text-smoke underline"
        >
          {loading ? 'Actualizando…' : 'Actualizar'}
        </button>
      </header>

      <section className="card-ash flex items-center justify-between gap-3 p-4">
        <div className="text-left">
          <p className="text-sm font-semibold">
            Tienda {isOpen ? '🟢 Abierta' : '🔴 Cerrada'}
          </p>
          <p className="text-xs text-smoke">Recibir pedidos nuevos</p>
        </div>
        <button
          type="button"
          className="btn-fire shrink-0 px-4 py-2 text-sm"
          disabled={loading}
          onClick={toggleShop}
        >
          {isOpen ? 'Cerrar' : 'Abrir'}
        </button>
      </section>

      <section className="card-ash flex flex-col gap-3 p-4 text-left text-sm">
        <p className="font-semibold text-cream">Alertas de pedidos nuevos</p>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={soundOn}
            onChange={(e) => {
              setSoundOn(e.target.checked);
              setSoundEnabled(e.target.checked);
            }}
            className="accent-flame"
          />
          Sonido en el panel
        </label>
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={pushOn}
            onChange={(e) => {
              setPushOn(e.target.checked);
              setPushEnabled(e.target.checked);
            }}
            className="accent-flame"
          />
          Notificación del navegador
        </label>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="rounded-lg border border-white/15 px-3 py-1.5 text-xs"
            onClick={testAlertSound}
          >
            Probar sonido
          </button>
          {pushPermission !== 'granted' && (
            <button
              type="button"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs"
              onClick={enablePush}
            >
              Activar avisos
            </button>
          )}
        </div>
        <p className="text-xs text-smoke">
          Deja esta pestaña abierta en el celular de cocina. El sonido suena al detectar
          pedidos nuevos (estado “por aceptar”).
        </p>
      </section>

      {latestNewOrder && (
        <div className="rounded-xl border border-gold/50 bg-gold/10 p-4 text-sm">
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
                    formatOrderWhatsAppText(latestNewOrder),
                  )
                }
              >
                WhatsApp
              </button>
            )}
            <button
              type="button"
              className="rounded-lg border border-white/15 px-3 py-1.5 text-xs"
              onClick={() => setLatestNewOrder(null)}
            >
              Cerrar
            </button>
          </div>
        </div>
      )}

      <div className="relative">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          placeholder="Buscar por código, nombre o celular…"
          className="w-full rounded-xl border border-white/15 bg-ash py-2.5 pl-4 pr-10 text-sm text-cream outline-none focus:border-flame"
          aria-label="Buscar pedidos"
        />
        {searchInput.length > 0 && (
          <button
            type="button"
            onClick={clearSearch}
            className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-smoke hover:text-cream"
            aria-label="Limpiar búsqueda"
          >
            ✕
          </button>
        )}
      </div>
      {searchInput.trim().length > 0 && searchInput.trim().length < 2 && (
        <p className="text-center text-xs text-smoke">Escribe al menos 2 caracteres.</p>
      )}

      <div className={`flex gap-2 ${isSearching ? 'pointer-events-none opacity-40' : ''}`}>
        <button
          type="button"
          onClick={() => setTab('active')}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${
            tab === 'active' ? 'btn-fire' : 'border border-white/10 bg-ash'
          }`}
        >
          Activos
        </button>
        <button
          type="button"
          onClick={() => setTab('done')}
          className={`flex-1 rounded-xl py-2.5 text-sm font-semibold ${
            tab === 'done' ? 'btn-fire' : 'border border-white/10 bg-ash'
          }`}
        >
          Finalizados
        </button>
      </div>

      {error && (
        <p className="rounded-xl border border-ember/40 bg-ember/10 px-3 py-2 text-center text-sm text-ember">
          {error}
        </p>
      )}

      {isSearching && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gold">
            Resultados ({orders.length}) — “{searchQuery}”
          </h2>
          {orders.length === 0 ? (
            <p className="text-center text-sm text-smoke">
              No hay pedidos con ese código, nombre o celular.
            </p>
          ) : (
            orders.map((order) => (
              <OrderCard
                key={order.id}
                order={order}
                busy={busyId === order.id}
                onStatusChange={updateOrderStatus}
              />
            ))
          )}
        </div>
      )}

      {!isSearching && tab === 'active' && (
        <div className="flex flex-col gap-6">
          {groupedActive.length === 0 && (
            <p className="text-center text-sm text-smoke">No hay pedidos activos.</p>
          )}
          {groupedActive.map(({ status, orders: list }) => (
            <section key={status}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-gold">
                {STATUS_LABELS[status]} ({list.length})
              </h2>
              <div className="flex flex-col gap-3">
                {list.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    busy={busyId === order.id}
                    onStatusChange={updateOrderStatus}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {!isSearching && tab === 'done' && (
        <div className="flex flex-col gap-3">
          {orders.length === 0 && (
            <p className="text-center text-sm text-smoke">
              Aún no hay pedidos finalizados.
            </p>
          )}
          {orders.map((order) => (
            <OrderCard
              key={order.id}
              order={order}
              busy={false}
              onStatusChange={updateOrderStatus}
            />
          ))}
        </div>
      )}

      <a href="/" className="text-center text-sm text-smoke underline">
        Ir al menú de clientes
      </a>
    </div>
  );
}
