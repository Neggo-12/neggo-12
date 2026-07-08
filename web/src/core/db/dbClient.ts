/**
 * DB Client — the single Supabase client instance for the whole app.
 *
 * This is the ONE place a Supabase client is created. Every other module
 * (repositories, auth service, supabaseClient helpers) must import the client
 * from here to guarantee a single source of truth.
 *
 * Security note: this client uses the public anon key. Row-Level Security (RLS)
 * policies in Supabase are the real security boundary. Repositories only apply
 * UX-level filters on top of what RLS already permits.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '@/integrations/supabase/types';
import {
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  isSupabaseEnvConfigured,
} from '@/core/infrastructure/env';

/** True when the Supabase credentials are present in the environment. */
export const isDbConfigured: boolean = isSupabaseEnvConfigured;

/**
 * The shared Supabase client. `null` when credentials are missing so the app
 * can render real empty states instead of crashing.
 */
export const supabase: SupabaseClient<Database> | null = isDbConfigured
  ? createClient<Database>(SUPABASE_URL, SUPABASE_ANON_KEY, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
      },
    })
  : null;

/**
 * Returns the client or throws when Supabase is not configured. Use inside
 * code paths already guarded by {@link isDbConfigured}.
 */
export function getDb(): SupabaseClient<Database> {
  if (!supabase) {
    throw new Error('Supabase no está configurado. Faltan las credenciales de entorno.');
  }
  return supabase;
}
