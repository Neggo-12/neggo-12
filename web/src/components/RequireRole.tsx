import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveUserRole } from '@/core/domain/tenant/tenantContext';
import { MFA_ENFORCEMENT_ENABLED, MFA_ENFORCED_ROLES } from '@/core/config/mfaConfig';
import { checkAssuranceLevel } from '@/core/domain/auth/mfaService';

type GuardStatus = 'checking' | 'allowed' | 'denied';

/**
 * Generic route guard. Fail-closed: only renders children when the active
 * production session's user has a `rol` in `allowedRoles`, re-verified
 * server-side on every mount via {@link resolveUserRole} — never trusts
 * client-held session.role or demo-mode state. Same pattern as RequireAdmin.
 *
 * When MFA_ENFORCEMENT_ENABLED, also requires aal2 for roles in
 * MFA_ENFORCED_ROLES — same fail-closed treatment as a role mismatch.
 */
export default function RequireRole({
  allowedRoles,
  children,
}: {
  allowedRoles: string[];
  children: React.ReactNode;
}) {
  const session = useAuthStore((s) => s.session);
  const isSessionRestored = useAuthStore((s) => s.isSessionRestored);
  const [status, setStatus] = useState<GuardStatus>('checking');
  const allowedRolesKey = allowedRoles.join(',');

  useEffect(() => {
    if (!isSessionRestored) return;
    if (!session) {
      setStatus('denied');
      return;
    }
    let cancelled = false;
    (async () => {
      const role = await resolveUserRole(session.userId);
      const roleOk = role !== null && allowedRolesKey.split(',').includes(role);
      if (!roleOk) {
        if (!cancelled) setStatus('denied');
        return;
      }
      if (MFA_ENFORCEMENT_ENABLED && role && (MFA_ENFORCED_ROLES as readonly string[]).includes(role)) {
        const { currentLevel, nextLevel } = await checkAssuranceLevel();
        if (!cancelled) setStatus(currentLevel === 'aal2' && nextLevel === 'aal2' ? 'allowed' : 'denied');
        return;
      }
      if (!cancelled) setStatus('allowed');
    })();
    return () => {
      cancelled = true;
    };
  }, [session, isSessionRestored, allowedRolesKey]);

  useEffect(() => {
    if (status === 'denied') {
      toast.error('Acceso restringido', {
        description: 'Tu cuenta no tiene permiso para entrar a este panel.',
      });
    }
  }, [status]);

  if (status === 'checking') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (status === 'denied') {
    return <Navigate to="/login-ecosistema" replace />;
  }

  return <>{children}</>;
}
