/**
 * Tenant Context — fail-closed resolution of the active tenant.
 *
 * Rules:
 *  - If no tenant can be resolved, callers get `null`/`false` and MUST deny
 *    access. There is no "global fallback".
 *  - `isPlatformAdmin` is ALWAYS resolved from `users.rol` in the database,
 *    never from client-held state that could be manipulated.
 *  - RLS remains the real security boundary; this module models the tenant for
 *    the application layer and future evolution (NestJS, microservices).
 */
import { supabase } from '@/core/db/dbClient';
import type { Tenant, TenantContextValue, TenantType } from '@/core/domain/tenant/types';

const KNOWN_TENANT_TYPES: readonly TenantType[] = [
  'banco',
  'constructora',
  'comercio',
  'notaria',
  'inmobiliaria',
  'seguros',
  'aliado',
];

function normalizeTenantType(raw: string | null | undefined): TenantType {
  const value = (raw ?? '').toLowerCase() as TenantType;
  return KNOWN_TENANT_TYPES.includes(value) ? value : 'aliado';
}

/**
 * Resolves whether a user is a platform admin by reading `users.rol`.
 * Fails closed: any error, missing record, or missing session returns `false`.
 */
export async function resolveIsPlatformAdmin(userId: string | null | undefined): Promise<boolean> {
  if (!supabase || !userId) return false;
  try {
    const { data, error } = await supabase
      .from('users')
      .select('rol')
      .eq('id', userId)
      .limit(1)
      .maybeSingle();
    if (error || !data) return false;
    return data.rol === 'Admin';
  } catch {
    return false;
  }
}

/**
 * Resolves the active tenant for a user via their active membership and the
 * organization it points to. Fails closed: returns `null` on any error, when
 * there is no active membership, or when the organization cannot be read.
 */
export async function resolveTenant(userId: string | null | undefined): Promise<Tenant | null> {
  if (!supabase || !userId) return null;
  try {
    const { data: memberships, error: mError } = await supabase
      .from('memberships')
      .select('organization_id, is_active')
      .eq('user_id', userId)
      .eq('is_active', true)
      .limit(1);
    if (mError || !memberships || memberships.length === 0) return null;

    const organizationId = memberships[0].organization_id;
    if (!organizationId) return null;

    const { data: org, error: oError } = await supabase
      .from('organizations')
      .select('id, name, type, status')
      .eq('id', organizationId)
      .limit(1)
      .maybeSingle();
    if (oError || !org) return null;

    return {
      id: org.id,
      name: org.name,
      type: normalizeTenantType(org.type),
      status: org.status,
    };
  } catch {
    return null;
  }
}

/**
 * Resolves the full tenant context for a user. Always fail-closed: with no
 * user, no session, or any error the result denies access
 * (`tenant: null`, `isPlatformAdmin: false`).
 */
export async function resolveTenantContext(
  userId: string | null | undefined,
): Promise<TenantContextValue> {
  const [tenant, isPlatformAdmin] = await Promise.all([
    resolveTenant(userId),
    resolveIsPlatformAdmin(userId),
  ]);
  return { tenant, isPlatformAdmin };
}

/** The fail-closed default: no tenant, not an admin. */
export const EMPTY_TENANT_CONTEXT: TenantContextValue = {
  tenant: null,
  isPlatformAdmin: false,
};
