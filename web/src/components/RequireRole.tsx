import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveUserRole } from '@/core/domain/tenant/tenantContext';

type GuardStatus = 'checking' | 'allowed' | 'denied';

/**
 * Generic route guard. Fail-closed: only renders children when the active
 * production session's user has a `rol` in `allowedRoles`, re-verified
 * server-side on every mount via {@link resolveUserRole} — never trusts
 * client-held session.role or demo-mode state. Same pattern as RequireAdmin.
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
    resolveUserRole(session.userId).then((role) => {
      if (cancelled) return;
      setStatus(role !== null && allowedRolesKey.split(',').includes(role) ? 'allowed' : 'denied');
    });
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
