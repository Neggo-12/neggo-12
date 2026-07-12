/**
 * Infrastructure — Environment configuration.
 *
 * Single source of truth for Supabase connection credentials. Values come
 * exclusively from Vite public env vars (`VITE_SUPABASE_URL`,
 * `VITE_SUPABASE_ANON_KEY`). No secrets are hardcoded here.
 */

/** Supabase project URL (empty string when not configured). */
export const SUPABASE_URL: string = import.meta.env.VITE_SUPABASE_URL ?? '';

/** Supabase anon/public key (empty string when not configured). */
export const SUPABASE_ANON_KEY: string = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

/**
 * True only when both the URL and the anon key are present. Consumers use this
 * to decide whether to attempt real DB/auth calls or render empty states.
 */
export const isSupabaseEnvConfigured: boolean =
  SUPABASE_URL.trim() !== '' && SUPABASE_ANON_KEY.trim() !== '';

/** Sentry DSN para monitoreo de errores (string vacío cuando no está configurado). */
export const SENTRY_DSN: string = import.meta.env.VITE_SENTRY_DSN ?? '';

/** True solo cuando hay un DSN de Sentry presente. */
export const isSentryConfigured: boolean = SENTRY_DSN.trim() !== '';
