import { useState, useMemo, useCallback } from 'react';
import {
  ShieldCheck, ShieldAlert, Phone, AlertTriangle,
  CheckCircle2, XCircle, Copy, Clock, UserCheck,
  Sparkles, ArrowRight, PhoneOff, Eye, EyeOff,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import type { Lead } from '@/types';
import { productNames } from '@/data/mock';

// ───── Types ─────

type SecurityStep = 'script' | 'confirmed' | 'fraud-alert' | 'calling';

interface GestionarClienteDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  lead: Lead;
}

// ───── Helpers ─────

/** Generate a deterministic 6-digit security code from a lead ID */
function generateCode(leadId: string): string {
  let hash = 0;
  for (let i = 0; i < leadId.length; i++) {
    hash = ((hash << 5) - hash + leadId.charCodeAt(i)) | 0;
  }
  const code = ((Math.abs(hash) % 900000) + 100000).toString();
  return `${code.slice(0, 3)} ${code.slice(3, 6)}`;
}

const asesores = ['Carlos Mendoza', 'Ana Torres', 'Luis Rivera', 'María Castro', 'Jorge Vargas'];

// ───── Component ─────

export default function GestionarClienteDialog({
  open,
  onOpenChange,
  lead,
}: GestionarClienteDialogProps) {
  const [step, setStep] = useState<SecurityStep>('script');
  const [showCode, setShowCode] = useState(true);

  const securityCode = useMemo(() => generateCode(lead.id), [lead.id]);
  const asesor = useMemo(() => asesores[Math.floor(Math.random() * asesores.length)], []);
  const productLabel = productNames[lead.product] ?? lead.product;

  // Reset state when dialog opens
  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (!open) {
        // Small delay so exit animation plays before reset
        setTimeout(() => {
          setStep('script');
          setShowCode(true);
        }, 200);
      }
      onOpenChange(open);
    },
    [onOpenChange],
  );

  const handleConfirmed = () => setStep('confirmed');
  const handleFraudAlert = () => setStep('fraud-alert');
  const handleCall = () => setStep('calling');

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[560px] border-border/60 bg-card/95 backdrop-blur-xl p-0 gap-0 overflow-hidden">
        {/* ── Script Step ── */}
        {step === 'script' && (
          <>
            <DialogHeader className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
                  <ShieldCheck className="h-5 w-5 text-cyan-400" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold tracking-tight">
                    Gestión Segura de Cliente
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    Flujo de Validación Cruzada — Anti-Phishing
                  </DialogDescription>
                </div>
                <Badge className="ml-auto bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px]">
                  <Sparkles className="h-3 w-3 mr-1" />
                  Verificación activa
                </Badge>
              </div>
            </DialogHeader>

            {/* Client Info Bar */}
            <div className="mx-6 mb-4 flex items-center gap-4 rounded-lg border border-border/40 bg-secondary/30 px-4 py-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">
                {lead.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-foreground truncate">{lead.name}</div>
                <div className="text-[11px] text-muted-foreground font-mono">{lead.phone}</div>
              </div>
              <Badge variant="outline" className="text-[10px] border-border/40 bg-card/40 shrink-0">
                {productLabel}
              </Badge>
            </div>

            {/* ── Security Code ── */}
            <div className="mx-6 mb-5">
              <div className="relative overflow-hidden rounded-xl border border-cyan-500/20 bg-gradient-to-br from-cyan-500/5 via-cyan-500/3 to-blue-500/5 p-5">
                {/* Glow rings */}
                <div className="absolute inset-0 pointer-events-none">
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-cyan-400/10 rounded-full blur-[60px]" />
                  <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-blue-400/10 rounded-full blur-[40px]" />
                </div>

                <div className="relative z-10 text-center space-y-3">
                  <div className="flex items-center justify-center gap-2">
                    <Clock className="h-3.5 w-3.5 text-cyan-400" />
                    <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-cyan-400">
                      Código de Seguridad Único
                    </span>
                  </div>

                  <div
                    className={cn(
                      'relative inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4',
                      'bg-cyan-500/10 border-2 border-cyan-500/30',
                      'shadow-[0_0_40px_-8px_hsl(189_94%_43%/0.3),0_0_80px_-16px_hsl(189_94%_43%/0.15)]',
                      'transition-all duration-500',
                      !showCode && 'blur-lg select-none',
                    )}
                  >
                    {showCode ? (
                      <span className="text-4xl font-bold font-mono tracking-[0.15em] text-cyan-300">
                        {securityCode}
                      </span>
                    ) : (
                      <span className="text-4xl font-bold font-mono tracking-[0.15em] text-cyan-400/30">
                        ••• •••
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => setShowCode(!showCode)}
                    className="inline-flex items-center gap-1.5 text-[10px] text-cyan-400/60 hover:text-cyan-400 transition-colors"
                  >
                    {showCode ? (
                      <>
                        <EyeOff className="h-3 w-3" /> Ocultar código
                      </>
                    ) : (
                      <>
                        <Eye className="h-3 w-3" /> Mostrar código
                      </>
                    )}
                  </button>

                  <p className="text-[10px] text-cyan-400/50">
                    Este código expira al finalizar la llamada
                  </p>
                </div>
              </div>
            </div>

            {/* ── Script Guion ── */}
            <div className="mx-6 mb-5 space-y-4">
              {/* Fase 1 */}
              <div className="rounded-lg border border-border/40 bg-card/60 p-4 space-y-2">
                <Badge variant="outline" className="text-[9px] border-emerald-500/20 bg-emerald-500/5 text-emerald-400 font-semibold tracking-wider">
                  FASE 1 — SALUDO
                </Badge>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-500/10 text-[10px] font-bold text-emerald-400 mt-0.5">
                    1
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    <span className="font-semibold text-emerald-400">Asesor:</span>{' '}
                    <span className="italic">
                      "Hola <span className="font-semibold not-italic text-foreground">{lead.name}</span>, habla{' '}
                      <span className="font-semibold not-italic text-foreground">{asesor}</span> de Neggo. Te llamo porque
                      vemos que iniciaste una solicitud para tu{' '}
                      <span className="font-semibold not-italic text-foreground">{productLabel}</span> hace unos minutos."
                    </span>
                  </p>
                </div>
              </div>

              {/* Fase 2 */}
              <div className="rounded-lg border border-blue-500/20 bg-blue-500/3 p-4 space-y-2">
                <Badge variant="outline" className="text-[9px] border-blue-500/20 bg-blue-500/5 text-blue-400 font-semibold tracking-wider">
                  FASE 2 — VALIDACIÓN CRUZADA
                </Badge>
                <div className="flex items-start gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-500/10 text-[10px] font-bold text-blue-400 mt-0.5">
                    2
                  </div>
                  <p className="text-sm leading-relaxed text-foreground/90">
                    <span className="font-semibold text-blue-400">Asesor:</span>{' '}
                    <span className="italic">
                      "Para tu total tranquilidad, antes de que me compartas cualquier información, por favor revisa tu
                      portal de clientes o SMS. El código único generado para esta llamada segura es el{' '}
                      <span className="inline-flex items-baseline gap-1 px-1.5 py-0.5 rounded bg-blue-500/10 border border-blue-500/20">
                        <span className="font-mono font-bold not-italic text-blue-300 text-base tracking-wider">{securityCode}</span>
                      </span>
                      . ¿Me confirmas si coincide con tu pantalla?"
                    </span>
                  </p>
                </div>
              </div>
            </div>

            {/* ── Action Buttons ── */}
            <div className="mx-6 mb-6 grid grid-cols-2 gap-3">
              <Button
                onClick={handleConfirmed}
                className={cn(
                  'h-auto flex-col items-center gap-1.5 py-4 px-3',
                  'bg-emerald-600/20 hover:bg-emerald-600/30 border-2 border-emerald-500/30 hover:border-emerald-500/50',
                  'text-emerald-300 transition-all duration-300',
                  'hover:shadow-[0_0_20px_-4px_hsl(160_84%_39%/0.3)]',
                )}
              >
                <CheckCircle2 className="h-5 w-5" />
                <div>
                  <div className="text-sm font-semibold">Sí, el cliente confirmó</div>
                  <div className="text-[10px] text-emerald-400/60 mt-0.5">Código coincide</div>
                </div>
              </Button>

              <Button
                onClick={handleFraudAlert}
                className={cn(
                  'h-auto flex-col items-center gap-1.5 py-4 px-3',
                  'bg-red-600/10 hover:bg-red-600/20 border-2 border-red-500/20 hover:border-red-500/40',
                  'text-red-300 transition-all duration-300',
                  'hover:shadow-[0_0_20px_-4px_hsl(0_72%_51%/0.3)]',
                )}
              >
                <XCircle className="h-5 w-5" />
                <div>
                  <div className="text-sm font-semibold">No coincide / Posible Estafa</div>
                  <div className="text-[10px] text-red-400/60 mt-0.5">Código diferente</div>
                </div>
              </Button>
            </div>
          </>
        )}

        {/* ── Confirmed State ── */}
        {step === 'confirmed' && (
          <>
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 glow-green">
                  <CheckCircle2 className="h-5 w-5 text-emerald-400" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-emerald-400 tracking-tight">
                    Validación Exitosa
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    El cliente confirmó el código — llamada verificada
                  </DialogDescription>
                </div>
                <Badge className="ml-auto bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
                  Seguro
                </Badge>
              </div>
            </div>

            <div className="mx-6 mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/3 p-5">
              <div className="flex items-start gap-3">
                <UserCheck className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
                <div className="space-y-2">
                  <p className="text-sm font-medium text-emerald-300">
                    Identidad verificada — {lead.name}
                  </p>
                  <p className="text-xs text-emerald-400/60 leading-relaxed">
                    El código <span className="font-mono font-semibold">{securityCode}</span> ha sido confirmado
                    por el cliente. Puedes proceder con la llamada y solicitar información sensible con total seguridad.
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-6 mb-6">
              <Button
                onClick={handleCall}
                className="w-full h-12 gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm shadow-lg shadow-emerald-500/20 transition-all duration-300 hover:shadow-[0_0_30px_-5px_hsl(160_84%_39%/0.4)]"
              >
                <Phone className="h-4 w-4" />
                Validar y Conectar Llamada
                <ArrowRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </>
        )}

        {/* ── Fraud Alert State ── */}
        {step === 'fraud-alert' && (
          <>
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-red-500/10 border border-red-500/20 glow-red">
                  <ShieldAlert className="h-5 w-5 text-red-400 animate-pulse" />
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-red-400 tracking-tight">
                    ¡Alerta de Seguridad!
                  </DialogTitle>
                  <DialogDescription className="text-xs text-red-400/70 mt-0.5">
                    Posible intento de estafa detectado
                  </DialogDescription>
                </div>
                <Badge className="ml-auto bg-red-500/10 text-red-400 border-red-500/20 text-[10px] animate-pulse">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  Crítico
                </Badge>
              </div>
            </div>

            {/* Warning Card */}
            <div className="mx-6 mb-5 rounded-xl border-2 border-red-500/30 bg-red-500/5 p-5 space-y-4">
              <div className="flex items-start gap-3">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-red-500/10">
                  <PhoneOff className="h-4 w-4 text-red-400" />
                </div>
                <div className="space-y-1.5">
                  <p className="text-sm font-semibold text-red-300">
                    Protocolo de Cierre Seguro
                  </p>
                  <p className="text-xs text-red-400/70 leading-relaxed">
                    <span className="font-semibold">Asesor:</span>{' '}
                    <span className="italic">
                      "Señor(a) <span className="not-italic font-semibold text-foreground">{lead.name}</span>,
                      le informo que esta llamada será desconectada inmediatamente por protocolo de seguridad. Le
                      recomendamos NO compartir ningún dato personal y contactar directamente a su banco a través
                      de los canales oficiales. Lamentamos cualquier inconveniente."
                    </span>
                  </p>
                </div>
              </div>

              <div className="rounded-lg border border-red-500/20 bg-red-500/10 p-3">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <p className="text-xs text-red-300/80 leading-relaxed">
                    <span className="font-semibold">Acción inmediata:</span> Cuelgue la llamada y registre este
                    incidente. El caso será escalado al equipo de seguridad para investigación. No continúe la
                    conversación con el interlocutor.
                  </p>
                </div>
              </div>
            </div>

            <div className="mx-6 mb-6 space-y-3">
              <Button
                onClick={() => onOpenChange(false)}
                className="w-full h-12 gap-2 bg-red-600 hover:bg-red-500 text-white font-semibold text-sm shadow-lg shadow-red-500/20 transition-all duration-300 hover:shadow-[0_0_30px_-5px_hsl(0_72%_51%/0.4)]"
              >
                <ShieldAlert className="h-4 w-4" />
                Marcar como Posible Estafa
              </Button>
              <Button
                variant="ghost"
                onClick={() => setStep('script')}
                className="w-full text-xs text-muted-foreground hover:text-foreground"
              >
                <ArrowRight className="h-3.5 w-3.5 mr-1 rotate-180" />
                Volver al guion
              </Button>
            </div>
          </>
        )}

        {/* ── Calling State ── */}
        {step === 'calling' && (
          <>
            <div className="px-6 pt-6 pb-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20 glow-green">
                  <div className="relative">
                    <Phone className="h-5 w-5 text-emerald-400" />
                    <span className="absolute -top-1 -right-1 flex h-2.5 w-2.5">
                      <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                      <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-emerald-400" />
                    </span>
                  </div>
                </div>
                <div>
                  <DialogTitle className="text-base font-semibold text-emerald-400 tracking-tight">
                    Conectando Llamada Segura
                  </DialogTitle>
                  <DialogDescription className="text-xs mt-0.5">
                    Validación completada — iniciando comunicación cifrada
                  </DialogDescription>
                </div>
              </div>
            </div>

            <div className="mx-6 mb-6 rounded-xl border border-emerald-500/20 bg-emerald-500/3 p-6 text-center space-y-3">
              <div className="inline-flex items-center justify-center h-12 w-12 rounded-full bg-emerald-500/10 border border-emerald-500/20">
                <UserCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">
                  {lead.name}
                </p>
                <p className="text-xs text-muted-foreground font-mono">
                  {lead.phone}
                </p>
              </div>
              <div className="flex items-center justify-center gap-1.5">
                <span className="text-[10px] text-emerald-400/70">Conexión segura establecida</span>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-400" />
              </div>
            </div>

            <div className="mx-6 mb-6">
              <Button
                onClick={() => onOpenChange(false)}
                variant="outline"
                className="w-full text-xs border-border/40"
              >
                Finalizar llamada
              </Button>
            </div>
          </>
        )}

        {/* ── Bottom padding for all states ── */}
        {(step === 'script' || step === 'confirmed') && (
          <div className="h-2" />
        )}
      </DialogContent>
    </Dialog>
  );
}
