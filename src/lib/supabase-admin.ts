import { createClient } from '@supabase/supabase-js';
import { getSupabaseServiceRoleKey, getSupabaseUrl } from './env';

/** Cliente servidor — guarda pedidos y abre/cierra tienda. Requiere service_role. */
export function getSupabaseAdmin() {
  const url = getSupabaseUrl();
  const key = getSupabaseServiceRoleKey();
  if (!url || !key) {
    throw new Error(
      'Faltan URL de Supabase y SUPABASE_SERVICE_ROLE_KEY en .env (Project Settings → API → service_role).',
    );
  }
  return createClient(url, key, { auth: { persistSession: false } });
}
