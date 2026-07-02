import { useState, useMemo } from 'react';
import { useComercioStore } from '../store/useComercioStore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Store,
  Check,
  ShieldCheck,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Building2,
  Hash,
  MapPin,
  Wrench,
  type LucideIcon,
} from 'lucide-react';
import { SUBCATEGORIAS } from '@/types';
import type { ComercioCategory, SubscriptionTier } from '@/types';
import { cn } from '@/lib/utils';

const CATEGORIAS: { value: ComercioCategory; label: string }[] = [
  { value: 'Celular', label: 'Celular' },
  { value: 'Viaje', label: 'Viaje' },
  { value: 'Vivienda', label: 'Vivienda' },
  { value: 'Carro', label: 'Carro' },
  { value: 'Moto', label: 'Moto' },
  { value: 'Computador', label: 'Computador' },
  { value: 'Remodelación', label: 'Remodelación' },
];

interface Plan {
  tier: SubscriptionTier;
  name: string;
  price: string;
  description: string;
  features: string[];
  highlighted: boolean;
}

const PLANES: Plan[] = [
  {
    tier: 'basico',
    name: 'Plan Básico',
    price: '$199.000/mes',
    description: 'Acceso limitado a leads. Ideal para validar el mercado.',
    features: ['Hasta 10 leads por mes', 'Perfil de comercio básico', 'Soporte por email'],
    highlighted: false,
  },
  {
    tier: 'premium',
    name: 'Plan Premium',
    price: '$499.000/mes',
    description:
      'Visualización prioritaria en el algoritmo de equidad (40-30-20-10) + Sello de Confianza Neggo.',
    features: [
      'Leads ilimitados',
      'Prioridad en algoritmo de matching',
      'Sello de Confianza Neggo',
      'Auditoría de legalidad certificada',
      'Facturación automática a clientes',
      'Soporte prioritario 24/7',
      'Dashboard de analíticas avanzadas',
    ],
    highlighted: true,
  },
];

export default function ComercioOnboarding() {
  const { currentComercio, setComercio, completeOnboarding } = useComercioStore();
  const [step, setStep] = useState<'info' | 'especialidades' | 'plan'>('info');
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionTier>('premium');
  const [showSeal, setShowSeal] = useState(false);

  // Dynamic subcategory options based on selected category
  const subOptions = useMemo(
    () => (currentComercio.categoria ? SUBCATEGORIAS[currentComercio.categoria] : []),
    [currentComercio.categoria],
  );

  const handleInfoSubmit = (): void => {
    if (subOptions.length > 0) {
      setStep('especialidades');
    } else {
      setStep('plan');
    }
  };

  const handleEspecialidadesSubmit = (): void => {
    setStep('plan');
  };

  const handleComplete = (): void => {
    setComercio({ plan: selectedPlan });
    completeOnboarding();
    setShowSeal(true);
  };

  if (showSeal) {
    return <TrustSealActivation nombre={currentComercio.nombre || 'Tu Negocio'} />;
  }

  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-start justify-center px-4 py-12">
      <div className="w-full max-w-2xl space-y-8 animate-slide-up">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
            <Store className="h-7 w-7 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground">
            {step === 'info'
              ? 'Registra tu Comercio'
              : step === 'especialidades'
                ? 'Especialidades'
                : 'Elige tu Plan'}
          </h2>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            {step === 'info'
              ? 'Completa la información de tu negocio para unirte al ecosistema Neggo.'
              : step === 'especialidades'
                ? 'Indica en qué subcategorías opera tu comercio para recibir leads ultra-segmentados.'
                : 'Selecciona el plan que mejor se adapte a las necesidades de tu comercio.'}
          </p>
        </div>

        {/* Progress Indicator — 3 steps */}
        <div className="flex items-center justify-center gap-2">
          <div
            className={cn(
              'h-2 w-12 rounded-full transition-all',
              step === 'info'
                ? 'bg-emerald-500'
                : 'bg-emerald-500/30',
            )}
          />
          <div
            className={cn(
              'h-2 w-12 rounded-full transition-all',
              step === 'especialidades'
                ? 'bg-emerald-500'
                : subOptions.length > 0
                  ? step === 'plan'
                    ? 'bg-emerald-500/30'
                    : 'bg-card border border-border/40'
                  : 'bg-card border border-border/40 opacity-30',
            )}
          />
          <div
            className={cn(
              'h-2 w-12 rounded-full transition-all',
              step === 'plan' ? 'bg-emerald-500' : 'bg-card border border-border/40',
            )}
          />
        </div>

        {/* Step 1: Business Info */}
        {step === 'info' && (
          <Card className="border-border/40 bg-card/50 backdrop-blur">
            <CardHeader>
              <CardTitle className="text-lg">Información del Negocio</CardTitle>
              <CardDescription>
                Estos datos serán verificados para emitir tu Sello de Confianza Neggo.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <InfoField
                label="Nombre Comercial"
                icon={Building2}
                placeholder="Ej: AutoMercado Premium"
                value={currentComercio.nombre}
                onChange={(v) => setComercio({ nombre: v })}
              />
              <InfoField
                label="NIT"
                icon={Hash}
                placeholder="Ej: 900.123.456-7"
                value={currentComercio.nit}
                onChange={(v) => setComercio({ nit: v })}
              />
              <InfoField
                label="Ciudad de Operación"
                icon={MapPin}
                placeholder="Ej: Medellín"
                value={currentComercio.ciudad}
                onChange={(v) => setComercio({ ciudad: v })}
              />
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Categoría / Vertical Exclusiva
                </Label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {CATEGORIAS.map((cat) => (
                    <button
                      key={cat.value}
                      type="button"
                      onClick={() => setComercio({ categoria: cat.value, especialidades: [] })}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                        currentComercio.categoria === cat.value
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                          : 'border-border/40 bg-card text-muted-foreground hover:border-emerald-500/30 hover:text-foreground',
                      )}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>
              <Button
                className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                disabled={!currentComercio.nombre || !currentComercio.nit || !currentComercio.ciudad || !currentComercio.categoria}
                onClick={handleInfoSubmit}
              >
                Continuar
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Step 1.5: Sub-Specialties */}
        {step === 'especialidades' && subOptions.length > 0 && (
          <Card className="border-border/40 bg-card/50 backdrop-blur animate-fade-in">
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Wrench className="h-5 w-5 text-emerald-400" />
                Especialidades en {currentComercio.categoria}
              </CardTitle>
              <CardDescription>
                Selecciona las subcategorías en las que opera tu negocio. Esto te conectará con
                clientes cuyas metas coincidan exactamente con tu oferta.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {subOptions.map((opt) => {
                  const selected = (currentComercio.especialidades ?? []).includes(opt.value);
                  return (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => {
                        const current = currentComercio.especialidades ?? [];
                        const next = selected
                          ? current.filter((e) => e !== opt.value)
                          : [...current, opt.value];
                        setComercio({ especialidades: next });
                      }}
                      className={cn(
                        'rounded-lg border px-3 py-2.5 text-sm font-medium transition-all',
                        selected
                          ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400 shadow-sm shadow-emerald-500/10'
                          : 'border-border/40 bg-card text-muted-foreground hover:border-emerald-500/30 hover:text-foreground',
                      )}
                    >
                      {selected && <Check className="inline h-3.5 w-3.5 mr-1.5 -ml-0.5" />}
                      {opt.label}
                    </button>
                  );
                })}
              </div>

              {currentComercio.categoria && (
                <div className="rounded-lg bg-emerald-500/5 border border-emerald-500/10 p-3 text-[11px] text-emerald-400/80 leading-relaxed">
                  Recibirás leads que busquen exactamente:{' '}
                  <span className="font-semibold text-emerald-400">
                    {(currentComercio.especialidades ?? []).length > 0
                      ? currentComercio.especialidades!
                          .map(
                            (e) =>
                              subOptions.find((o) => o.value === e)?.label ?? e,
                          )
                          .join(', ')
                      : 'Ninguna especialidad seleccionada'}
                  </span>
                </div>
              )}

              <div className="flex gap-3">
                <Button
                  variant="outline"
                  className="flex-1 border-border/40"
                  onClick={() => setStep('info')}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Volver
                </Button>
                <Button
                  className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                  onClick={handleEspecialidadesSubmit}
                >
                  Continuar
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Step 2: Plan Selection */}
        {step === 'plan' && (
          <div className="space-y-6 animate-fade-in">
            <div className="grid gap-4 sm:grid-cols-2">
              {PLANES.map((plan) => (
                <button
                  key={plan.tier}
                  type="button"
                  onClick={() => setSelectedPlan(plan.tier)}
                  className={cn(
                    'relative rounded-xl border p-5 text-left transition-all hover:scale-[1.01]',
                    selectedPlan === plan.tier
                      ? 'border-emerald-500/50 bg-emerald-500/5 ring-1 ring-emerald-500/20'
                      : 'border-border/40 bg-card/50',
                    plan.highlighted && 'sm:scale-105 sm:hover:scale-[1.06]',
                  )}
                >
                  {plan.highlighted && (
                    <Badge className="absolute -top-2.5 right-3 bg-emerald-600 text-white border-0 text-[10px] font-semibold">
                      Recomendado
                    </Badge>
                  )}
                  <div className="space-y-3">
                    <div>
                      <h3 className="text-base font-semibold text-foreground">{plan.name}</h3>
                      <p className="text-2xl font-bold text-foreground font-mono mt-1">
                        {plan.price}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      {plan.description}
                    </p>
                    <ul className="space-y-1.5 pt-1">
                      {plan.features.map((f) => (
                        <li key={f} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="mt-0.5 h-3 w-3 shrink-0 text-emerald-400" />
                          {f}
                        </li>
                      ))}
                    </ul>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex gap-3">
              <Button
                variant="outline"
                className="flex-1 border-border/40"
                onClick={() => setStep(subOptions.length > 0 ? 'especialidades' : 'info')}
              >
                Volver
              </Button>
              <Button
                className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                onClick={handleComplete}
              >
                Activar Suscripción
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ───── Trust Seal Activation Screen ─────

function TrustSealActivation({ nombre }: { nombre: string }) {
  return (
    <div className="flex min-h-[calc(100vh-6rem)] items-center justify-center px-4">
      <div className="text-center space-y-8 animate-slide-up max-w-md">
        <div className="relative mx-auto">
          <div className="flex h-24 w-24 items-center justify-center rounded-full bg-emerald-500/10 border-2 border-emerald-500/30">
            <ShieldCheck className="h-12 w-12 text-emerald-400" />
          </div>
          <div className="absolute -top-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full bg-emerald-600">
            <Check className="h-4 w-4 text-white" />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-2xl font-bold text-foreground">
            ¡{nombre} está oficialmente activo!
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Tu <span className="text-emerald-400 font-semibold">Sello de Confianza Neggo</span> ha
            sido emitido. Tu comercio ahora aparece con la insignia de origen legal validado,
            facturación automática y máxima prioridad en el algoritmo de equidad.
          </p>
          <div className="inline-flex items-center gap-2 rounded-full bg-emerald-500/10 border border-emerald-500/30 px-4 py-2">
            <ShieldCheck className="h-4 w-4 text-emerald-400" />
            <span className="text-sm font-medium text-emerald-400">Sello de Confianza Activo</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───── Reusable input field ─────

function InfoField({
  label,
  icon: Icon,
  placeholder,
  value,
  onChange,
}: {
  label: string;
  icon: LucideIcon;
  placeholder: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <div className="relative">
        <Icon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <input
          type="text"
          placeholder={placeholder}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-border/40 bg-card pl-10 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
        />
      </div>
    </div>
  );
}
