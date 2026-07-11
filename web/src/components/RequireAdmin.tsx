import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuthStore } from '@/store/useAuthStore';
import { resolveIsPlatformAdmin } from '@/core/domain/tenant/tenantContext';

type GuardStatus = 'checking' | 'allowed' | 'denied';

/**
 * Route guard for /admin. Fail-closed: only renders children when the active
 * production session's user has `rol = 'Admin'`, re-verified server-side on
 * every mount via {@link resolveIsPlatformAdmin} — never trusts client-held
 * session.role or demo-mode state.
 */
export default function RequireAdmin({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const isSessionRestored = useAuthStore((s) => s.isSessionRestored);
  const [status, setStatus] = useState<GuardStatus>('checking');

  useEffect(() => {
    if (!isSessionRestored) return;
    if (!session) {
      setStatus('denied');
      return;
    }
    let cancelled = false;
    resolveIsPlatformAdmin(session.userId).then((isAdmin) => {
      if (!cancelled) setStatus(isAdmin ? 'allowed' : 'denied');
    });
    return () => {
      cancelled = true;
    };
  }, [session, isSessionRestored]);

  useEffect(() => {
    if (status === 'denied') {
      toast.error('Acceso restringido', {
        description: 'Necesitas una cuenta con rol Admin para entrar a este panel.',
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
