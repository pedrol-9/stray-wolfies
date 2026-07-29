import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { getSupabaseAnonKey, getSupabaseUrl } from '../env';

let _client: SupabaseClient | null = null;

/** Cliente público (publishable / anon). Solo operaciones permitidas por RLS. */
export function getSupabaseClient(): SupabaseClient {
  if (_client) return _client;
  const url = getSupabaseUrl();
  const key = getSupabaseAnonKey();
  if (!url || !key) {
    throw new Error(
      'Faltan PUBLIC_SUPABASE_URL y PUBLIC_SUPABASE_ANON_KEY (o SUPABASE_URL y SUPABASE_KEY) en .env',
    );
  }
  _client = createClient(url, key);
  return _client;
}

/** Alias compatible con la guía de Supabase */
export const supabase = getSupabaseClient;
