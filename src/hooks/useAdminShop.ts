import { useCallback, useEffect, useState } from 'react';
import { getSupabaseClient } from '../lib/supabase/client';

function adminHeaders(pin: string): HeadersInit {
  return { 'x-admin-pin': pin, 'Content-Type': 'application/json' };
}

interface UseAdminShopOptions {
  authed: boolean;
  pin: string;
}

export function useAdminShop({ authed, pin }: UseAdminShopOptions) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const loadShop = useCallback(async (adminPin: string) => {
    const res = await fetch('/api/admin/shop', {
      headers: adminHeaders(adminPin),
    });
    if (!res.ok) throw new Error('PIN incorrecto o sin configurar');
    const data = await res.json();
    setIsOpen(data.is_open);
  }, []);

  const toggleShop = useCallback(async () => {
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
  }, [pin, isOpen]);

  // Realtime: cambios en shop_settings
  useEffect(() => {
    if (!authed || !pin) return;
    const supabase = getSupabaseClient();
    const channel = supabase
      .channel('shop-status')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'shop_settings' },
        (payload) => {
          const data = payload.new as { is_open: boolean };
          if (data) setIsOpen(data.is_open);
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [authed, pin]);

  return {
    isOpen,
    setIsOpen,
    error,
    setError,
    loading,
    setLoading,
    loadShop,
    toggleShop,
  };
}
