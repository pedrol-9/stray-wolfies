import type { APIRoute } from 'astro';
import { checkAdminPin, unauthorized } from '../../../lib/admin-auth';
import { getSupabaseAdmin } from '../../../lib/supabase-admin';

export const prerender = false;

export const GET: APIRoute = async ({ request }) => {
  if (!checkAdminPin(request)) return unauthorized();
  try {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('shop_settings')
      .select('is_open, updated_at')
      .eq('id', 1)
      .single();
    if (error) throw error;
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};

export const PATCH: APIRoute = async ({ request }) => {
  if (!checkAdminPin(request)) return unauthorized();
  try {
    const { isOpen } = (await request.json()) as { isOpen: boolean };
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase
      .from('shop_settings')
      .update({ is_open: isOpen, updated_at: new Date().toISOString() })
      .eq('id', 1)
      .select('is_open, updated_at')
      .single();
    if (error) throw error;
    return new Response(JSON.stringify(data), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Error';
    return new Response(JSON.stringify({ error: msg }), { status: 500 });
  }
};
