import type { APIRoute } from 'astro';
import { checkAdminPin, unauthorized } from '../../../lib/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';

export const prerender = false;

export const GET: APIRoute = async ({ request, url }) => {
  if (!checkAdminPin(request)) return unauthorized();
  try {
    const supabase = getSupabaseAdmin();
    const { data: shifts, error: shiftErr } = await supabase
      .from('shifts')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1);

    if (shiftErr) throw shiftErr;
    const shift = shifts && shifts.length > 0 ? shifts[0] : null;

    if (!shift) {
      return new Response(JSON.stringify({ shift: null }), { headers: { 'Content-Type': 'application/json' } });
    }

    // fetch transactions for this shift
    const { data: txs } = await supabase
      .from('cash_transactions')
      .select('id, shift_id, type, amount, description, created_at, order_id')
      .eq('shift_id', shift.id)
      .order('created_at', { ascending: true });

    const txsFor = txs || [];
    const totals = txsFor.reduce(
      (acc: any, t: any) => {
        if (t.type === 'base') acc.base += t.amount || 0;
        if (t.type === 'income') acc.income += t.amount || 0;
        if (t.type === 'expense') acc.expense += t.amount || 0;
        return acc;
      },
      { base: 0, income: 0, expense: 0 },
    );

    return new Response(JSON.stringify({ shift, totals, transactions: txsFor }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminPin(request)) return unauthorized();
  try {
    const body = (await request.json()) as { baseAmount?: number };
    const baseAmount = Number(body.baseAmount) || 0;
    if (isNaN(baseAmount) || baseAmount < 0) {
      return new Response(JSON.stringify({ error: 'Monto base inválido' }), { status: 400 });
    }

    const supabase = getSupabaseAdmin();

    // Check if there is already an open shift (use array, never .single())
    const { data: openShifts } = await supabase
      .from('shifts')
      .select('*')
      .eq('status', 'open')
      .order('opened_at', { ascending: false })
      .limit(1);

    const existing = openShifts && openShifts.length > 0 ? openShifts[0] : null;

    if (existing) {
      return new Response(
        JSON.stringify({ error: 'Ya hay un turno abierto. Ciérralo antes de abrir uno nuevo.', shift: existing }),
        { status: 409, headers: { 'Content-Type': 'application/json' } },
      );
    }

    const { data: inserted, error: shiftError } = await supabase
      .from('shifts')
      .insert({ base_amount: baseAmount })
      .select('*');
    if (shiftError) throw shiftError;
    const newShift = inserted && inserted.length > 0 ? inserted[0] : null;
    if (!newShift) throw new Error('No se pudo crear el turno');

    // create base transaction
    const { error: txError } = await supabase.from('cash_transactions').insert({
      shift_id: newShift.id,
      type: 'base',
      amount: baseAmount,
      description: 'Monto base al abrir tienda',
      created_by: null,
    });
    if (txError) console.error('Error inserting base transaction', txError.message || txError);

    return new Response(JSON.stringify({ shift: newShift }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!checkAdminPin(request)) return unauthorized();
  try {
    const body = (await request.json()) as { id?: string };
    const shiftId = body.id;
    if (!shiftId) return new Response(JSON.stringify({ error: 'shift id required' }), { status: 400 });

    const supabase = getSupabaseAdmin();
    const { data: updated, error: closeError } = await supabase
      .from('shifts')
      .update({ closed_at: new Date().toISOString(), status: 'closed' })
      .eq('id', shiftId)
      .select('*');
    if (closeError) throw closeError;
    const closedShift = updated && updated.length > 0 ? updated[0] : null;

    // compute totals for the closed shift
    const { data: txs } = await supabase
      .from('cash_transactions')
      .select('type, amount')
      .eq('shift_id', shiftId);

    const totals = (txs || []).reduce(
      (acc: any, t: any) => {
        if (t.type === 'base') acc.base += t.amount || 0;
        if (t.type === 'income') acc.income += t.amount || 0;
        if (t.type === 'expense') acc.expense += t.amount || 0;
        return acc;
      },
      { base: 0, income: 0, expense: 0 },
    );

    return new Response(JSON.stringify({ shift: closedShift, totals }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
