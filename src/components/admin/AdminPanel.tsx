import { useCallback, useEffect, useState } from 'react';
import { useAdminOrders } from '../../hooks/useAdminOrders';
import { useAdminShop } from '../../hooks/useAdminShop';
import { useOrderAlerts } from '../../hooks/useOrderAlerts';
import type { Shift, ShiftTotals, CashTransaction, OrderStatus } from '../../types/admin-order';
import AdminLoginScreen from './AdminLoginScreen';
import AlertSettings from './AlertSettings';
import EmberBackground from './EmberBackground';
import OrdersPanel from './OrdersPanel';
import StoreShiftManager from './StoreShiftManager';

type Tab = 'incoming' | 'production' | 'dispatched';

function adminHeaders(pin: string): HeadersInit {
  return { 'x-admin-pin': pin, 'Content-Type': 'application/json' };
}

export default function AdminPanel() {
  const [pin, setPin] = useState('');
  const [authed, setAuthed] = useState(false);
  const [tab, setTab] = useState<Tab>('incoming');
  const [searchInput, setSearchInput] = useState('');
  const [searchQuery, setSearchQuery] = useState('');

  // Shift & balance state (tipado fuerte)
  const [shift, setShift] = useState<Shift | null>(null);
  const [totals, setTotals] = useState<ShiftTotals>({ base: 0, income: 0, expense: 0 });
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [sendingReport, setSendingReport] = useState(false);
  const [globalError, setGlobalError] = useState('');

  const isSearching = searchQuery.trim().length >= 2;

  // Custom hooks
  const alerts = useOrderAlerts();

  const shop = useAdminShop({ authed, pin });

  const orders = useAdminOrders({
    authed,
    pin,
    tab,
    searchQuery,
    isSearching,
    onNewOrders: alerts.handleNewOrdersDetected,
  });

  // Balance / shift data
  const loadBalance = useCallback(async (adminPin: string) => {
    try {
      const res = await fetch('/api/admin/shifts', {
        headers: adminHeaders(adminPin),
      });
      if (!res.ok) throw new Error('No se pudo cargar el balance');
      const data = await res.json();
      setShift(data.shift || null);
      setTotals(data.totals || { base: 0, income: 0, expense: 0 });
      setTransactions(data.transactions || []);
    } catch (e) {
      console.error('loadBalance error', e);
    }
  }, []);

  useEffect(() => {
    if (!authed || !pin) return;
    loadBalance(pin).catch(() => {});
  }, [authed, pin, loadBalance]);

  const openShiftFlow = useCallback(async (amount: number) => {
    orders.setLoading(true);
    try {
      const res = await fetch('/api/admin/shifts', {
        method: 'POST',
        headers: adminHeaders(pin),
        body: JSON.stringify({ baseAmount: amount }),
      });
      if (res.status === 409) {
        const data = await res.json();
        if (data.shift) setShift(data.shift);
        setGlobalError(data.error || 'Ya hay un turno abierto. Ciérralo primero.');
        await loadBalance(pin);
        await shop.loadShop(pin);
        return;
      }
      if (!res.ok) throw new Error('No se pudo abrir el turno');
      await fetch('/api/admin/shop', {
        method: 'PATCH',
        headers: adminHeaders(pin),
        body: JSON.stringify({ isOpen: true }),
      });
      setGlobalError('');
      await loadBalance(pin);
      await shop.loadShop(pin);
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Error');
    } finally {
      orders.setLoading(false);
    }
  }, [pin, loadBalance, shop]);

  const closeShiftFlow = useCallback(async () => {
    if (!shift || !shift.id) {
      setGlobalError('No hay turno activo para cerrar');
      return;
    }
    orders.setLoading(true);
    try {
      const res = await fetch('/api/admin/shifts', {
        method: 'PATCH',
        headers: adminHeaders(pin),
        body: JSON.stringify({ id: shift.id }),
      });
      if (!res.ok) throw new Error('No se pudo cerrar el turno');
      await fetch('/api/admin/shop', {
        method: 'PATCH',
        headers: adminHeaders(pin),
        body: JSON.stringify({ isOpen: false }),
      });
      await loadBalance(pin);
      await shop.loadShop(pin);
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Error');
    } finally {
      orders.setLoading(false);
    }
  }, [shift, pin, loadBalance, shop]);

  const recordExpense = useCallback(async (amount: number, description: string) => {
    orders.setLoading(true);
    try {
      const res = await fetch('/api/admin/expenses', {
        method: 'POST',
        headers: adminHeaders(pin),
        body: JSON.stringify({
          amount: Math.round(amount),
          description: description.trim(),
          shiftId: shift?.id,
        }),
      });
      if (!res.ok) throw new Error('No se pudo registrar gasto');
      await loadBalance(pin);
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Error');
    } finally {
      orders.setLoading(false);
    }
  }, [shift, pin, loadBalance]);

  const sendReport = useCallback(async () => {
    if (!shift || !shift.id) {
      setGlobalError('No hay turno para reportar');
      return;
    }
    setSendingReport(true);
    try {
      const res = await fetch('/api/admin/report', {
        method: 'POST',
        headers: adminHeaders(pin),
        body: JSON.stringify({ shiftId: shift.id }),
      });
      if (!res.ok) {
        const bodyText = await res.text();
        throw new Error('No se pudo enviar el reporte: ' + bodyText);
      }
      setGlobalError('Reporte enviado correctamente');
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Error');
    } finally {
      setSendingReport(false);
    }
  }, [shift, pin]);

  // Debounce search
  useEffect(() => {
    if (!authed || !pin) return;
    const t = setTimeout(() => setSearchQuery(searchInput), 400);
    return () => clearTimeout(t);
  }, [searchInput, authed, pin]);

  useEffect(() => {
    if (!authed || !pin) return;
    if (searchQuery.trim().length >= 2) {
      orders.loadOrders(pin, { q: searchQuery }).catch(() => {});
      return;
    }
    if (searchInput.trim().length === 0) {
      orders.loadOrders(pin, { filter: tab }).catch(() => {});
    }
  }, [searchQuery, tab, authed, pin, orders.loadOrders, searchInput]);

  async function login() {
    orders.setLoading(true);
    try {
      alerts.initAlerts();
      await shop.loadShop(pin);
      await orders.loadOrders(pin, { filter: tab });
      setAuthed(true);
      setGlobalError('');
    } catch (e) {
      setGlobalError(e instanceof Error ? e.message : 'Error');
    } finally {
      orders.setLoading(false);
    }
  }

  const handleOrderStatusChange = useCallback(
    (orderId: string, status: OrderStatus) => {
      orders.updateOrderStatus(orderId, status, setTab);
    },
    [orders],
  );

  const handleRefresh = useCallback(() => {
    orders.refresh(async () => shop.loadShop(pin));
  }, [orders, shop, pin]);

  // ── Login screen ──────────────────────────────────────────
  if (!authed) {
    return (
      <AdminLoginScreen
        pin={pin}
        onPinChange={setPin}
        onLogin={login}
        loading={orders.loading}
        error={globalError}
      />
    );
  }

  // ── Main panel ────────────────────────────────────────────
  return (
    <div className="mx-auto flex min-h-dvh max-w-7xl flex-col gap-6 px-4 pb-10 pt-6 lg:px-8 relative z-10">
      <header className="text-center mb-4">
        <h1 className="font-display text-3xl md:text-4xl text-fire">
          Callejero Administrador
        </h1>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={orders.loading}
          className="mt-2 text-xs md:text-sm text-smoke underline hover:text-cream transition cursor-pointer"
        >
          {orders.loading ? 'Actualizando…' : '🔄 Actualizar panel'}
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Columna Izquierda: Gestión de Turno y Preferencias */}
        <div className="lg:col-span-5 space-y-6 lg:sticky lg:top-6 lg:max-h-[calc(100vh-3rem)] lg:overflow-y-auto scrollbar-thin">
          <StoreShiftManager
            isOpen={shop.isOpen}
            shift={shift}
            totals={totals}
            transactions={transactions}
            sendingReport={sendingReport}
            loading={orders.loading}
            pin={pin}
            toggleShop={shop.toggleShop}
            closeShiftFlow={closeShiftFlow}
            openShiftFlow={openShiftFlow}
            recordExpense={recordExpense}
            sendReport={sendReport}
            loadBalance={loadBalance}
          />

          <AlertSettings
            soundOn={alerts.soundOn}
            setSoundOn={alerts.handleSoundToggle}
            pushOn={alerts.pushOn}
            setPushOn={alerts.handlePushToggle}
            pushPermission={alerts.pushPermission}
            enablePush={alerts.enablePush}
            testAlertSound={alerts.testAlertSound}
          />
        </div>

        {/* Columna Derecha: Búsqueda y Pedidos */}
        <OrdersPanel
          tab={tab}
          onTabChange={setTab}
          orders={orders.orders}
          busyId={orders.busyId}
          loading={orders.loading}
          error={orders.error || globalError}
          searchInput={searchInput}
          searchQuery={searchQuery}
          isSearching={isSearching}
          latestNewOrder={alerts.latestNewOrder}
          onSearchChange={setSearchInput}
          onClearSearch={() => { setSearchInput(''); setSearchQuery(''); }}
          onStatusChange={handleOrderStatusChange}
          onCloseLatestAlert={() => alerts.setLatestNewOrder(null)}
        />
      </div>

      <div className="mt-8 border-t border-white/5 pt-4 text-center">
        <a href="/" className="text-sm text-smoke hover:text-cream underline transition">
          ← Ir al menú de clientes
        </a>
      </div>

      <EmberBackground />
    </div>
  );
}
