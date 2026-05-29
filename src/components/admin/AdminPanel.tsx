import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  isPushEnabled,
  isSoundEnabled,
  requestPushPermission,
  showOrderNotification,
} from "../../lib/admin-notify-prefs";
import { playNewOrderAlert } from "../../lib/order-alert-sound";
import { STATUS_LABELS } from "../../lib/order-status";
import { getSupabaseClient } from "../../lib/supabase-client";
import type { AdminOrder, OrderStatus } from "../../types/admin-order";
import OrderCard from "./OrderCard";
import StoreShiftManager from "./StoreShiftManager";
import AlertSettings from "./AlertSettings";
import LatestOrderAlert from "./LatestOrderAlert";

type Tab = "incoming" | "production" | "dispatched";

function adminHeaders(pin: string): HeadersInit {
  return { "x-admin-pin": pin, "Content-Type": "application/json" };
}

export default function AdminPanel() {
  const [pin, setPin] = useState("");
  const [authed, setAuthed] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("incoming");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [soundOn, setSoundOn] = useState(true);
  const [pushOn, setPushOn] = useState(true);
  const [pushPermission, setPushPermission] =
    useState<NotificationPermission>("default");
  const [latestNewOrder, setLatestNewOrder] = useState<AdminOrder | null>(null);
  const knownOrderIdsRef = useRef<Set<string>>(new Set());
  const alertsInitializedRef = useRef(false);

  // Balance and shifts state
  const [shift, setShift] = useState<any | null>(null);
  const [totals, setTotals] = useState({ base: 0, income: 0, expense: 0 });
  const [transactions, setTransactions] = useState<any[]>([]);
  const [sendingReport, setSendingReport] = useState(false);

  const loadBalance = useCallback(async (adminPin: string) => {
    try {
      const res = await fetch("/api/admin/shifts", {
        headers: adminHeaders(adminPin),
      });
      if (!res.ok) throw new Error("No se pudo cargar el balance");
      const data = await res.json();
      setShift(data.shift || null);
      setTotals(data.totals || { base: 0, income: 0, expense: 0 });
      setTransactions(data.transactions || []);
    } catch (e) {
      console.error("loadBalance error", e);
    }
  }, []);

  // Refresh balance when authenticated
  useEffect(() => {
    if (!authed || !pin) return;
    loadBalance(pin).catch(() => {});
  }, [authed, pin, loadBalance]);

  const loadShop = useCallback(async (adminPin: string) => {
    const res = await fetch("/api/admin/shop", {
      headers: adminHeaders(adminPin),
    });
    if (!res.ok) throw new Error("PIN incorrecto o sin configurar");
    const data = await res.json();
    setIsOpen(data.is_open);
  }, []);

  const openShiftFlow = useCallback(async (amount: number) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shifts", {
        method: "POST",
        headers: adminHeaders(pin),
        body: JSON.stringify({ baseAmount: amount }),
      });

      // If there's already an open shift, load it and show close-shift UX
      if (res.status === 409) {
        const data = await res.json();
        if (data.shift) {
          setShift(data.shift);
        }
        setError(data.error || "Ya hay un turno abierto. Ciérralo primero.");
        await loadBalance(pin);
        await loadShop(pin);
        return;
      }

      if (!res.ok) throw new Error("No se pudo abrir el turno");
      await fetch("/api/admin/shop", {
        method: "PATCH",
        headers: adminHeaders(pin),
        body: JSON.stringify({ isOpen: true }),
      });
      setError("");
      await loadBalance(pin);
      await loadShop(pin);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [pin, loadBalance, loadShop]);

  const closeShiftFlow = useCallback(async () => {
    if (!shift || !shift.id) {
      setError("No hay turno activo para cerrar");
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shifts", {
        method: "PATCH",
        headers: adminHeaders(pin),
        body: JSON.stringify({ id: shift.id }),
      });
      if (!res.ok) throw new Error("No se pudo cerrar el turno");
      await fetch("/api/admin/shop", {
        method: "PATCH",
        headers: adminHeaders(pin),
        body: JSON.stringify({ isOpen: false }),
      });
      await loadBalance(pin);
      await loadShop(pin);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [shift, pin, loadBalance, loadShop]);

  const recordExpense = useCallback(async (amount: number, description: string) => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/expenses", {
        method: "POST",
        headers: adminHeaders(pin),
        body: JSON.stringify({
          amount: Math.round(amount),
          description: description.trim(),
          shiftId: shift?.id,
        }),
      });
      if (!res.ok) throw new Error("No se pudo registrar gasto");
      await loadBalance(pin);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [shift, pin, loadBalance]);

  const sendReport = useCallback(async () => {
    if (!shift || !shift.id) {
      setError("No hay turno para reportar");
      return;
    }
    setSendingReport(true);
    try {
      const res = await fetch("/api/admin/report", {
        method: "POST",
        headers: adminHeaders(pin),
        body: JSON.stringify({ shiftId: shift.id }),
      });
      if (!res.ok) {
        const bodyText = await res.text();
        throw new Error("No se pudo enviar el reporte: " + bodyText);
      }
      setError("Reporte enviado correctamente");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setSendingReport(false);
    }
  }, [shift, pin]);

  const isSearching = searchQuery.trim().length >= 2;

  const loadOrders = useCallback(
    async (adminPin: string, opts: { filter?: Tab; q?: string }) => {
      const params = new URLSearchParams();
      if (opts.q && opts.q.trim().length >= 2) {
        params.set("q", opts.q.trim());
      } else {
        params.set("filter", opts.filter ?? "incoming");
      }
      const res = await fetch(`/api/admin/orders?${params}`, {
        headers: adminHeaders(adminPin),
      });
      if (!res.ok) throw new Error("No se pudieron cargar pedidos");
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
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }, [pin, tab, searchQuery, isSearching, loadShop, loadOrders]);

  const handleNewOrdersDetected = useCallback(
    (fetched: AdminOrder[]) => {
      const newPlaced = Array.isArray(fetched)
        ? fetched.filter(
            (o) => o.status === "placed" && !knownOrderIdsRef.current.has(o.id),
          )
        : [];
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
      if (typeof Notification !== "undefined") {
        setPushPermission(Notification.permission);
      }
      knownOrderIdsRef.current = new Set();
      alertsInitializedRef.current = false;
      await loadShop(pin);
      await loadOrders(pin, { filter: tab });
      setAuthed(true);
      setError("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function enablePush() {
    const perm = await requestPushPermission();
    setPushPermission(perm);
    if (perm === "granted") setPushOn(true);
  }

  function testAlertSound() {
    playNewOrderAlert();
  }

  async function toggleShop() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/shop", {
        method: "PATCH",
        headers: adminHeaders(pin),
        body: JSON.stringify({ isOpen: !isOpen }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar la tienda");
      const data = await res.json();
      setIsOpen(data.is_open);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
    } finally {
      setLoading(false);
    }
  }

  async function updateOrderStatus(orderId: string, status: OrderStatus) {
    setBusyId(orderId);
    try {
      const res = await fetch("/api/admin/orders", {
        method: "PATCH",
        headers: adminHeaders(pin),
        body: JSON.stringify({ id: orderId, status }),
      });
      if (!res.ok) throw new Error("No se pudo actualizar el pedido");
      if (isSearching) {
        await loadOrders(pin, { q: searchQuery });
      } else if (status === "picked_up" || status === "cancelled") {
        setTab("dispatched");
        await loadOrders(pin, { filter: "dispatched" });
      } else if (status === "preparing") {
        setTab("production");
        await loadOrders(pin, { filter: "production" });
      } else {
        await loadOrders(pin, { filter: "incoming" });
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "Error");
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
    setSearchInput("");
    setSearchQuery("");
  }

  /** Realtime listeners para todos los cambios en la tabla orders */
  useEffect(() => {
    if (!authed || !pin) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("orders-changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "orders" },
        () => {
          // Cuando se actualiza un pedido, recargamos los órdenes del tab actual
          if (!isSearching) {
            loadOrders(pin, { filter: tab }).catch(() => {});
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "DELETE", schema: "public", table: "orders" },
        () => {
          // Cuando se elimina un pedido, recargamos
          if (!isSearching) {
            loadOrders(pin, { filter: tab }).catch(() => {});
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authed, pin, tab, isSearching, loadOrders]);

  /** Realtime listener para estado de la tienda (abierta/cerrada) */
  useEffect(() => {
    if (!authed || !pin) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("shop-status")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "shop_settings" },
        (payload) => {
          const data = payload.new as { is_open: boolean };
          if (data) {
            setIsOpen(data.is_open);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authed, pin]);

  /** Realtime listener para nuevos pedidos (INSERT - se dispara inmediatamente) */
  useEffect(() => {
    if (!authed || !pin || isSearching) return;

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel("orders-new")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "orders" },
        (payload) => {
          const newOrder = payload.new as AdminOrder;
          if (newOrder && newOrder.status === "placed") {
            // Agregar el nuevo pedido a los conocidos para detectarlo
            knownOrderIdsRef.current.add(newOrder.id);
            handleNewOrdersDetected([newOrder]);
            // También recargamos la lista de pedidos entrantes
            if (tab === "incoming") {
              loadOrders(pin, { filter: "incoming" }).catch(() => {});
            }
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [authed, pin, isSearching, handleNewOrdersDetected, tab, loadOrders]);

  const groupedActive = useMemo(() => {
    const groups: { status: OrderStatus; orders: AdminOrder[] }[] = [];
    const activeStatusesForTab =
      tab === "incoming"
        ? ["placed"]
        : tab === "production"
          ? ["preparing"]
          : [];
    for (const status of activeStatusesForTab) {
      const list = orders.filter((o) => o.status === (status as OrderStatus));
      if (list.length)
        groups.push({ status: status as OrderStatus, orders: list });
    }
    return groups;
  }, [orders, tab]);

  if (!authed) {
    return (
      <div className="mx-auto flex min-h-dvh max-w-sm flex-col justify-center gap-4 p-6 text-center">
        <h1 className="font-display text-3xl text-fire animate-in fade-in duration-300">
          Callejero Administrador
        </h1>
        <p className="text-sm text-smoke">Pedidos, producción y tienda.</p>
        <input
          type="password"
          inputMode="numeric"
          placeholder="PIN de admin"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && pin) {
              login();
            }
          }}
          className="rounded-xl border border-white/15 bg-ash px-4 py-3 text-cream outline-none focus:border-flame focus:ring-2 focus:ring-flame/15 transition text-center text-lg tracking-widest font-bold"
        />
        {error && <p className="text-sm font-semibold text-ember animate-shake">{error}</p>}
        <button
          type="button"
          className="btn-fire py-3 text-sm font-semibold cursor-pointer"
          disabled={loading}
          onClick={login}
        >
          {loading ? "Entrando…" : "Entrar"}
        </button>
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-6 px-4 pb-10 pt-6 lg:px-8">
      <header className="text-center mb-4">
        <h1 className="font-display text-3xl md:text-4xl text-fire">
          Callejero Administrador
        </h1>
        <button
          type="button"
          onClick={refresh}
          disabled={loading}
          className="mt-2 text-xs md:text-sm text-smoke underline hover:text-cream transition cursor-pointer"
        >
          {loading ? "Actualizando…" : "🔄 Actualizar panel"}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Gestión de Turno y Preferencias */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto scrollbar-thin">
          <StoreShiftManager
            isOpen={isOpen}
            shift={shift}
            totals={totals}
            transactions={transactions}
            sendingReport={sendingReport}
            loading={loading}
            pin={pin}
            toggleShop={toggleShop}
            closeShiftFlow={closeShiftFlow}
            openShiftFlow={openShiftFlow}
            recordExpense={recordExpense}
            sendReport={sendReport}
            loadBalance={loadBalance}
          />

          <AlertSettings
            soundOn={soundOn}
            setSoundOn={setSoundOn}
            pushOn={pushOn}
            setPushOn={setPushOn}
            pushPermission={pushPermission}
            enablePush={enablePush}
            testAlertSound={testAlertSound}
          />
        </div>

        {/* Columna Derecha: Búsqueda y Pedidos */}
        <div className="lg:col-span-7 space-y-6">
          {latestNewOrder && (
            <LatestOrderAlert
              latestNewOrder={latestNewOrder}
              onClose={() => setLatestNewOrder(null)}
            />
          )}

          <div className="relative">
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder="Buscar por código, nombre o celular…"
              className="w-full rounded-xl border border-white/15 bg-ash py-3 pl-4 pr-10 text-sm text-cream outline-none focus:border-flame focus:ring-2 focus:ring-flame/15 transition"
              aria-label="Buscar pedidos"
            />
            {searchInput.length > 0 && (
              <button
                type="button"
                onClick={clearSearch}
                className="absolute right-2 top-1/2 -translate-y-1/2 px-2 text-smoke hover:text-cream cursor-pointer"
                aria-label="Limpiar búsqueda"
              >
                ✕
              </button>
            )}
          </div>
          {searchInput.trim().length > 0 && searchInput.trim().length < 2 && (
            <p className="text-center text-xs text-smoke">
              Escribe al menos 2 caracteres.
            </p>
          )}

          <div
            className={`flex gap-2 ${isSearching ? "pointer-events-none opacity-40" : ""}`}
          >
            <button
              type="button"
              onClick={() => setTab("incoming")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition cursor-pointer ${
                tab === "incoming" ? "btn-fire" : "border border-white/10 bg-ash hover:bg-white/5"
              }`}
            >
              In
            </button>
            <button
              type="button"
              onClick={() => setTab("production")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition cursor-pointer ${
                tab === "production" ? "btn-fire" : "border border-white/10 bg-ash hover:bg-white/5"
              }`}
            >
              On
            </button>
            <button
              type="button"
              onClick={() => setTab("dispatched")}
              className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition cursor-pointer ${
                tab === "dispatched" ? "btn-fire" : "border border-white/10 bg-ash hover:bg-white/5"
              }`}
            >
              Out
            </button>
          </div>

          {error && (
            <p className="rounded-xl border border-ember/40 bg-ember/10 px-3 py-2.5 text-center text-sm font-semibold text-ember animate-shake">
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
                <div className="flex flex-col gap-3 animate-in fade-in duration-200">
                  {orders.map((order) => (
                    <OrderCard
                      key={order.id}
                      order={order}
                      busy={busyId === order.id}
                      onStatusChange={updateOrderStatus}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {!isSearching && (tab === "incoming" || tab === "production") && (
            <div className="flex flex-col gap-6">
              {groupedActive.length === 0 && (
                <p className="text-center text-sm text-smoke py-8 card-ash bg-ash/40 border-dashed">
                  No hay pedidos activos en esta pestaña.
                </p>
              )}
              {groupedActive.map(({ status, orders: list }) => (
                <section key={status} className="animate-in fade-in duration-200">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold flex items-center gap-2">
                    <span className="size-2 rounded-full bg-gold animate-pulse"></span>
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

          {!isSearching && tab === "dispatched" && (
            <div className="flex flex-col gap-3 animate-in fade-in duration-200">
              {orders.length === 0 && (
                <p className="text-center text-sm text-smoke py-8 card-ash bg-ash/40 border-dashed">
                  Aún no hay pedidos finalizados hoy.
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
        </div>
      </div>

      <div className="mt-8 border-t border-white/5 pt-4 text-center">
        <a href="/" className="text-sm text-smoke hover:text-cream underline transition">
          ← Ir al menú de clientes
        </a>
      </div>
    </div>
  );
}
