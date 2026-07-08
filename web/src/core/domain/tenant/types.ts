/**
 * Tenant domain types — the vocabulary for multi-tenant (SaaS) isolation.
 *
 * The architecture is prepared to support new ally types without hardcoding
 * behavior: adding a value here is enough to model a new kind of tenant.
 */

/** Kinds of organization the platform can host. */
export type TenantType =
  | 'banco'
  | 'constructora'
  | 'comercio'
  | 'notaria'
  | 'inmobiliaria'
  | 'seguros'
  | 'aliado';

/** A resolved active tenant for the current session. */
export interface Tenant {
  /** Organization id (the tenant boundary). */
  id: string;
  /** Display name of the organization. */
  name: string;
  /** Organization type. */
  type: TenantType;
  /** Status as stored in `organizations.status` (e.g. 'active', 'pending'). */
  status: string;
}

/**
 * The value exposed by the tenant context. `tenant` is `null` when there is no
 * active tenant — consumers MUST treat `null` as "no access" (fail-closed).
 */
export interface TenantContextValue {
  /** Active tenant, or `null` when none could be resolved. */
  tenant: Tenant | null;
  /** True only when resolved from `users.rol` in the database. */
  isPlatformAdmin: boolean;
}
