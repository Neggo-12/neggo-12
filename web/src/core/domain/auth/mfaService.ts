/**
 * MFA (TOTP) service — thin wrapper over supabase.auth.mfa.*.
 * UI-agnostic; used both by the "Seguridad" enroll screen and by the login
 * challenge step. Gated at the call sites by MFA_ENFORCEMENT_ENABLED — this
 * file itself has no knowledge of the flag.
 */
import { supabase } from '@/core/db/dbClient';

function mfaErrMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') return m;
  }
  return 'Error desconocido al procesar la solicitud de MFA.';
}

export interface EnrollTotpResult {
  factorId: string | null;
  qrCode: string | null;
  secret: string | null;
  error: string | null;
}

/** Inicia la inscripción de un factor TOTP. Devuelve el QR (data URI SVG) y el secreto para entrada manual. */
export async function enrollTotp(): Promise<EnrollTotpResult> {
  if (!supabase) return { factorId: null, qrCode: null, secret: null, error: 'Base de datos no configurada.' };
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp' });
  if (error || !data) {
    return { factorId: null, qrCode: null, secret: null, error: error ? mfaErrMessage(error) : 'No se pudo iniciar la inscripción.' };
  }
  return { factorId: data.id, qrCode: data.totp.qr_code, secret: data.totp.secret, error: null };
}

export interface MfaFactor {
  id: string;
  status: string;
}

/** Lista los factores TOTP del usuario autenticado (pendientes y verificados). */
export async function listFactors(): Promise<{ factors: MfaFactor[]; error: string | null }> {
  if (!supabase) return { factors: [], error: 'Base de datos no configurada.' };
  const { data, error } = await supabase.auth.mfa.listFactors();
  if (error || !data) return { factors: [], error: error ? mfaErrMessage(error) : 'No se pudieron cargar los factores.' };
  return { factors: data.totp.map((f) => ({ id: f.id, status: f.status })), error: null };
}

export async function unenrollFactor(factorId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Base de datos no configurada.' };
  const { error } = await supabase.auth.mfa.unenroll({ factorId });
  return { error: error ? mfaErrMessage(error) : null };
}

/** Genera un challenge y lo verifica contra el código TOTP — usado tanto para
 * confirmar un enroll nuevo como para el paso de verificación en el login. */
export async function challengeAndVerify(factorId: string, code: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: 'Base de datos no configurada.' };
  const { data: challengeData, error: challengeError } = await supabase.auth.mfa.challenge({ factorId });
  if (challengeError || !challengeData) {
    return { error: challengeError ? mfaErrMessage(challengeError) : 'No se pudo generar el desafío.' };
  }
  const { error: verifyError } = await supabase.auth.mfa.verify({
    factorId,
    challengeId: challengeData.id,
    code,
  });
  return { error: verifyError ? mfaErrMessage(verifyError) : null };
}

export interface AssuranceLevel {
  currentLevel: string | null;
  nextLevel: string | null;
}

/** currentLevel === nextLevel === 'aal2' significa que el usuario ya pasó el desafío MFA en esta sesión. */
export async function checkAssuranceLevel(): Promise<AssuranceLevel> {
  if (!supabase) return { currentLevel: null, nextLevel: null };
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  if (error || !data) return { currentLevel: null, nextLevel: null };
  return { currentLevel: data.currentLevel, nextLevel: data.nextLevel };
}
