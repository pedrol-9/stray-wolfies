/**
 * Re-export para coincidir con la ruta sugerida por Supabase (`src/db/supabase`).
 * En Callejeros los pedidos pasan por `/api/orders` con service role en servidor.
 */
export { getSupabaseClient, supabase } from '../lib/supabase-client';
