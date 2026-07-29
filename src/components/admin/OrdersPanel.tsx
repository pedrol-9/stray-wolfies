import { useMemo } from 'react';
import { STATUS_LABELS } from '../../lib/order/status';
import type { AdminOrder, OrderStatus } from '../../types/admin-order';
import LatestOrderAlert from './LatestOrderAlert';
import OrderCard from './OrderCard';

type Tab = 'incoming' | 'production' | 'dispatched';

interface OrdersPanelProps {
  tab: Tab;
  onTabChange: (tab: Tab) => void;
  orders: AdminOrder[];
  busyId: string | null;
  loading: boolean;
  error: string;
  searchInput: string;
  searchQuery: string;
  isSearching: boolean;
  latestNewOrder: AdminOrder | null;
  onSearchChange: (value: string) => void;
  onClearSearch: () => void;
  onStatusChange: (orderId: string, status: OrderStatus) => void;
  onCloseLatestAlert: () => void;
}

export default function OrdersPanel({
  tab,
  onTabChange,
  orders,
  busyId,
  loading,
  error,
  searchInput,
  searchQuery,
  isSearching,
  latestNewOrder,
  onSearchChange,
  onClearSearch,
  onStatusChange,
  onCloseLatestAlert,
}: OrdersPanelProps) {
  const groupedActive = useMemo(() => {
    const activeStatusesForTab =
      tab === 'incoming'
        ? ['placed']
        : tab === 'production'
          ? ['preparing']
          : [];
    return activeStatusesForTab.map((status) => ({
      status: status as OrderStatus,
      orders: orders.filter((o) => o.status === (status as OrderStatus)),
    })).filter((g) => g.orders.length > 0);
  }, [orders, tab]);

  const tabs: { id: Tab; label: string }[] = [
    { id: 'incoming', label: 'In' },
    { id: 'production', label: 'On' },
    { id: 'dispatched', label: 'Out' },
  ];

  return (
    <div className="lg:col-span-7 space-y-6">
      {latestNewOrder && (
        <LatestOrderAlert
          latestNewOrder={latestNewOrder}
          onClose={onCloseLatestAlert}
        />
      )}

      {/* Search input */}
      <div className="relative">
        <input
          type="search"
          value={searchInput}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Buscar por código, nombre o celular…"
          className="w-full rounded-xl border border-white/15 bg-ash py-3 pl-4 pr-10 text-sm text-cream outline-none focus:border-flame focus:ring-2 focus:ring-flame/15 transition"
          aria-label="Buscar pedidos"
        />
        {searchInput.length > 0 && (
          <button
            type="button"
            onClick={onClearSearch}
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

      {/* Tab selector */}
      <div className={`flex gap-2 ${isSearching ? 'pointer-events-none opacity-40' : ''}`}>
        {tabs.map(({ id, label }) => (
          <button
            key={id}
            type="button"
            onClick={() => onTabChange(id)}
            className={`flex-1 rounded-xl py-2.5 text-sm font-semibold transition cursor-pointer ${
              tab === id ? 'btn-fire' : 'border border-white/10 bg-ash hover:bg-white/5'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Error message */}
      {error && (
        <p className="rounded-xl border border-ember/40 bg-ember/10 px-3 py-2.5 text-center text-sm font-semibold text-ember animate-shake">
          {error}
        </p>
      )}

      {/* Search results */}
      {isSearching && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gold">
            Resultados ({orders.length}) — "{searchQuery}"
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
                  onStatusChange={onStatusChange}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Active tabs: incoming / production */}
      {!isSearching && (tab === 'incoming' || tab === 'production') && (
        <div className="flex flex-col gap-6">
          {groupedActive.length === 0 && (
            <p className="text-center text-sm text-smoke py-8 card-ash bg-ash/40 border-dashed">
              No hay pedidos activos en esta pestaña.
            </p>
          )}
          {groupedActive.map(({ status, orders: list }) => (
            <section key={status} className="animate-in fade-in duration-200">
              <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gold flex items-center gap-2">
                <span className="size-2 rounded-full bg-gold animate-pulse" />
                {STATUS_LABELS[status]} ({list.length})
              </h2>
              <div className="flex flex-col gap-3">
                {list.map((order) => (
                  <OrderCard
                    key={order.id}
                    order={order}
                    busy={busyId === order.id}
                    onStatusChange={onStatusChange}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Dispatched tab */}
      {!isSearching && tab === 'dispatched' && (
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
              onStatusChange={onStatusChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
