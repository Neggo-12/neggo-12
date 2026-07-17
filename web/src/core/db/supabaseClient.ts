/**
 * Supabase Client facade — re-exports the single client instance and provides
 * auth-adjacent helpers (config flag, password validation).
 *
 * It intentionally re-exports from {@link dbClient} rather than creating a new
 * client, so there is only ever ONE Supabase client in the app.
 */
import { supabase, getDb, isDbConfigured } from '@/core/db/dbClient';

export { supabase, getDb };

/** Alias kept for auth/UI consumers that check whether Supabase is available. */
export const isSupabaseConfigured: boolean = isDbConfigured;

/** Result of {@link validatePassword}. */
export interface PasswordValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Validates a password against the platform policy:
 * minimum 8 characters, at least one uppercase letter, and at least one number.
 */
export function validatePassword(password: string): PasswordValidation {
  const errors: string[] = [];
  if (password.length < 8) {
    errors.push('La contraseña debe tener al menos 8 caracteres.');
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('La contraseña debe incluir al menos una mayúscula.');
  }
  if (!/[0-9]/.test(password)) {
    errors.push('La contraseña debe incluir al menos un número.');
  }
  return { isValid: errors.length === 0, errors };
}

