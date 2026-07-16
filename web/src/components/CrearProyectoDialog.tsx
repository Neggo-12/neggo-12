import { useState } from 'react';
import {
  Building2, MapPin, Home, DollarSign, Layers,
  Plus, Check, Sparkles,
  PiggyBank, Percent, Clock, Gift, Loader2,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrganizationName } from '@/hooks/useOrganizationName';
import { insertProyecto } from '@/core/db/repositories';
import { CIUDADES, COMUNAS_MEDELLIN } from '@/types';

const tipoViviendaOptions: { value: string; label: string }[] = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'local', label: 'Local Comercial' },
  { value: 'oficina', label: 'Oficina' },
  { value: 'apartaestudio', label: 'Apartaestudio' },
  { value: 'casa-campestre', label: 'Casa Campestre' },
  { value: 'lote', label: 'Lote' },
];

const statusOptions: { value: string; label: string }[] = [
  { value: 'activo', label: 'Activo' },
  { value: 'pausado', label: 'Pausado' },
];

const ESTRATO_OPTIONS = [1, 2, 3, 4, 5, 6];

interface ProyectoForm {
  name: string;
  city: string;
  comuna: string;
  estratoMin: string;
  estratoMax: string;
  units: string;
  priceMin: string;
  priceMax: string;
  tipoVivienda: string;
  status: string;
  valorSeparacion: string;
  cuotaInicialPct: string;
  plazoCuotaInicialMeses: string;
  bonoComercial: string;
}

const initialForm: ProyectoForm = {
  name: '',
  city: '',
  comuna: '',
  estratoMin: '',
  estratoMax: '',
  units: '',
  priceMin: '',
  priceMax: '',
  tipoVivienda: '',
  status: 'activo',
  valorSeparacion: '',
  cuotaInicialPct: '',
  plazoCuotaInicialMeses: '',
  bonoComercial: '',
};

// ───── Helpers ─────

function formatCop(value: string): string {
  const n = parseInt(value, 10);
  if (isNaN(n)) return '';
  if (n >= 1_000_000_000) return `$${(n / 1_000_000_000).toFixed(1)}MM`;
  if (n >= 1_000_000) return `$${(n / 1_000_000).toFixed(0)}M`;
  return `$${n.toLocaleString('es-CO')}`;
}

function SectionHeader({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 pt-1 pb-0.5">
      <div className="flex h-5 w-5 items-center justify-center rounded bg-blue-500/10">
        <Icon className="h-3 w-3 text-blue-400" />
      </div>
      <span className="text-[11px] font-bold uppercase tracking-[0.15em] text-blue-400">
        {label}
      </span>
    </div>
  );
}

// ───── Component ─────

export default function CrearProyectoDialog({ onProjectCreated }: { onProjectCreated?: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProyectoForm>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = <K extends keyof ProyectoForm>(key: K, value: ProyectoForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const session = useAuthStore((s) => s.session);
  const { name: orgName, status: orgNameStatus } = useOrganizationName();
  const constructoraName = orgNameStatus === 'ready' && orgName ? orgName : 'Mi Constructora';
  const constructoraId = session?.userId ?? null;

  const isValid =
    !!constructoraId &&
    form.name.trim() &&
    form.city &&
    form.units &&
    form.priceMin &&
    form.priceMax &&
    form.tipoVivienda;

  const handleSubmit = async () => {
    if (!isValid || !constructoraId) {
      if (!constructoraId) {
        toast.error('No se pudo identificar tu sesión', { description: 'Vuelve a iniciar sesión e intenta de nuevo.' });
      }
      return;
    }
    setSubmitting(true);
    const { error } = await insertProyecto({
      id: `PROY-${Date.now().toString(36).toUpperCase()}`,
      constructoraId,
      constructoraNombre: constructoraName,
      nombre: form.name.trim(),
      ciudad: form.city,
      comuna: form.comuna || undefined,
      estratoMin: form.estratoMin ? Number(form.estratoMin) : undefined,
      estratoMax: form.estratoMax ? Number(form.estratoMax) : undefined,
      tipoVivienda: form.tipoVivienda,
      unidades: Number(form.units),
      precioMin: Number(form.priceMin),
      precioMax: Number(form.priceMax),
      estado: form.status,
      valorSeparacion: form.valorSeparacion ? Number(form.valorSeparacion) : undefined,
      cuotaInicialPct: form.cuotaInicialPct ? Number(form.cuotaInicialPct) : undefined,
      plazoCuotaInicialMeses: form.plazoCuotaInicialMeses ? Number(form.plazoCuotaInicialMeses) : undefined,
      bonoComercial: form.bonoComercial || undefined,
    });
    setSubmitting(false);

    if (error) {
      toast.error('No se pudo crear el proyecto', { description: error });
      return;
    }

    setSubmitted(true);
    onProjectCreated?.();
    setTimeout(() => {
      setOpen(false);
      setForm(initialForm);
      setSubmitted(false);
    }, 1200);
  };

  const handleOpenChange = (next: boolean) => {
    if (!next) {
      setForm(initialForm);
      setSubmitted(false);
    }
    setOpen(next);
  };

  const pricePreview =
    form.priceMin && form.priceMax
      ? `${formatCop(form.priceMin)} — ${formatCop(form.priceMax)}`
      : null;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="gap-2 bg-blue-600 hover:bg-blue-700 text-white shadow-lg shadow-blue-500/20 transition-all hover:shadow-blue-500/30 hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Crear Proyecto</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl border-border/60 bg-card/95 backdrop-blur-xl p-0 gap-0">
        {/* Header */}
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-400/40 to-transparent" />
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 glow-blue">
                <Building2 className="h-4.5 w-4.5 text-blue-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Nuevo Proyecto Inmobiliario
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Configura la estrategia comercial y ficha técnica del proyecto
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Form body */}
        <div className="px-6 py-2 space-y-5 max-h-[58vh] overflow-y-auto scrollbar-thin">
          {/* ═══════ SECCIÓN 1: Datos Generales ═══════ */}
          <div className="space-y-3">
            {/* Nombre */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3 w-3" /> Nombre del Proyecto
              </Label>
              <Input
                placeholder="ej. Torres del Parque"
                value={form.name}
                onChange={(e) => updateField('name', e.target.value)}
                className="h-9 text-sm bg-secondary/40 border-border/40 focus:border-blue-500/40"
              />
            </div>

            {/* Ciudad */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <MapPin className="h-3 w-3" /> Ciudad
              </Label>
              <Select value={form.city} onValueChange={(v) => updateField('city', v)}>
                <SelectTrigger className="h-9 text-sm bg-secondary/40 border-border/40">
                  <SelectValue placeholder="Seleccionar ciudad" />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card">
                  {CIUDADES.map((c) => (
                    <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Comuna + Estrato */}
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <MapPin className="h-3 w-3" /> Comuna
                </Label>
                <Select value={form.comuna} onValueChange={(v) => updateField('comuna', v)}>
                  <SelectTrigger className="h-9 text-sm bg-secondary/40 border-border/40">
                    <SelectValue placeholder="Opcional" />
                  </SelectTrigger>
                  <SelectContent className="border-border/60 bg-card max-h-64">
                    {COMUNAS_MEDELLIN.map((c) => (
                      <SelectItem key={c.value} value={c.value} className="text-sm">{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estrato mín.</Label>
                <Select value={form.estratoMin} onValueChange={(v) => updateField('estratoMin', v)}>
                  <SelectTrigger className="h-9 text-sm bg-secondary/40 border-border/40">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent className="border-border/60 bg-card">
                    {ESTRATO_OPTIONS.map((e) => (
                      <SelectItem key={e} value={e.toString()} className="text-sm">{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estrato máx.</Label>
                <Select value={form.estratoMax} onValueChange={(v) => updateField('estratoMax', v)}>
                  <SelectTrigger className="h-9 text-sm bg-secondary/40 border-border/40">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent className="border-border/60 bg-card">
                    {ESTRATO_OPTIONS.map((e) => (
                      <SelectItem key={e} value={e.toString()} className="text-sm">{e}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Constructora auto-capturada */}
            <div className="rounded-lg border border-blue-500/10 bg-blue-500/5 px-3 py-2 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Constructora</p>
                <p className="text-xs font-semibold text-blue-400">{constructoraName}</p>
              </div>
              {constructoraId ? (
                <span className="text-[9px] text-blue-400/60 font-mono">{constructoraId}</span>
              ) : (
                <span className="text-[9px] text-red-400">Sin sesión</span>
              )}
            </div>

            {/* Unidades + Tipo Vivienda */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Layers className="h-3 w-3" /> N° de Unidades
                </Label>
                <Input
                  type="number"
                  placeholder="ej. 120"
                  value={form.units}
                  onChange={(e) => updateField('units', e.target.value)}
                  className="h-9 text-sm bg-secondary/40 border-border/40 font-mono focus:border-blue-500/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Home className="h-3 w-3" /> Tipo de Vivienda
                </Label>
                <Select value={form.tipoVivienda} onValueChange={(v) => updateField('tipoVivienda', v)}>
                  <SelectTrigger className="h-9 text-sm bg-secondary/40 border-border/40">
                    <SelectValue placeholder="Seleccionar tipo" />
                  </SelectTrigger>
                  <SelectContent className="border-border/60 bg-card">
                    {tipoViviendaOptions.map((t) => (
                      <SelectItem key={t.value} value={t.value} className="text-sm">{t.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Rango de Precios */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" /> Rango de Precios (COP)
              </Label>
              <div className="grid grid-cols-2 gap-3">
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Mínimo"
                    value={form.priceMin}
                    onChange={(e) => updateField('priceMin', e.target.value)}
                    className="h-9 text-sm bg-secondary/40 border-border/40 font-mono pl-8 focus:border-blue-500/40"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">Min</span>
                </div>
                <div className="relative">
                  <Input
                    type="number"
                    placeholder="Máximo"
                    value={form.priceMax}
                    onChange={(e) => updateField('priceMax', e.target.value)}
                    className="h-9 text-sm bg-secondary/40 border-border/40 font-mono pl-8 focus:border-blue-500/40"
                  />
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground font-mono">Max</span>
                </div>
              </div>
              {pricePreview && (
                <p className="text-[10px] text-blue-400 font-mono mt-1">{pricePreview}</p>
              )}
            </div>

            {/* Estado */}
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Layers className="h-3 w-3" /> Estado Inicial
              </Label>
              <Select value={form.status} onValueChange={(v) => updateField('status', v)}>
                <SelectTrigger className="h-9 text-sm bg-secondary/40 border-border/40">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card">
                  {statusOptions.map((s) => (
                    <SelectItem key={s.value} value={s.value} className="text-sm">{s.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-border/30" />

          {/* ═══════ SECCIÓN 2: Financiación ═══════ */}
          <div className="space-y-3">
            <SectionHeader icon={PiggyBank} label="Financiación" />

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <DollarSign className="h-3 w-3" /> Valor de Separación
                </Label>
                <Input
                  type="number"
                  placeholder="ej. 5000000"
                  value={form.valorSeparacion}
                  onChange={(e) => updateField('valorSeparacion', e.target.value)}
                  className="h-9 text-sm bg-secondary/40 border-border/40 font-mono focus:border-blue-500/40"
                />
                {form.valorSeparacion && (
                  <p className="text-[10px] text-blue-400 font-mono">{formatCop(form.valorSeparacion)}</p>
                )}
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Percent className="h-3 w-3" /> Cuota Inicial (%)
                </Label>
                <Input
                  type="number"
                  placeholder="ej. 30"
                  value={form.cuotaInicialPct}
                  onChange={(e) => updateField('cuotaInicialPct', e.target.value)}
                  className="h-9 text-sm bg-secondary/40 border-border/40 font-mono focus:border-blue-500/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Clock className="h-3 w-3" /> Plazo (meses)
                </Label>
                <Input
                  type="number"
                  placeholder="ej. 24"
                  value={form.plazoCuotaInicialMeses}
                  onChange={(e) => updateField('plazoCuotaInicialMeses', e.target.value)}
                  className="h-9 text-sm bg-secondary/40 border-border/40 font-mono focus:border-blue-500/40"
                />
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-border/30" />

          {/* ═══════ SECCIÓN 3: Promociones y Beneficios ═══════ */}
          <div className="space-y-3">
            <SectionHeader icon={Gift} label="Promociones y Beneficios Destacados" />

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Sparkles className="h-3 w-3" /> Bono Comercial
              </Label>
              <Input
                placeholder="ej. Bono de $10.000.000 para escrituración"
                value={form.bonoComercial}
                onChange={(e) => updateField('bonoComercial', e.target.value)}
                className="h-9 text-sm bg-secondary/40 border-border/40 focus:border-blue-500/40"
              />
              <p className="text-[10px] text-muted-foreground">
                Describe el bono o beneficio especial que se ofrece al comprador
              </p>
            </div>
          </div>

          {/* Validation preview */}
          {form.name && form.city && form.tipoVivienda && (
            <div className="flex items-center gap-2 rounded-lg bg-blue-500/5 border border-blue-500/10 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-blue-400" />
              <div className="text-[11px] text-blue-400">
                <span className="font-medium">{form.name}</span>
                <span className="text-muted-foreground"> — </span>
                <span className="text-muted-foreground">{form.city}</span>
                {form.units && (
                  <>
                    <span className="text-muted-foreground"> — </span>
                    <span className="text-muted-foreground">{form.units} unidades</span>
                  </>
                )}
                {form.bonoComercial && (
                  <>
                    <span className="text-muted-foreground"> — </span>
                    <span className="text-emerald-400">{form.bonoComercial}</span>
                  </>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <DialogFooter className="px-6 py-4 border-t border-border/40">
          <div className="flex w-full items-center justify-between">
            <div className="text-[10px] text-muted-foreground">
              {isValid ? (
                <span className="text-blue-400">Formulario completo</span>
              ) : (
                <span>Completa los campos requeridos</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setOpen(false)}
                className="border-border/40 text-muted-foreground hover:text-foreground"
              >
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!isValid || submitted || submitting}
                onClick={handleSubmit}
                className={cn(
                  'gap-1.5 bg-blue-600 hover:bg-blue-700 min-w-[140px]',
                  submitted && 'bg-blue-500 pointer-events-none',
                )}
              >
                {submitted ? (
                  <>
                    <Check className="h-4 w-4" />
                    Proyecto Creado
                  </>
                ) : submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Crear Proyecto
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
