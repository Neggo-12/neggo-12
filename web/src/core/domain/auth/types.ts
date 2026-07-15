/**
 * Auth domain types — the public contract between the auth service and its
 * consumers (the auth store, login/register UI). These types are UI-agnostic
 * and carry no framework dependencies.
 */

/** B2B sector selected during organization registration. */
export type B2BSector = 'banca' | 'constructora' | 'comercio';

/** Credentials for a password login. */
export interface LoginInput {
  email: string;
  password: string;
}

/**
 * A resolved production session. `organizationId` is `null` for users that do
 * not belong to an organization (e.g. B2C clients, platform admins).
 */
export interface AuthSession {
  userId: string;
  email: string;
  role: string;
  organizationId: string | null;
  dashboardRoute: string;
}

/** Input for registering a B2B organization + its master user. */
export interface RegisterB2BInput {
  razonSocial: string;
  nit: string;
  email: string;
  representante: string;
  telefono: string;
  password: string;
  sector: B2BSector;
}

/** Rango de ingresos mensuales autodeclarado en el registro B2C — alimenta users.rango_ingresos. */
export type RangoIngresosMensuales = '0-2M' | '2M-4M' | '4M-8M' | '8M+';

const SCORE_BY_RANGO_INGRESOS: Record<RangoIngresosMensuales, number> = {
  '0-2M': 450,
  '2M-4M': 600,
  '4M-8M': 720,
  '8M+': 820,
};

/** Score estimado (0-1000) por rango de ingresos — fórmula acordada para poblar users.score_estimado. */
export function calcularScoreEstimado(rango: RangoIngresosMensuales): number {
  return SCORE_BY_RANGO_INGRESOS[rango];
}

/** Input for registering a B2C client. */
export interface RegisterB2CInput {
  nombres: string;
  apellidos: string;
  tipoId: string;
  numeroId: string;
  email: string;
  celular: string;
  password: string;
  bancoProductos: { organizationId: string; productos: string[] }[];
  rangoIngresos: RangoIngresosMensuales;
}

/** Input for registering the base account for the platform master admin.
 *  Creates ONLY the account — never assigns the Admin role. */
export interface RegisterAdminMasterInput {
  email: string;
  password: string;
}

/** Result of a registration attempt. */
export interface RegisterResult {
  success: boolean;
  error?: string;
  userId?: string;
  /** True when the account must be approved by an admin before it can log in. */
  pendingApproval?: boolean;
  /** True when Supabase requires email confirmation before sign-in. */
  requiresEmailConfirmation?: boolean;
}

/** Result of a login attempt. */
export interface LoginResult {
  success: boolean;
  error?: string;
  userId?: string;
  role?: string;
  dashboardRoute?: string;
  /** True when the account is awaiting admin approval. */
  pendingApproval?: boolean;
  /** True when the account was rejected by an admin. */
  rejected?: boolean;
  /** True when MFA_ENFORCEMENT_ENABLED and this account has a verified TOTP
   *  factor — the password was correct, but the login isn't complete until
   *  completeMfaChallenge(mfaFactorId, code) succeeds. */
  requiresMfaChallenge?: boolean;
  mfaFactorId?: string;
}

/** Result of a session-restore attempt on app load. */
export interface RestoreResult {
  success: boolean;
  userId?: string;
}

/** Result of a password-reset request. */
export interface PasswordResetResult {
  success: boolean;
  error?: string;
}
