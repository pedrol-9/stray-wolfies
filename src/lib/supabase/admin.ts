import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from '../env';

let _adminClient: SupabaseClient | null = null;

/** Cliente servidor con service_role — bypasa RLS. Singleton para evitar múltiples instancias. */
export function getSupabaseAdmin(): SupabaseClient {
  if (_adminClient) return _adminClient;
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      'Faltan URL de Supabase y SUPABASE_SERVICE_ROLE_KEY en .env (Project Settings → API → service_role).',
    );
  }
  _adminClient = createClient(url, key, { auth: { persistSession: false } });
  return _adminClient;
}
