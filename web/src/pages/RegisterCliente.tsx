import { useState, useCallback } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  User, Mail, Phone, MapPin, CreditCard,
  ArrowLeft, ArrowRight, CheckCircle2, ShieldCheck,
  Sparkles, Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/store/useAuthStore';
import { upsertUsuario } from '@/core/db/repositories';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { UsuarioDB } from '@/types';

const CITIES = [
  'Bogotá', 'Medellín', 'Cali', 'Barranquilla',
  'Cartagena', 'Bucaramanga', 'Pereira', 'Manizales',
  'Santa Marta',
];

const INCOME_RANGES = [
  { value: 'menos-3M', label: 'Menos de $3M COP' },
  { value: '3M-6M', label: '$3M - $6M COP' },
  { value: '6M-10M', label: '$6M - $10M COP' },
  { value: 'mas-10M', label: '+$10M COP' },
];

const SCORE_LEVELS = [
  { value: '300-500', label: 'Regular (300 - 500)' },
  { value: '500-700', label: 'Bueno (500 - 700)' },
  { value: '700-850', label: 'Muy Bueno (700 - 850)' },
  { value: '850+', label: 'Excelente (850+)' },
];

interface FormData {
  nombre: string;
  correo: string;
  telefono: string;
  ciudad: string;
  rangoIngresos: string;
  scoreEstimado: number;
}

const INITIAL_FORM: FormData = {
  nombre: '',
  correo: '',
  telefono: '',
  ciudad: '',
  rangoIngresos: '',
  scoreEstimado: 650,
};

export default function RegisterCliente() {
  const navigate = useNavigate();
  const [step, setStep] = useState<1 | 2>(1);
  const [form, setForm] = useState<FormData>(INITIAL_FORM);
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done'>('idle');

  const updateField = useCallback(<K extends keyof FormData>(key: K, value: FormData[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const step1Valid =
    form.nombre.trim() !== '' &&
    form.correo.trim() !== '' &&
    form.telefono.trim() !== '' &&
    form.ciudad !== '';

  const step2Valid = form.rangoIngresos !== '' && form.scoreEstimado > 0;

  const handleSubmit = useCallback(() => {
    if (!step2Valid) return;
    setSubmitState('loading');
    const incomeLabel = INCOME_RANGES.find((r) => r.value === form.rangoIngresos)?.label ?? form.rangoIngresos;

    // Registro real en la tabla `users` de la base de datos
    const nuevoUsuario: UsuarioDB = {
      id: `USR-CLI-${Date.now()}`,
      nombre: form.nombre,
      correo: form.correo,
      telefono: form.telefono,
      ciudad: form.ciudad,
      rol: 'Cliente',
      rangoIngresos: incomeLabel,
      scoreEstimado: form.scoreEstimado,
      fechaRegistro: new Date().toISOString(),
    };

    void upsertUsuario(nuevoUsuario).then(({ error }) => {
      if (error) {
        toast.error('El registro se creó localmente pero falló la sincronización', {
          description: error,
        });
      }
      // Inicializa la sesión del cliente en el portal
      useAuthStore.getState().switchProfile('cliente');
      setSubmitState('done');
      setTimeout(() => {
        navigate('/portal');
      }, 2000);
    });
  }, [form, step2Valid, navigate]);

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        {/* Logo / Brand */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-2 mb-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-cyan-500/10 border border-cyan-500/20">
              <ShieldCheck className="h-5 w-5 text-cyan-400" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">Neggo</span>
          </div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight mb-1">
            Crea tu cuenta de cliente
          </h1>
          <p className="text-sm text-muted-foreground">
            Únete a la red financiera más inteligente de Colombia
          </p>
        </div>

        <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-xl p-6 sm:p-8">
          {submitState === 'done' ? (
            /* ── Success state ── */
            <div className="flex flex-col items-center justify-center py-10 text-center animate-fade-in">
              <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
                <CheckCircle2 className="h-10 w-10 text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-foreground mb-2">Registro exitoso</h2>
              <p className="text-sm text-muted-foreground max-w-sm mb-2">
                Bienvenido a Neggo, <span className="font-semibold text-cyan-400">{form.nombre}</span>. Tu perfil
                ha sido creado con score estimado de{' '}
                <span className="font-mono font-semibold text-blue-400">{form.scoreEstimado}</span>.
              </p>
              <p className="text-xs text-muted-foreground mb-6">
                Redirigiendo a tu portal personal...
              </p>
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 text-cyan-400 animate-spin" />
                <span className="text-xs text-cyan-400 font-medium">Inicializando sesión</span>
              </div>
            </div>
          ) : (
            <>
              {/* ── Step indicator ── */}
              <div className="flex items-center gap-3 mb-8">
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                    step === 1
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'bg-emerald-500/5 text-emerald-400/60 border border-emerald-500/10',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                      step === 1 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-emerald-500/10 text-emerald-400',
                    )}
                  >
                    {step > 1 ? <CheckCircle2 className="h-3.5 w-3.5" /> : '1'}
                  </span>
                  Datos Básicos
                </div>
                <div className="h-px flex-1 bg-border/40" />
                <div
                  className={cn(
                    'flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold transition-all',
                    step === 2
                      ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/20'
                      : 'text-muted-foreground',
                  )}
                >
                  <span
                    className={cn(
                      'flex h-5 w-5 items-center justify-center rounded-full text-[10px] font-bold',
                      step === 2 ? 'bg-cyan-500/20 text-cyan-400' : 'bg-muted text-muted-foreground',
                    )}
                  >
                    2
                  </span>
                  Pre-Scoring
                </div>
              </div>

              {step === 1 && (
                /* ── Step 1: Datos básicos ── */
                <div className="space-y-5 animate-fade-in">
                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <User className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                      Nombre Completo
                    </Label>
                    <Input
                      placeholder="Ej: Jhon Edison Florez"
                      value={form.nombre}
                      onChange={(e) => updateField('nombre', e.target.value)}
                      className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      <Mail className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                      Correo Electrónico
                    </Label>
                    <Input
                      type="email"
                      placeholder="Ej: jhon@email.com"
                      value={form.correo}
                      onChange={(e) => updateField('correo', e.target.value)}
                      className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <Phone className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                        Teléfono
                      </Label>
                      <Input
                        type="tel"
                        placeholder="+57 300 123 4567"
                        value={form.telefono}
                        onChange={(e) => updateField('telefono', e.target.value)}
                        className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                        <MapPin className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                        Ciudad
                      </Label>
                      <Select value={form.ciudad} onValueChange={(v) => updateField('ciudad', v)}>
                        <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                          <SelectValue placeholder="Seleccionar" />
                        </SelectTrigger>
                        <SelectContent className="border-border/60 bg-card/95">
                          {CITIES.map((c) => (
                            <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <Button
                    disabled={!step1Valid}
                    onClick={() => setStep(2)}
                    className={cn(
                      'w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
                      step1Valid
                        ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20'
                        : 'bg-muted text-muted-foreground cursor-not-allowed',
                    )}
                  >
                    Continuar al Pre-Scoring
                    <ArrowRight className="h-4 w-4" />
                  </Button>
                </div>
              )}

              {step === 2 && (
                /* ── Step 2: Pre-Scoring Financiero ── */
                <div className="space-y-5 animate-fade-in">
                  <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
                    <div className="flex items-start gap-3">
                      <CreditCard className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <p className="text-sm font-semibold text-amber-400 mb-1">
                          Perfil Financiero Estimado
                        </p>
                        <p className="text-xs text-muted-foreground leading-relaxed">
                          Esta información nos ayuda a conectarte con las mejores ofertas. Tus datos
                          están protegidos y nunca se comparten sin tu autorización IFC.
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Rango de Ingresos Mensuales (COP)
                    </Label>
                    <Select value={form.rangoIngresos} onValueChange={(v) => updateField('rangoIngresos', v)}>
                      <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                        <SelectValue placeholder="Selecciona tu rango" />
                      </SelectTrigger>
                      <SelectContent className="border-border/60 bg-card/95">
                        {INCOME_RANGES.map((r) => (
                          <SelectItem key={r.value} value={r.value} className="text-sm">
                            {r.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                      Nivel Estimado de Score (Datacrédito)
                    </Label>
                    <Select
                      value={String(form.scoreEstimado)}
                      onValueChange={(v) => updateField('scoreEstimado', Number(v))}
                    >
                      <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                        <SelectValue placeholder="Selecciona tu nivel" />
                      </SelectTrigger>
                      <SelectContent className="border-border/60 bg-card/95">
                        {SCORE_LEVELS.map((s) => (
                          <SelectItem key={s.value} value={s.value.split('-')[0]} className="text-sm">
                            {s.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {form.scoreEstimado > 0 && (
                      <div className="flex items-center gap-2 mt-2">
                        <Badge
                          variant="outline"
                          className={cn(
                            'text-[10px] font-medium',
                            form.scoreEstimado >= 700
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                              : form.scoreEstimado >= 500
                                ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                                : 'bg-red-500/10 text-red-400 border-red-500/20',
                          )}
                        >
                          Score estimado: {form.scoreEstimado}
                        </Badge>
                        {form.scoreEstimado >= 700 && (
                          <span className="text-[10px] text-emerald-400/80">
                            Calificas para tasas preferenciales
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  <div className="flex gap-3">
                    <Button
                      variant="outline"
                      onClick={() => setStep(1)}
                      className="h-11 gap-2 border-border/40 rounded-xl text-sm"
                    >
                      <ArrowLeft className="h-4 w-4" />
                      Volver
                    </Button>
                    <Button
                      disabled={!step2Valid || submitState === 'loading'}
                      onClick={handleSubmit}
                      className={cn(
                        'flex-1 h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
                        step2Valid
                          ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20'
                          : 'bg-muted text-muted-foreground cursor-not-allowed',
                      )}
                    >
                      {submitState === 'loading' ? (
                        <>
                          <Loader2 className="h-4 w-4 animate-spin" />
                          Creando cuenta...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4" />
                          Crear Cuenta y Entrar al Portal
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground mt-6">
          ¿Ya tienes cuenta?{' '}
          <Link to="/portal" className="text-cyan-400 hover:text-cyan-300 font-medium underline underline-offset-2">
            Ir al Portal de Clientes
          </Link>
        </p>
      </div>
    </div>
  );
}
