import type { APIRoute } from 'astro';
import { checkAdminPin, unauthorized } from '../../../lib/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';

export const prerender = false;

export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminPin(request)) return unauthorized();
  try {
    const body = (await request.json()) as { amount?: number; description?: string; shiftId?: string };
    const amount = Number(body.amount);
    const description = (body.description || '').trim();
    if (isNaN(amount) || amount <= 0) {
      return new Response(JSON.stringify({ error: 'Monto inválido' }), { status: 400 });
    }
    if (!description) {
      return new Response(JSON.stringify({ error: 'Descripción requerida' }), { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    let shiftId = body.shiftId;
    if (!shiftId) {
      const { data: openShifts } = await supabase
        .from('shifts')
        .select('id')
        .eq('status', 'open')
        .order('opened_at', { ascending: false })
        .limit(1);
      
      const shift = openShifts && openShifts.length > 0 ? openShifts[0] : null;
      if (!shift) {
        return new Response(JSON.stringify({ error: 'No hay turno activo' }), { status: 400 });
      }
      // @ts-ignore
      shiftId = (shift as any).id;
    }

    const { data: insertedTxs, error } = await supabase.from('cash_transactions').insert({
      shift_id: shiftId,
      type: 'expense',
      amount: Math.round(amount),
      description,
      created_by: null,
    }).select('*');

    if (error) throw error;
    const tx = insertedTxs && insertedTxs.length > 0 ? insertedTxs[0] : null;
    if (!tx) throw new Error('No se pudo registrar el gasto');

    return new Response(JSON.stringify({ transaction: tx }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
