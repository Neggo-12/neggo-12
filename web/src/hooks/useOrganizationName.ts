import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveTenant } from '@/core/domain/tenant/tenantContext';

export type OrganizationNameStatus = 'loading' | 'ready' | 'error';

/**
 * Resolves the real `organizations.name` for the active session via
 * {@link resolveTenant} (memberships → organizations) — never from
 * client-held or mock state. Fails visibly: `status` is 'error' when no
 * tenant can be resolved, so callers must never fall back to a fake name.
 */
export function useOrganizationName(): { name: string | null; status: OrganizationNameStatus } {
  const session = useAuthStore((s) => s.session);
  const [name, setName] = useState<string | null>(null);
  const [status, setStatus] = useState<OrganizationNameStatus>('loading');

  useEffect(() => {
    if (!session?.userId) {
      setStatus('error');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    resolveTenant(session.userId).then((tenant) => {
      if (cancelled) return;
      if (tenant) {
        setName(tenant.name);
        setStatus('ready');
      } else {
        setName(null);
        setStatus('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session?.userId]);

  return { name, status };
}
