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
import { shouldDenyForMfa } from '@/core/domain/auth/mfaGuardRule';
import { logFalloApp } from '@/core/infrastructure/fallosApp';
import { identifyUser, resetIdentity } from '@/core/infrastructure/posthog';
import type {
  LoginInput,
  LoginResult,
  RegisterB2BInput,
  RegisterB2CInput,
  RegisterAdminMasterInput,
  RegisterResult,
  RestoreResult,
  PasswordResetResult,
  ConfirmPasswordResetResult,
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

const SECTOR_TO_ROLE: Record<string, string> = {
  banca: 'Banco',
  constructora: 'Constructora',
  comercio: 'Comercio',
};

/**
 * Nunca deja pasar un objeto serializado como si fuera un mensaje legible
 * (ej. "{}", "[object Object]", o vacío) — algunos errores de Supabase
 * llegan con `message` así de mal formado; en esos casos usa el fallback.
 */
function errMessage(error: unknown, fallback = 'Ocurrió un error inesperado.'): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    const trimmed = typeof msg === 'string' ? msg.trim() : '';
    if (trimmed !== '' && trimmed !== '{}' && trimmed !== '[object Object]') {
      return trimmed;
    }
  }
  return fallback;
}

/**
 * Translates a Postgres unique_violation (SQLSTATE 23505) on `nit` or
 * `numero_documento` into a friendly Spanish message. Returns `null` when
 * the error isn't a recognized unique-constraint violation on those columns,
 * so callers fall back to {@link errMessage}.
 */
export function friendlyDuplicateMessage(error: unknown): string | null {
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

/**
 * True cuando signUp() falló porque el correo ya tiene una cuenta en
 * auth.users. Puede ser una cuenta real ya usada, o una "cuenta fantasma"
 * (auth.users sin fila en public.users) dejada por un registro anterior cuyo
 * RPC falló — no podemos distinguir cuál desde el cliente ni borrar la
 * cuenta huérfana (requiere la Admin API), así que el mensaje cubre ambos casos.
 */
export function isAlreadyRegisteredError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = 'code' in error ? (error as { code?: unknown }).code : undefined;
  if (code === 'user_already_exists') return true;
  const message = 'message' in error ? (error as { message?: unknown }).message : undefined;
  return typeof message === 'string' && message.toLowerCase().includes('already registered');
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
    if (shouldDenyForMfa(currentLevel, nextLevel)) {
      const { factors } = await listFactors();
      const verifiedFactor = factors.find((f) => f.status === 'verified');
      if (verifiedFactor) {
        return { success: false, requiresMfaChallenge: true, mfaFactorId: verifiedFactor.id };
      }
    }
  }

  lastLoginSession = session;
  if (session) identifyUser(session.userId, { role: session.role });

  // Best-effort last-login timestamp — informativo, nunca debe fallar el login.
  const { data: lastLoginRows, error: lastLoginError } = await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id)
    .select('id');
  if (lastLoginError || !lastLoginRows || lastLoginRows.length === 0) {
    logFalloApp(
      'actualizar_last_login',
      lastLoginError ? errMessage(lastLoginError) : 'UPDATE afectó 0 filas (posible bloqueo de RLS).',
      lastLoginError,
    );
  }

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
  if (session) identifyUser(session.userId, { role: session.role });

  // Best-effort last-login timestamp — informativo, nunca debe fallar el login.
  const { data: lastLoginRows, error: lastLoginError } = await supabase
    .from('users')
    .update({ last_login_at: new Date().toISOString() })
    .eq('id', data.user.id)
    .select('id');
  if (lastLoginError || !lastLoginRows || lastLoginRows.length === 0) {
    logFalloApp(
      'actualizar_last_login',
      lastLoginError ? errMessage(lastLoginError) : 'UPDATE afectó 0 filas (posible bloqueo de RLS).',
      lastLoginError,
    );
  }

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
  resetIdentity();
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
  if (session) identifyUser(session.userId, { role: session.role });
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
    if (isAlreadyRegisteredError(error)) {
      return {
        success: false,
        error: 'Ya existe una cuenta con este correo. Si tu registro anterior no se completó, usa un correo distinto o contacta a soporte.',
      };
    }
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
    const message = friendlyDuplicateMessage(rpcError) ?? errMessage(rpcError, 'No se pudo completar el registro.');
    logFalloApp('registrar_b2b_completo', message, rpcError);
    // El registro falló pero signUp() ya dejó sesión activa — cerrarla para
    // que el usuario no quede atrapado como "cuenta fantasma" logueada sin
    // fila en public.users (causa raíz confirmada del bucle en
    // PoliticaAcceptanceGate). La cuenta de auth.users queda huérfana — no se
    // puede borrar desde el cliente, requiere la Admin API.
    await supabase.auth.signOut();
    return { success: false, error: message };
  }

  // Solo identifica si signUp() dejó una sesión activa (sin confirmación de
  // correo pendiente) — de lo contrario auth.uid() aún no existe.
  if (!requiresEmailConfirmation) {
    identifyUser(userId, { role: SECTOR_TO_ROLE[input.sector] ?? 'Cliente' });
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
    if (isAlreadyRegisteredError(error)) {
      return {
        success: false,
        error: 'Ya existe una cuenta con este correo. Si tu registro anterior no se completó, usa un correo distinto o contacta a soporte.',
      };
    }
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
    const message = friendlyDuplicateMessage(rpcError) ?? errMessage(rpcError, 'No se pudo completar el registro.');
    logFalloApp('registrar_b2c_completo', message, rpcError);
    // Ver comentario equivalente en registerB2B: nunca dejar sesión activa
    // tras un registro fallido, o el usuario queda atrapado como "cuenta
    // fantasma" en PoliticaAcceptanceGate.
    await supabase.auth.signOut();
    return { success: false, error: message };
  }

  // Solo identifica si signUp() dejó una sesión activa (sin confirmación de
  // correo pendiente) — de lo contrario auth.uid() aún no existe.
  if (!requiresEmailConfirmation) {
    identifyUser(userId, { role: 'Cliente' });
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

const PASSWORD_RESET_INFRA_ERROR = 'No pudimos procesar tu solicitud, intenta de nuevo.';

/**
 * SIEMPRE responde éxito cuando Supabase efectivamente respondió — nunca
 * revela si el correo existe o no (ni ningún otro detalle: rate limiting,
 * redirectTo mal configurado, etc.), para no permitir enumerar cuentas
 * reales. El único caso que se reporta como error real es que la solicitud
 * ni siquiera haya llegado a Supabase (sin conexión, Supabase caído). Los
 * errores que sí devuelve Supabase se registran para observabilidad interna
 * (fallos_app), nunca se muestran al usuario.
 */
export async function requestPasswordReset(email: string): Promise<PasswordResetResult> {
  if (!supabase) {
    return { success: false, error: PASSWORD_RESET_INFRA_ERROR };
  }
  const redirectTo =
    typeof window !== 'undefined' ? `${window.location.origin}/restablecer-password` : undefined;

  try {
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo });
    if (error) {
      logFalloApp('request_password_reset', errMessage(error), error);
    }
    return { success: true };
  } catch (err) {
    logFalloApp('request_password_reset', 'Excepción no controlada', err);
    return { success: false, error: PASSWORD_RESET_INFRA_ERROR };
  }
}

/**
 * Escucha el evento PASSWORD_RECOVERY que Supabase emite al procesar el link
 * de recuperación del correo (ver GoTrueClient.onAuthStateChange). Devuelve
 * la función de limpieza de la suscripción — llamar en el cleanup del efecto.
 */
export function onPasswordRecovery(callback: () => void): () => void {
  if (!supabase) return () => {};
  const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
    if (event === 'PASSWORD_RECOVERY') callback();
  });
  return () => subscription.unsubscribe();
}

/**
 * true si ya existe una sesión activa — red de seguridad para el caso donde
 * el evento PASSWORD_RECOVERY ya disparó antes de que el componente alcanzara
 * a suscribirse (detectSessionInUrl procesa el hash de la URL apenas se crea
 * el cliente, que puede ocurrir antes del primer render de React).
 */
export async function hasActiveSession(): Promise<boolean> {
  if (!supabase) return false;
  const { data } = await supabase.auth.getSession();
  return data.session !== null;
}

/**
 * Fija la nueva contraseña sobre la sesión de recuperación activa. Supabase
 * exige aal2 para cambiar la contraseña cuando la cuenta tiene MFA — la
 * sesión de recuperación por link de correo solo llega a aal1, así que
 * rechaza con `insufficient_aal` (mismo patrón que login(), arriba).
 */
export async function confirmPasswordReset(newPassword: string): Promise<ConfirmPasswordResetResult> {
  if (!supabase) {
    return { success: false, error: 'Base de datos no configurada.' };
  }
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) {
    const code = (error as { code?: string }).code;
    if (code === 'insufficient_aal') {
      const { factors } = await listFactors();
      const verifiedFactor = factors.find((f) => f.status === 'verified');
      if (verifiedFactor) {
        return { success: false, requiresMfaChallenge: true, mfaFactorId: verifiedFactor.id };
      }
    }
    return { success: false, error: errMessage(error, 'No se pudo actualizar la contraseña.') };
  }
  return { success: true };
}
