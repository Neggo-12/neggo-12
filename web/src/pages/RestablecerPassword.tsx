import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { KeyRound, Eye, EyeOff, CheckCircle2, AlertCircle, ShieldCheck, Loader2, Sparkles, LogIn } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { validatePassword } from '@/core/db/supabaseClient';
import {
  onPasswordRecovery,
  hasActiveSession,
  confirmPasswordReset,
} from '@/core/domain/auth/authService';
import { challengeAndVerify } from '@/core/domain/auth/mfaService';
import { cn } from '@/lib/utils';

type FlowStatus = 'checking' | 'ready' | 'mfa' | 'invalid' | 'done';

// ───── Password Field with toggle visibility (mismo patrón que LoginEcosistema) ─────

function PasswordField({
  id,
  label,
  value,
  onChange,
  placeholder,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  placeholder: string;
}) {
  const [visible, setVisible] = useState(false);
  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
        {label}
      </Label>
      <div className="relative">
        <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          id={id}
          type={visible ? 'text' : 'password'}
          placeholder={placeholder}
          value={value}
          onChange={onChange}
          className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm pl-10 pr-10 font-mono"
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
          tabIndex={-1}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      </div>
    </div>
  );
}

// ───── Página principal ─────

export default function RestablecerPassword() {
  const navigate = useNavigate();
  const [status, setStatus] = useState<FlowStatus>('checking');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [mfaFactorId, setMfaFactorId] = useState<string | null>(null);
  const [mfaCode, setMfaCode] = useState('');
  const [mfaSubmitting, setMfaSubmitting] = useState(false);

  useEffect(() => {
    // Supabase agrega error/error_description al hash cuando el link de
    // recuperación ya expiró o es inválido — se puede saber de inmediato,
    // sin esperar ningún evento.
    const hash = window.location.hash;
    if (hash.includes('error=') || hash.includes('error_code=')) {
      setStatus('invalid');
      return;
    }
    const hasRecoveryHint = hash.includes('type=recovery');

    let resolved = false;
    const unsubscribe = onPasswordRecovery(() => {
      resolved = true;
      setStatus('ready');
    });

    // Red de seguridad: detectSessionInUrl puede procesar el hash y disparar
    // el evento antes de que esta suscripción exista — si el hash ya traía
    // type=recovery, confirma con una sesión activa en vez de asumir.
    if (hasRecoveryHint) {
      void hasActiveSession().then((active) => {
        if (!resolved && active) {
          resolved = true;
          setStatus('ready');
        }
      });
    }

    const timeout = setTimeout(() => {
      if (!resolved) setStatus('invalid');
    }, 4000);

    return () => {
      unsubscribe();
      clearTimeout(timeout);
    };
  }, []);

  const pwValidation = validatePassword(password);
  const passwordsMatch = password.length > 0 && password === confirmPassword;
  const canSubmit = pwValidation.isValid && passwordsMatch && !submitting;

  const handleSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!canSubmit) return;
      setSubmitting(true);
      const result = await confirmPasswordReset(password);
      setSubmitting(false);

      if (!result.success && result.requiresMfaChallenge && result.mfaFactorId) {
        // La cuenta tiene MFA activo — la sesión de recuperación por correo
        // solo llega a aal1, hace falta subir a aal2 antes de reintentar.
        setMfaFactorId(result.mfaFactorId);
        setStatus('mfa');
        return;
      }

      if (!result.success) {
        toast.error('No se pudo actualizar la contraseña', { description: result.error });
        return;
      }
      setStatus('done');
      setTimeout(() => navigate('/login-ecosistema', { replace: true }), 2500);
    },
    [canSubmit, password, navigate],
  );

  const handleMfaSubmit = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      if (!mfaFactorId || mfaCode.trim().length !== 6 || mfaSubmitting) return;
      setMfaSubmitting(true);

      const { error: mfaError } = await challengeAndVerify(mfaFactorId, mfaCode.trim());
      if (mfaError) {
        setMfaSubmitting(false);
        toast.error('Código inválido', { description: mfaError });
        return;
      }

      // aal2 ya está establecida — reintenta con la misma contraseña que el
      // usuario ya escribió, sin pedírsela de nuevo.
      const result = await confirmPasswordReset(password);
      setMfaSubmitting(false);

      if (!result.success) {
        toast.error('No se pudo actualizar la contraseña', { description: result.error });
        return;
      }
      setStatus('done');
      setTimeout(() => navigate('/login-ecosistema', { replace: true }), 2500);
    },
    [mfaFactorId, mfaCode, mfaSubmitting, password, navigate],
  );

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-500/10 glow-green">
            <Sparkles className="h-5 w-5 text-emerald-400" />
          </div>
          <span className="text-lg font-extrabold tracking-tight text-foreground">Neggo</span>
        </div>

        <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm p-6 sm:p-8">
          {status === 'checking' && (
            <div className="flex flex-col items-center gap-3 py-8 text-center">
              <Loader2 className="h-8 w-8 text-emerald-400 animate-spin" />
              <p className="text-sm text-muted-foreground">Verificando tu enlace de recuperación...</p>
            </div>
          )}

          {status === 'invalid' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
                <AlertCircle className="h-7 w-7 text-red-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground mb-1">Enlace no válido</h1>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Este enlace no es válido o ya expiró. Solicita uno nuevo desde la pantalla de acceso.
                </p>
              </div>
              <Link to="/login-ecosistema">
                <Button className="mt-2">Ir al acceso</Button>
              </Link>
            </div>
          )}

          {status === 'ready' && (
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="text-center mb-2">
                <h1 className="text-lg font-bold text-foreground mb-1">Restablecer contraseña</h1>
                <p className="text-sm text-muted-foreground">Escribe tu nueva contraseña.</p>
              </div>

              <PasswordField
                id="new-password"
                label="Nueva contraseña"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              <PasswordField
                id="confirm-password"
                label="Confirmar contraseña"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />

              {password && (
                <div className="space-y-1.5 rounded-lg border border-border/30 bg-card/30 p-3">
                  {[
                    { label: 'Mínimo 8 caracteres', met: password.length >= 8 },
                    { label: 'Al menos una mayúscula', met: /[A-Z]/.test(password) },
                    { label: 'Al menos un número', met: /[0-9]/.test(password) },
                  ].map((c) => (
                    <div key={c.label} className="flex items-center gap-2 text-[11px]">
                      <div
                        className={cn(
                          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-colors',
                          c.met ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {c.met ? <CheckCircle2 className="h-2.5 w-2.5" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                      </div>
                      <span className={c.met ? 'text-emerald-400' : 'text-muted-foreground'}>{c.label}</span>
                    </div>
                  ))}
                  {confirmPassword && (
                    <div className="flex items-center gap-2 text-[11px]">
                      <div
                        className={cn(
                          'flex h-3.5 w-3.5 shrink-0 items-center justify-center rounded-full transition-colors',
                          passwordsMatch ? 'bg-emerald-500/20 text-emerald-400' : 'bg-muted text-muted-foreground',
                        )}
                      >
                        {passwordsMatch ? <CheckCircle2 className="h-2.5 w-2.5" /> : <div className="h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />}
                      </div>
                      <span className={passwordsMatch ? 'text-emerald-400' : 'text-muted-foreground'}>
                        Las contraseñas coinciden
                      </span>
                    </div>
                  )}
                </div>
              )}

              <Button type="submit" disabled={!canSubmit} className="w-full h-11 rounded-xl">
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Actualizando...
                  </>
                ) : (
                  'Actualizar contraseña'
                )}
              </Button>
            </form>
          )}

          {status === 'mfa' && (
            <form onSubmit={handleMfaSubmit} className="space-y-5 animate-fade-in">
              <div className="text-center mb-2">
                <h1 className="text-lg font-bold text-foreground mb-1">Verificación adicional</h1>
                <p className="text-sm text-muted-foreground">
                  Tu cuenta tiene verificación en dos pasos activa. Ingresa el código de 6 dígitos de tu
                  app de autenticación para confirmar el cambio de contraseña.
                </p>
              </div>
              <div className="space-y-2">
                <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Código de verificación
                </Label>
                <Input
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  placeholder="000000"
                  className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm text-center tracking-widest"
                  autoFocus
                />
              </div>
              <Button
                type="submit"
                disabled={mfaSubmitting || mfaCode.trim().length !== 6}
                className="w-full h-11 rounded-xl"
              >
                {mfaSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Verificando...
                  </>
                ) : (
                  <>
                    <LogIn className="h-4 w-4 mr-2" />
                    Verificar y actualizar contraseña
                  </>
                )}
              </Button>
            </form>
          )}

          {status === 'done' && (
            <div className="flex flex-col items-center gap-4 py-4 text-center">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                <ShieldCheck className="h-7 w-7 text-emerald-400" />
              </div>
              <div>
                <h1 className="text-lg font-bold text-foreground mb-1">Contraseña actualizada</h1>
                <p className="text-sm text-muted-foreground max-w-sm">
                  Te llevamos al acceso en un momento...
                </p>
              </div>
              <Link to="/login-ecosistema">
                <Button variant="outline" className="mt-2">Ir al acceso ahora</Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
