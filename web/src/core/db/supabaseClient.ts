/**
 * Supabase Client facade — re-exports the single client instance and provides
 * auth-adjacent helpers (config flag, password validation, duplicate checks).
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

/** Fields checked for duplicates before registration. */
export interface DuplicateCheckInput {
  email: string;
  /** Cédula (B2C) or NIT (B2B) — never phone, which is not unique. */
  documentNumber: string;
  /** Determines which column(s) get checked: 'cedula' → users.numero_documento;
   *  'nit' → users.nit AND organizations.nit. */
  documentType: 'cedula' | 'nit';
}

/**
 * Checks whether the given email or document number (cédula/NIT) already
 * exists. Phone is intentionally NOT checked — people change phone numbers
 * frequently, so it must never be treated as unique. Never throws — on any
 * error it returns `null` (fail-open for a non-security UX pre-check; RLS
 * remains the real boundary).
 */
export async function checkDuplicates(
  input: DuplicateCheckInput,
): Promise<'correo' | 'documento' | null> {
  if (!supabase) return null;
  const email = input.email.trim().toLowerCase();
  const documentNumber = input.documentNumber.trim();

  try {
    if (email) {
      const { data } = await supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .limit(1);
      if (data && data.length > 0) return 'correo';
    }
    if (documentNumber) {
      if (input.documentType === 'cedula') {
        const { data } = await supabase
          .from('users')
          .select('id')
          .eq('numero_documento', documentNumber)
          .limit(1);
        if (data && data.length > 0) return 'documento';
      } else {
        const [usersRes, orgsRes] = await Promise.all([
          supabase.from('users').select('id').eq('nit', documentNumber).limit(1),
          supabase.from('organizations').select('id').eq('nit', documentNumber).limit(1),
        ]);
        if ((usersRes.data && usersRes.data.length > 0) || (orgsRes.data && orgsRes.data.length > 0)) {
          return 'documento';
        }
      }
    }
  } catch {
    return null;
  }
  return null;
}
