import { useCallback, useEffect, useRef, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';
import type { AdminOrder, OrderStatus } from '../types/admin-order';

type Tab = 'incoming' | 'production' | 'dispatched';

function adminHeaders(pin: string): HeadersInit {
  return { 'x-admin-pin': pin, 'Content-Type': 'application/json' };
}

interface UseAdminOrdersOptions {
  authed: boolean;
  pin: string;
  tab: Tab;
  searchQuery: string;
  isSearching: boolean;
  onNewOrders?: (orders: AdminOrder[]) => void;
}

export function useAdminOrders({
  authed,
  pin,
  tab,
  searchQuery,
  isSearching,
  onNewOrders,
}: UseAdminOrdersOptions) {
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadOrders = useCallback(
    async (adminPin: string, opts: { filter?: Tab; q?: string }) => {
      const params = new URLSearchParams();
      if (opts.q && opts.q.trim().length >= 2) {
        params.set('q', opts.q.trim());
      } else {
        params.set('filter', opts.filter ?? 'incoming');
      }
      const res = await fetch(`/api/admin/orders?${params}`, {
        headers: adminHeaders(adminPin),
      });
      if (!res.ok) throw new Error('No se pudieron cargar pedidos');
      const data = await res.json();
      const fetched: AdminOrder[] = data.orders ?? [];
      setOrders(fetched);
      return fetched;
    },
    [],
  );

  const refresh = useCallback(
    async (loadShop: () => Promise<void>) => {
      if (!pin) return;
      setLoading(true);
      try {
        await loadShop();
        await loadOrders(pin, isSearching ? { q: searchQuery } : { filter: tab });
        setError('');
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
      } finally {
        setLoading(false);
      }
    },
    [pin, tab, searchQuery, isSearching, loadOrders],
  );

  const updateOrderStatus = useCallback(
    async (
      orderId: string,
      status: OrderStatus,
      onTabChange: (tab: Tab) => void,
    ) => {
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
          onTabChange('dispatched');
          await loadOrders(pin, { filter: 'dispatched' });
        } else if (status === 'preparing') {
          onTabChange('production');
          await loadOrders(pin, { filter: 'production' });
        } else {
          await loadOrders(pin, { filter: 'incoming' });
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Error');
      } finally {
        setBusyId(null);
      }
    },
    [pin, isSearching, searchQuery, loadOrders],
  );

  // Realtime: actualizaciones y eliminaciones de pedidos
  useEffect(() => {
    if (!authed || !pin) return;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('orders-changes')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'orders' },
        () => {
          if (!isSearching) {
            loadOrders(pin, { filter: tab }).catch(() => {});
          }
        },
      )
      .on(
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'orders' },
        () => {
          if (!isSearching) {
            loadOrders(pin, { filter: tab }).catch(() => {});
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authed, pin, tab, isSearching, loadOrders]);

  // Realtime: nuevos pedidos (INSERT)
  useEffect(() => {
    if (!authed || !pin || isSearching) return;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('orders-new')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'orders' },
        (payload) => {
          const newOrder = payload.new as AdminOrder;
          if (newOrder && newOrder.status === 'placed') {
            onNewOrders?.([newOrder]);
            if (tab === 'incoming') {
              loadOrders(pin, { filter: 'incoming' }).catch(() => {});
            }
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authed, pin, isSearching, tab, loadOrders, onNewOrders]);

  return {
    orders,
    busyId,
    error,
    setError,
    loading,
    setLoading,
    loadOrders,
    refresh,
    updateOrderStatus,
  };
}
