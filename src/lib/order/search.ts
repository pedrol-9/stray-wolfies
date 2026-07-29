/** Limpia el término para búsqueda ilike en Supabase */
export function sanitizeSearchQuery(raw: string): string {
  return raw.trim().replace(/[%_,.]/g, ' ').replace(/\s+/g, ' ').slice(0, 80);
}

export function phoneDigitsForSearch(raw: string): string {
  return raw.replace(/\D/g, '').slice(0, 15);
}
