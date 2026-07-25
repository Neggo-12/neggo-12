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

/** Result of {@link validateEmail}. */
export interface EmailValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Dominios de correo genéricos/gratuitos — no aceptados como "correo corporativo"
 * para el contexto 'corporativo' (Bancos y Constructoras deben registrarse con el
 * dominio real de su entidad, ej: gerente@bancolombia.co).
 */
const DOMINIOS_GENERICOS = new Set([
  'gmail.com',
  'hotmail.com',
  'outlook.com',
  'yahoo.com',
  'yahoo.es',
  'icloud.com',
  'live.com',
  'msn.com',
  'aol.com',
  'protonmail.com',
  'gmx.com',
]);

/** Regex de formato general — exige local@dominio.tld (con al menos un punto en el dominio). */
const EMAIL_FORMAT_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Valida el formato de un correo electrónico.
 *
 * @param email correo a validar.
 * @param contexto 'corporativo' exige que el dominio NO sea un webmail genérico
 *   (Bancos/Constructoras deben usar el dominio real de su entidad). 'general'
 *   (Comercios/Clientes B2C) solo exige formato válido.
 */
export function validateEmail(
  email: string,
  contexto: 'general' | 'corporativo' = 'general'
): EmailValidation {
  const errors: string[] = [];
  const trimmed = email.trim();

  if (!EMAIL_FORMAT_RE.test(trimmed)) {
    errors.push('Ingresa un correo electrónico válido (ej: nombre@dominio.com).');
    return { isValid: false, errors };
  }

  if (contexto === 'corporativo') {
    const dominio = trimmed.toLowerCase().split('@')[1] ?? '';
    if (DOMINIOS_GENERICOS.has(dominio)) {
      errors.push(
        'Usa el correo corporativo de tu entidad (ej: gerente@tuempresa.com), no un correo personal genérico.'
      );
    }
  }

  return { isValid: errors.length === 0, errors };
}

/** Result of {@link validatePhone}. */
export interface PhoneValidation {
  isValid: boolean;
  errors: string[];
}

/**
 * Valida un número de celular colombiano: 10 dígitos, debe iniciar en "3".
 * Acepta el prefijo internacional "+57"/"57" y espacios/guiones, que se limpian
 * antes de validar. Rechaza patrones obviamente falsos (todos los dígitos iguales,
 * ej: "1111111111" o "3000000000").
 */
export function validatePhone(phone: string): PhoneValidation {
  const errors: string[] = [];
  let digits = phone.replace(/[^0-9]/g, '');

  // Quitar el prefijo de país "57" si el número quedó con 12 dígitos (57 + 10).
  if (digits.length === 12 && digits.startsWith('57')) {
    digits = digits.slice(2);
  }

  if (digits.length !== 10) {
    errors.push('El celular debe tener 10 dígitos (ej: 300 123 4567).');
    return { isValid: false, errors };
  }

  if (!digits.startsWith('3')) {
    errors.push('El celular debe ser un número móvil colombiano válido (inicia en 3).');
    return { isValid: false, errors };
  }

  if (/^(\d)\1{9}$/.test(digits)) {
    errors.push('Ingresa un número de celular real, no una secuencia repetida.');
    return { isValid: false, errors };
  }

  return { isValid: true, errors };
}

