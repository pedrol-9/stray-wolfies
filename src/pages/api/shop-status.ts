import type { APIRoute } from 'astro';
import { SCHEDULE_LABEL } from '../../lib/constants';
import { isWithinUsualSchedule } from '../../lib/shop-hours';
import { getSupabaseAdmin } from '../../lib/supabase-admin';

export const prerender = false;

export const GET: APIRoute = async () => {
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('shop_settings')
      .select('is_open, updated_at')
      .eq('id', 1)
      .single();

    if (error) throw error;

    const isOpen = data?.is_open ?? false;
    const withinSchedule = isWithinUsualSchedule();

    return new Response(
      JSON.stringify({
        isOpen,
        acceptingOrders: isOpen,
        withinSchedule,
        scheduleLabel: SCHEDULE_LABEL,
        message: isOpen
          ? 'Estamos recibiendo pedidos.'
          : 'Por ahora no recibimos pedidos. Vuelve pronto.',
        updatedAt: data?.updated_at,
      }),
      { headers: { 'Content-Type': 'application/json' } },
    );
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error desconocido';
    return new Response(JSON.stringify({ error: msg, acceptingOrders: false }), {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
