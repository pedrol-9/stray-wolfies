import type { APIRoute } from 'astro';
import { checkAdminPin, unauthorized } from '../../../lib/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';

const PARTNERS = ['ate.s.v55@gmail.com', 'spintot4s0@gmail.com'];
const BCC = 'psanabria999@gmail.com';

export const prerender = false;

function buildReportText(shift: any, totals: any, txs: any[]) {
  let lines: string[] = [];
  lines.push(`Reporte de caja — Turno ${shift.id}`);
  lines.push(`Abierto: ${shift.opened_at}`);
  if (shift.closed_at) lines.push(`Cerrado: ${shift.closed_at}`);
  lines.push('');
  lines.push(`Base: ${totals.base}`);
  lines.push(`Ingresos: ${totals.income}`);
  lines.push(`Gastos: ${totals.expense}`);
  lines.push(`Balance: ${totals.base + totals.income - totals.expense}`);
  lines.push('');
  lines.push('Transacciones:');
  txs.forEach(t => {
    lines.push(`${t.created_at} — ${t.type} — ${t.amount} — ${t.description || ''}`);
  });
  return lines.join('\n');
}

function buildReportHtml(shift: any, totals: any, txs: any[]) {
  const rows = txs.map(t => `<tr><td>${t.created_at}</td><td>${t.type}</td><td>${t.amount}</td><td>${t.description || ''}</td></tr>`).join('');
  return `
    <h2>Reporte de caja — Turno ${shift.id}</h2>
    <p>Abierto: ${shift.opened_at} ${shift.closed_at ? ' — Cerrado: ' + shift.closed_at : ''}</p>
    <ul>
      <li>Base: ${totals.base}</li>
      <li>Ingresos: ${totals.income}</li>
      <li>Gastos: ${totals.expense}</li>
      <li><strong>Balance: ${totals.base + totals.income - totals.expense}</strong></li>
    </ul>
    <table border="1" cellpadding="4" cellspacing="0">
      <thead><tr><th>Fecha</th><th>Tipo</th><th>Monto</th><th>Descripción</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
  `;
}

export const POST: APIRoute = async ({ request }) => {
  if (!checkAdminPin(request)) return unauthorized();
  try {
    const body = (await request.json()) as { shiftId?: string };
    const supabase = getSupabaseAdmin();

    let shiftId = body.shiftId;
    if (!shiftId) {
      const { data: latestShifts } = await supabase.from('shifts').select('*').order('opened_at', { ascending: false }).limit(1);
      const latest = latestShifts && latestShifts.length > 0 ? latestShifts[0] : null;
      if (!latest) return new Response(JSON.stringify({ error: 'No shift found' }), { status: 404 });
      // @ts-ignore
      shiftId = (latest as any).id;
    }

    const { data: matchedShifts } = await supabase.from('shifts').select('*').eq('id', shiftId).limit(1);
    const shift = matchedShifts && matchedShifts.length > 0 ? matchedShifts[0] : null;
    if (!shift) return new Response(JSON.stringify({ error: 'Shift not found' }), { status: 404 });

    const { data: txs } = await supabase.from('cash_transactions').select('*').eq('shift_id', shiftId).order('created_at', { ascending: true });

    const totals = (txs || []).reduce((acc: any, t: any) => {
      if (t.type === 'base') acc.base += t.amount || 0;
      if (t.type === 'income') acc.income += t.amount || 0;
      if (t.type === 'expense') acc.expense += t.amount || 0;
      return acc;
    }, { base: 0, income: 0, expense: 0 });

    const text = buildReportText(shift, totals, txs || []);
    const html = buildReportHtml(shift, totals, txs || []);

    const SENDGRID_KEY = import.meta.env.SENDGRID_API_KEY;
    const FROM = import.meta.env.MAIL_FROM || 'no-reply@stray-wolfies.local';

    if (!SENDGRID_KEY) {
      // If no API key configured, return the report for manual sending
      return new Response(JSON.stringify({ note: 'SENDGRID_API_KEY not configured. Returning report content.', text, html }), { headers: { 'Content-Type': 'application/json' } });
    }

    const payload = {
      personalizations: [
        {
          to: PARTNERS.map(email => ({ email })),
          bcc: [{ email: BCC }],
          subject: `Reporte de caja — Turno ${shiftId}`,
        },
      ],
      from: { email: FROM, name: 'Stray-Wolfies' },
      content: [
        { type: 'text/plain', value: text },
        { type: 'text/html', value: html },
      ],
    };

    const res = await fetch('https://api.sendgrid.com/v3/mail/send', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${SENDGRID_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      const bodyText = await res.text();
      console.error('SendGrid error', res.status, bodyText);
      return new Response(JSON.stringify({ error: 'Failed to send email', status: res.status, body: bodyText }), { status: 502 });
    }

    return new Response(JSON.stringify({ ok: true }), { headers: { 'Content-Type': 'application/json' } });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
