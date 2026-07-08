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
import type {
  LoginInput,
  LoginResult,
  RegisterB2BInput,
  RegisterB2CInput,
  RegisterResult,
  RestoreResult,
  PasswordResetResult,
  AuthSession,
  B2BSector,
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

const SECTOR_TO_ROLE: Record<B2BSector, string> = {
  banca: 'Banco',
  constructora: 'Constructora',
  comercio: 'Comercio',
};

const SECTOR_TO_ORG_TYPE: Record<B2BSector, string> = {
  banca: 'banco',
  constructora: 'constructora',
  comercio: 'comercio',
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

  const role = SECTOR_TO_ROLE[input.sector];

  const { data, error } = await supabase.auth.signUp({
    email: input.email,
    password: input.password,
  });

  if (error || !data.user) {
    return { success: false, error: errMessage(error, 'No se pudo crear la cuenta.') };
  }

  const userId = data.user.id;
  const requiresEmailConfirmation = !data.session;
  const nowIso = new Date().toISOString();

  // 1) users — the master user for the organization (pending admin approval).
  const { error: userError } = await supabase.from('users').insert({
    id: userId,
    email: input.email,
    nombre: input.razonSocial,
    rol: role,
    status: 'pending_approval',
    nit: input.nit,
    telefono: input.telefono,
    representante_legal: input.representante,
    tipo_entidad: input.sector,
  });

  // If the master user row could not be created and email is already usable,
  // surface the error. When email confirmation is pending, RLS may block the
  // insert until the user confirms — in that case we still report success.
  if (userError && !requiresEmailConfirmation) {
    return { success: false, error: errMessage(userError, 'No se pudo registrar el usuario.') };
  }

  // 2) organizations — the tenant entity.
  const organizationId = crypto.randomUUID();
  const { error: orgError } = await supabase.from('organizations').insert({
    id: organizationId,
    name: input.razonSocial,
    type: SECTOR_TO_ORG_TYPE[input.sector],
    nit: input.nit,
    telefono: input.telefono,
    email: input.email,
    representante_legal: input.representante,
    status: 'pending',
    created_at: nowIso,
  });

  // 3) memberships — link the master user to the organization.
  if (!orgError) {
    await supabase.from('memberships').insert({
      id: crypto.randomUUID(),
      user_id: userId,
      organization_id: organizationId,
      role,
      is_active: true,
    });
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

  // B2C clients are auto-approved and do not own an organization.
  const { error: userError } = await supabase.from('users').insert({
    id: userId,
    email: input.email,
    nombre: `${input.nombres} ${input.apellidos}`.trim(),
    first_name: input.nombres,
    last_name: input.apellidos,
    rol: 'Cliente',
    status: 'approved',
    telefono: input.celular,
    tipo_documento: input.tipoId,
    numero_documento: input.numeroId,
    preferences: { selectedBanks: input.selectedBanks },
  });

  if (userError && !requiresEmailConfirmation) {
    return { success: false, error: errMessage(userError, 'No se pudo registrar el cliente.') };
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
