/**
 * Acepta nombres del dashboard de Supabase (SUPABASE_URL / SUPABASE_KEY)
 * y los de Astro (PUBLIC_SUPABASE_URL / PUBLIC_SUPABASE_ANON_KEY).
 */
export function getSupabaseUrl(): string | undefined {
  return (
    import.meta.env.PUBLIC_SUPABASE_URL ??
    import.meta.env.SUPABASE_URL
  );
}

export function getSupabaseAnonKey(): string | undefined {
  return (
    import.meta.env.PUBLIC_SUPABASE_ANON_KEY ??
    import.meta.env.SUPABASE_KEY
  );
}

export function getSupabaseServiceRoleKey(): string | undefined {
  return import.meta.env.SUPABASE_SERVICE_ROLE_KEY;
}
