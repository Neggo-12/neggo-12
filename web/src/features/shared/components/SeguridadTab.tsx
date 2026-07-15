import { useState, useEffect, useCallback } from 'react';
import { ShieldCheck, ShieldAlert, Loader2, KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { MFA_ENFORCEMENT_ENABLED } from '@/core/config/mfaConfig';
import { enrollTotp, listFactors, unenrollFactor, challengeAndVerify } from '@/core/domain/auth/mfaService';

/**
 * Pantalla "Seguridad" — enroll de MFA (TOTP) para Admin/B2B.
 *
 * Mientras MFA_ENFORCEMENT_ENABLED sea false, muestra solo un aviso — no se
 * ofrece enroll para evitar que alguien inscriba un factor antes de que el
 * login/guards lo exijan (quedaría un factor inscrito sin que nada lo pida,
 * un estado confuso).
 */
export default function SeguridadTab() {
  if (!MFA_ENFORCEMENT_ENABLED) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-border/40 bg-card/40">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
          <ShieldAlert className="h-6 w-6 text-amber-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Seguridad</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          El MFA aún no está habilitado en esta versión.
        </p>
      </div>
    );
  }

  return <SeguridadTabEnabled />;
}

function SeguridadTabEnabled() {
  const [isLoading, setIsLoading] = useState(true);
  const [enrolledFactorId, setEnrolledFactorId] = useState<string | null>(null);
  const [isStartingEnroll, setIsStartingEnroll] = useState(false);
  const [qrCode, setQrCode] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [pendingFactorId, setPendingFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadFactors = useCallback(async () => {
    setIsLoading(true);
    const { factors } = await listFactors();
    const verified = factors.find((f) => f.status === 'verified');
    setEnrolledFactorId(verified?.id ?? null);
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadFactors();
  }, [loadFactors]);

  const handleStartEnroll = useCallback(async () => {
    setIsStartingEnroll(true);
    const { factorId, qrCode: qr, secret: sec, error } = await enrollTotp();
    setIsStartingEnroll(false);
    if (error || !factorId) {
      toast.error('No se pudo iniciar la inscripción', { description: error ?? undefined });
      return;
    }
    setPendingFactorId(factorId);
    setQrCode(qr);
    setSecret(sec);
  }, []);

  const handleVerify = useCallback(async () => {
    if (!pendingFactorId || code.trim().length !== 6) return;
    setIsSubmitting(true);
    const { error } = await challengeAndVerify(pendingFactorId, code.trim());
    setIsSubmitting(false);
    if (error) {
      toast.error('Código incorrecto', { description: error });
      return;
    }
    toast.success('MFA activado', { description: 'Tu cuenta ahora requiere el código en cada inicio de sesión.' });
    setPendingFactorId(null);
    setQrCode(null);
    setSecret(null);
    setCode('');
    void loadFactors();
  }, [pendingFactorId, code, loadFactors]);

  const handleDisable = useCallback(async () => {
    if (!enrolledFactorId) return;
    const { error } = await unenrollFactor(enrolledFactorId);
    if (error) {
      toast.error('No se pudo desactivar', { description: error });
      return;
    }
    toast.success('MFA desactivado');
    void loadFactors();
  }, [enrolledFactorId, loadFactors]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (enrolledFactorId) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">Seguridad</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Autenticación de dos factores (TOTP)</p>
        </div>
        <div className="flex items-start gap-3 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4">
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-400 mt-0.5" />
          <div className="space-y-2">
            <p className="text-sm font-semibold text-emerald-400">MFA activo</p>
            <p className="text-xs text-muted-foreground">
              Tu cuenta pide un código de tu app de autenticación en cada inicio de sesión.
            </p>
            <Button variant="outline" size="sm" onClick={handleDisable} className="mt-2">
              Desactivar MFA
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (pendingFactorId) {
    return (
      <div className="space-y-6 max-w-md">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">Activar MFA</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Escanea el código QR con tu app de autenticación (Google Authenticator, Authy, etc.)
          </p>
        </div>
        {qrCode && (
          <div className="flex justify-center rounded-xl border border-border/40 bg-card p-4">
            <img src={qrCode} alt="Código QR para MFA" className="h-48 w-48" />
          </div>
        )}
        {secret && (
          <p className="text-xs text-muted-foreground text-center">
            ¿No puedes escanear? Ingresa este código manualmente:{' '}
            <span className="font-mono text-foreground">{secret}</span>
          </p>
        )}
        <div className="space-y-2">
          <Input
            value={code}
            onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
            placeholder="Código de 6 dígitos"
            className="text-center tracking-widest"
            maxLength={6}
          />
          <Button
            onClick={handleVerify}
            disabled={isSubmitting || code.trim().length !== 6}
            className="w-full"
          >
            {isSubmitting ? 'Verificando...' : 'Confirmar y activar'}
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Seguridad</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Autenticación de dos factores (TOTP)</p>
      </div>
      <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
        <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
          <KeyRound className="h-6 w-6 text-blue-400" />
        </div>
        <h4 className="text-sm font-semibold text-foreground mb-1">MFA no está activo</h4>
        <p className="text-xs text-muted-foreground max-w-sm mb-4">
          Agrega una capa extra de seguridad exigiendo un código de tu app de autenticación en cada inicio de sesión.
        </p>
        <Button onClick={handleStartEnroll} disabled={isStartingEnroll}>
          {isStartingEnroll ? 'Iniciando...' : 'Activar autenticación de dos factores'}
        </Button>
      </div>
    </div>
  );
}
