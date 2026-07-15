/**
 * Auth domain service — the single source of truth for authentication.
 *
 * Registration pipeline (transactional in intent):
 *   Supabase Auth → users → organizations (B2B only) → memberships (B2B only)
 *
 * Security model:
 *  - Supabase Auth owns credentials and sessions.
 *  - RLS in Supabase is the real authorization boundary.
 *  - This service never trusts client-provided roles; the role and status are
 *    always read back from the `users` table after authentication.
 */
import { supabase } from '@/core/db/dbClient';
import { calcularScoreEstimado } from '@/core/domain/auth/types';
import { POLITICA_VERSION } from '@/core/domain/legal/politica';
import { MFA_ENFORCEMENT_ENABLED, MFA_ENFORCED_ROLES } from '@/core/config/mfaConfig';
import { checkAssuranceLevel, listFactors, challengeAndVerify } from '@/core/domain/auth/mfaService';
import type {
  LoginInput,
  LoginResult,
  RegisterB2BInput,
  RegisterB2CInput,
  RegisterAdminMasterInput,
  RegisterResult,
  RestoreResult,
  PasswordResetResult,
  AuthSession,
} from '@/core/domain/auth/types';

// ───── Role / route helpers ─────

const ROLE_ROUTES: Record<string, string> = {
  Cliente: '/portal',
  Admin: '/admin',
  Comercio: '/comercios',
  Constructora: '/constructoras',
  Banco: '/banca',
  Fiduciaria: '/admin',
};

function dashboardRouteForRole(role: string): string {
  return ROLE_ROUTES[role] ?? '/';
}

function errMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return fallback;
}

/**
 * Translates a Postgres unique_violation (SQLSTATE 23505) on `nit` or
 * `numero_documento` into a friendly Spanish message. Returns `null` when
 * the error isn't a recognized unique-constraint violation on those columns,
 * so callers fall back to {@link errMessage}.
 */
function friendlyDuplicateMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object') return null;
  const code = 'code' in error ? (error as { code?: unknown }).code : undefined;
  if (code !== '23505') return null;
  const message = 'message' in error ? (error as { message?: unknown }).message : undefined;
  const msg = typeof message === 'string' ? message : '';
  if (msg.includes('numero_documento')) return 'Esta cédula/documento ya está registrado en el ecosistema.';
  if (msg.includes('nit')) return 'Este NIT ya está registrado en el ecosistema.';
  if (msg.includes('email')) return 'Este correo ya está registrado.';
  return 'Ya existe un registro con estos datos.';
}

// ───── Last-login session hand-off ─────
// The service establishes the session, then stashes a snapshot so the auth
// store can pick it up synchronously right after a successful call.

let lastLoginSession: AuthSession | null = null;

export function getLastLoginSession(): AuthSession | null {
  return lastLoginSession;
}

export function clearLastLoginSession(): void {
  lastLoginSession = null;
}

// ───── Session resolution ─────

/** Resolves the active organization id for a user from their memberships. */
async function resolveOrganizationId(userId: string): Promise<string | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('memberships')
    .select('organization_id, is_active')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);
  if (error || !data || data.length === 0) return null;
  return data[0].organization_id ?? null;
}

interface UserRecord {
  id: string;
  email: string;
  rol: string;
  status: string | null;
}

/** Reads the `users` row for an authenticated user id. */
async function fetchUserRecord(userId: string): Promise<UserRecord | null> {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('users')
    .select('id, email, rol, status')
    .eq('id', userId)
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return data as UserRecord;
}

/**
 * Builds an {@link AuthSession} from an authenticated user id, reading the role
 * from the `users` table (never from the client).
 */
async function buildSession(userId: string, email: string): Promise<AuthSession | null> {
  const record = await fetchUserRecord(userId);
  const role = record?.rol ?? 'Cliente';
  const organizationId = await resolveOrganizationId(userId);
  return {
    userId,
    email: record?.email ?? email,
    role,
    organizationId,
    dashboardRoute: dashboardRouteForRole(role),
  };
}

// ───── Login ─────

export async function login(input: LoginInput): Promise<LoginResult> {
  if (!supabase) {
    return { success: false, error: 'Base de datos no configurada.' };
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    return {
      success: false,
      error: errMessage(error, 'Credenciales inválidas.'),
    };
  }

  const record = await fetchUserRecord(data.user.id);

  // Gate access by approval status. B2C clients are auto-approved on register.
  const status = record?.status ?? null;
  if (status === 'pending_approval' || status === 'pendiente') {
    await supabase.auth.signOut();
    return { success: false, pendingApproval: true };
  }
  if (status === 'rejected' || status === 'rechazado') {
    await supabase.auth.signOut();
    return { success: false, rejected: true };
  }

  const session = await buildSession(data.user.id, data.user.email ?? input.email);

  // MFA_ENFORCEMENT_ENABLED gate — password ya fue verificado (aal1) y la
  // sesión de Supabase ya existe; si el rol lo exige y hay un factor TOTP
  // verificado, el login no se considera completo hasta que se resuelva el
  // challenge vía completeMfaChallenge(). No se cierra la sesión: el aal1 se
  // necesita para poder llamar mfa.challenge/verify.
  if (MFA_ENFORCEMENT_ENABLED && session && (MFA_ENFORCED_ROLES as readonly string[]).includes(session.role)) {
    const { currentLevel, nextLevel } = await checkAssuranceLevel();
    if (nextLevel === 'aal2' && currentLevel === 'aal1') {
      const { factors } = await listFactors();
      const verifiedFactor = factors.find((f) => f.status === 'verified');
      if (verifiedFactor) {
        return { success: false, requiresMfaChallenge: true, mfaFactorId: verifiedFactor.id };
      }
    }
  }

  lastLoginSession = session;

  // Best-effort last-login timestamp; ignore failures (RLS may restrict it).
  void supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id);

  return {
    success: true,
    userId: data.user.id,
    role: session?.role,
    dashboardRoute: session?.dashboardRoute,
  };
}

/** Completa un login que quedó pendiente de MFA — verifica el código TOTP
 * contra el factor ya inscrito y, si es correcto, termina de construir la
 * sesión exactamente igual que login(). */
export async function completeMfaChallenge(factorId: string, code: string): Promise<LoginResult> {
  if (!supabase) return { success: false, error: 'Base de datos no configurada.' };

  const { error } = await challengeAndVerify(factorId, code);
  if (error) return { success: false, error };

  const { data } = await supabase.auth.getUser();
  if (!data.user) return { success: false, error: 'No se pudo verificar la sesión.' };

  const session = await buildSession(data.user.id, data.user.email ?? '');
  lastLoginSession = session;

  void supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id);

  return {
    success: true,
    userId: data.user.id,
    role: session?.role,
    dashboardRoute: session?.dashboardRoute,
  };
}

// ───── Logout ─────

export async function logout(): Promise<void> {
  lastLoginSession = null;
  if (!supabase) return;
  await supabase.auth.signOut();
}

// ───── Restore session ─────

export async function restoreSession(): Promise<RestoreResult> {
  if (!supabase) return { success: false };

  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.user) {
    return { success: false };
  }

  const user = data.session.user;
  const record = await fetchUserRecord(user.id);

  // Do not restore sessions for accounts that are not allowed to log in.
  const status = record?.status ?? null;
  if (status === 'pending_approval' || status === 'pendiente' ||
      status === 'rejected' || status === 'rechazado') {
    await supabase.auth.signOut();
    return { success: false };
  }

  const session = await buildSession(user.id, user.email ?? '');
  lastLoginSession = session;
  return { success: true, userId: user.id };
}

// ───── Registration: B2B ─────

export async function registerB2B(input: RegisterB2BInput): Promise<RegisterResult> {
  if (!supabase) {
    return { success: false, error: 'Base de datos no configurada.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    return { success: false, error: errMessage(error, 'No se pudo crear la cuenta.') };
  }

  const userId = data.user.id;
  const requiresEmailConfirmation = !data.session;

  // Registro atómico — users + organizations + memberships + aceptación de
  // política, todo o nada, en una sola función SECURITY DEFINER. Reemplaza
  // los 4 INSERTs sueltos con tolerancia silenciosa que causaban cuentas
  // medio creadas (caso real: usuario con organización pero sin membership).
  // Si no hay sesión (correo pendiente de confirmar), la función misma lo
  // rechaza con un mensaje claro en vez de fallar en silencio.
  const { error: rpcError } = await supabase.rpc('registrar_b2b_completo', {
    p_razon_social: input.razonSocial,
    p_nit: input.nit,
    p_email: input.email,
    p_representante: input.representante,
    p_telefono: input.telefono,
    p_sector: input.sector,
    p_politica_version: POLITICA_VERSION,
  });

  if (rpcError) {
    return {
      success: false,
      error: friendlyDuplicateMessage(rpcError) ?? errMessage(rpcError, 'No se pudo completar el registro.'),
    };
  }

  return {
    success: true,
    userId,
    pendingApproval: true,
    requiresEmailConfirmation,
  };
}

// ───── Registration: B2C ─────

export async function registerB2C(input: RegisterB2CInput): Promise<RegisterResult> {
  if (!supabase) {
    return { success: false, error: 'Base de datos no configurada.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    return { success: false, error: errMessage(error, 'No se pudo crear la cuenta.') };
  }

  const userId = data.user.id;
  const requiresEmailConfirmation = !data.session;

  // Registro atómico — users + aceptación de política + productos bancarios
  // declarados, todo en una sola función SECURITY DEFINER. Los productos
  // bancarios ya NO son best-effort: si la función falla, todo el registro
  // falla visiblemente, sin importar en qué paso interno haya fallado.
  const { error: rpcError } = await supabase.rpc('registrar_b2c_completo', {
    p_nombres: input.nombres,
    p_apellidos: input.apellidos,
    p_tipo_id: input.tipoId,
    p_numero_id: input.numeroId,
    p_email: input.email,
    p_celular: input.celular,
    p_rango_ingresos: input.rangoIngresos,
    p_score_estimado: calcularScoreEstimado(input.rangoIngresos),
    p_politica_version: POLITICA_VERSION,
    p_banco_productos: input.bancoProductos,
  });

  if (rpcError) {
    return {
      success: false,
      error: friendlyDuplicateMessage(rpcError) ?? errMessage(rpcError, 'No se pudo completar el registro.'),
    };
  }

  return {
    success: true,
    userId,
    pendingApproval: false,
    requiresEmailConfirmation,
  };
}

// ───── Registration: Admin master (base account only) ─────

/**
 * Creates the BASE account for the platform master admin — email + password
 * only. This NEVER assigns `rol = 'Admin'`. It inserts the same neutral role
 * `registerB2C` uses (`rol: 'Cliente'`, `status: 'approved'`) so the account
 * can authenticate immediately but has zero elevated privileges. Promotion to
 * `rol = 'Admin'` is an out-of-band manual step (SQL in Supabase) — this
 * function has no path to grant it.
 */
export async function registerAdminMaster(
  input: RegisterAdminMasterInput,
): Promise<RegisterResult> {
  if (!supabase) {
    return { success: false, error: 'Base de datos no configurada.' };
  }

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    return { success: false, error: errMessage(error, 'No se pudo crear la cuenta.') };
  }

  const userId = data.user.id;
  const requiresEmailConfirmation = !data.session;

  const { error: userError } = await supabase.from('users').insert({
    id: userId,
    email: input.email,
    nombre: input.email,
    rol: 'Cliente',
    status: 'approved',
  });

  if (userError && !requiresEmailConfirmation) {
    return { success: false, error: errMessage(userError, 'No se pudo registrar el usuario.') };
  }

  return {
    success: true,
    userId,
    pendingApproval: false,
    requiresEmailConfirmation,
  };
}

// ───── Password reset ─────

export async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
  if (!supabase) {
    return { success: false, error: 'Base de datos no configurada.' };
  }
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/login-ecosistema` : undefined;
  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
  if (error) {
    return { success: false, error: errMessage(error, 'No se pudo enviar el correo.') };
  }
  return { success: true };
}
