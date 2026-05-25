import { createClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from './env';

/** Cliente público (publishable / anon). Solo operaciones permitidas por RLS. */
export function getSupabaseClient() {
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      'Faltan PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY (o SUPABASE_URL y SUPABASE_KEY) en .env',
    );
  }
  return createClient(url, key);
}

/** Alias compatible con la guía de Supabase */
export const supabase = getSupabaseClient;
