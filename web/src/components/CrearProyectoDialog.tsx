import { useState } from 'react';
import {
  Building2, MapPin, Home, DollarSign, Layers,
  Calendar, Plus, Check, Sparkles,
  PiggyBank, Percent, Clock, Gift, Ruler,
  BedDouble, Bath, Car, Eye, Lock, TrendingUp,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';

const citiesList = [
  'Bogotá', 'Medellín', 'Cali',
  'Barranquilla', 'Cartagena', 'Bucaramanga',
  'Pereira', 'Manizales', 'Santa Marta',
];

const tipoViviendaOptions: { value: string; label: string }[] = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'local', label: 'Local Comercial' },
  { value: 'oficina', label: 'Oficina' },
];

const statusOptions: { value: string; label: string }[] = [
  { value: 'activo', label: 'Activo' },
  { value: 'pausado', label: 'Pausado' },
];

interface ProyectoForm {
  name: string;
  city: string;
  units: string;
  priceMin: string;
  priceMax: string;
  tipoVivienda: string;
  status: string;
  startDate: string;
  // Financing
  valorSeparacion: string;
  cuotaInicialPct: string;
  plazoCuotaInicialMeses: string;
  subsidioCajaCompensacion: boolean;
  subsidioMiCasaYa: boolean;
  // Promotions
  bonoComercial: string;
  // Residential specs
  areaConstruida: string;
  alcobas: string;
  banos: string;
  parqueadero: boolean;
  // Visibility segmentation
  visibilidad: 'publico-general' | 'perfilado-core';
  ingresoMinimo: string;
  scoreFisMinimo: string;
}

const initialForm: ProyectoForm = {
  name: '',
  city: '',
  units: '',
  priceMin: '',
  priceMax: '',
  tipoVivienda: '',
  status: 'activo',
  startDate: '',
  valorSeparacion: '',
  cuotaInicialPct: '',
  plazoCuotaInicialMeses: '',
  subsidioCajaCompensacion: false,
  subsidioMiCasaYa: false,
  bonoComercial: '',
  areaConstruida: '',
  alcobas: '',
  banos: '',
  parqueadero: false,
  visibilidad: 'publico-general',
  ingresoMinimo: '',
  scoreFisMinimo: '',
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

export default function CrearProyectoDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ProyectoForm>(initialForm);
  const [submitted, setSubmitted] = useState(false);

  const updateField = <K extends keyof ProyectoForm>(key: K, value: ProyectoForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const currentUser = useAuthStore((s) => s.currentUser);
  const constructoraName = currentUser?.nombre ?? 'Mi Constructora';
  const constructoraId = currentUser?.id ?? 'CONS-AUTO';

  const isValid =
    form.name.trim() &&
    form.city &&
    form.units &&
    form.priceMin &&
    form.priceMax &&
    form.tipoVivienda;

  const handleSubmit = () => {
    if (!isValid) return;
    setSubmitted(true);
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
                  Configura la estrategia comercial, financiación y ficha técnica del proyecto
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
                  {citiesList.map((c) => (
                    <SelectItem key={c} value={c} className="text-sm">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Constructora auto-capturada */}
            <div className="rounded-lg border border-blue-500/10 bg-blue-500/5 px-3 py-2 flex items-center gap-2">
              <Building2 className="h-3.5 w-3.5 text-blue-400 shrink-0" />
              <div className="flex-1">
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Constructora</p>
                <p className="text-xs font-semibold text-blue-400">{constructoraName}</p>
              </div>
              <span className="text-[9px] text-blue-400/60 font-mono">{constructoraId}</span>
            </div>

            {/* Unidades + Tipo Vivienda + Estado + Fecha */}
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

            {/* Estado + Fecha Inicio */}
            <div className="grid grid-cols-2 gap-3">
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
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Calendar className="h-3 w-3" /> Fecha de Lanzamiento
                </Label>
                <Input
                  type="date"
                  value={form.startDate}
                  onChange={(e) => updateField('startDate', e.target.value)}
                  className="h-9 text-sm bg-secondary/40 border-border/40 focus:border-blue-500/40"
                />
              </div>
            </div>
          </div>

          {/* Separator */}
          <div className="border-t border-border/30" />

          {/* ═══════ SECCIÓN 2: Financiación y Formas de Pago ═══════ */}
          <div className="space-y-3">
            <SectionHeader icon={PiggyBank} label="Financiación y Formas de Pago" />

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

            {/* Subsidios toggles */}
            <div className="rounded-lg border border-border/40 bg-card/40 p-3 space-y-2.5">
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Subsidios Aplicables
              </p>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-amber-500/20 bg-amber-500/10 text-amber-400">
                    CCF
                  </Badge>
                  <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="sub-caja">
                    Subsidio de Caja de Compensación
                  </Label>
                </div>
                <Switch
                  id="sub-caja"
                  checked={form.subsidioCajaCompensacion}
                  onCheckedChange={(v) => updateField('subsidioCajaCompensacion', v)}
                />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px] border-emerald-500/20 bg-emerald-500/10 text-emerald-400">
                    MCY
                  </Badge>
                  <Label className="text-xs text-muted-foreground cursor-pointer" htmlFor="sub-mcv">
                    Subsidio Mi Casa Ya
                  </Label>
                </div>
                <Switch
                  id="sub-mcv"
                  checked={form.subsidioMiCasaYa}
                  onCheckedChange={(v) => updateField('subsidioMiCasaYa', v)}
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

          {/* Separator */}
          <div className="border-t border-border/30" />

          {/* ═══════ SECCIÓN 4: Visibilidad y Segmentación ═══════ */}
          <div className="space-y-3">
            <SectionHeader icon={Eye} label="Segmentación de Oportunidades" />

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateField('visibilidad', 'publico-general')}
                className={cn(
                  'rounded-xl border p-3 text-left transition-all',
                  form.visibilidad === 'publico-general'
                    ? 'border-blue-500/40 bg-blue-500/10 ring-1 ring-blue-500/20'
                    : 'border-border/40 bg-card/40 hover:border-border/60',
                )}
              >
                <Eye className="h-4 w-4 text-blue-400 mb-1.5" />
                <p className="text-xs font-semibold text-foreground">Público General</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Visible para todo usuario en oportunidades
                </p>
              </button>
              <button
                type="button"
                onClick={() => updateField('visibilidad', 'perfilado-core')}
                className={cn(
                  'rounded-xl border p-3 text-left transition-all',
                  form.visibilidad === 'perfilado-core'
                    ? 'border-purple-500/40 bg-purple-500/10 ring-1 ring-purple-500/20'
                    : 'border-border/40 bg-card/40 hover:border-border/60',
                )}
              >
                <Lock className="h-4 w-4 text-purple-400 mb-1.5" />
                <p className="text-xs font-semibold text-foreground">Perfilado Core</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  Solo visible para perfiles que cumplan los criterios
                </p>
              </button>
            </div>

            {form.visibilidad === 'perfilado-core' && (
              <div className="space-y-3 animate-fade-in">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <DollarSign className="h-3 w-3" /> Ingreso Mínimo Mensual
                    </Label>
                    <Input
                      type="number"
                      placeholder="ej. 5000000"
                      value={form.ingresoMinimo}
                      onChange={(e) => updateField('ingresoMinimo', e.target.value)}
                      className="h-9 text-sm bg-secondary/40 border-border/40 font-mono focus:border-purple-500/40"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                      <TrendingUp className="h-3 w-3" /> Score FIS Mínimo
                    </Label>
                    <Input
                      type="number"
                      placeholder="ej. 650"
                      value={form.scoreFisMinimo}
                      onChange={(e) => updateField('scoreFisMinimo', e.target.value)}
                      className="h-9 text-sm bg-secondary/40 border-border/40 font-mono focus:border-purple-500/40"
                    />
                  </div>
                </div>
                <p className="text-[10px] text-purple-400/70">
                  Solo los clientes que cumplan ambos criterios verán este proyecto en su feed de oportunidades.
                </p>
              </div>
            )}
          </div>

          {/* Separator */}
          <div className="border-t border-border/30" />

          {/* ═══════ SECCIÓN 5: Ficha Técnica Residencial ═══════ */}
          <div className="space-y-3">
            <SectionHeader icon={Ruler} label="Ficha Técnica Residencial" />

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Ruler className="h-3 w-3" /> Área Construida
                </Label>
                <Input
                  placeholder="ej. Desde 52m² hasta 78m²"
                  value={form.areaConstruida}
                  onChange={(e) => updateField('areaConstruida', e.target.value)}
                  className="h-9 text-sm bg-secondary/40 border-border/40 focus:border-blue-500/40"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <BedDouble className="h-3 w-3" /> N° de Alcobas
                </Label>
                <Input
                  type="number"
                  placeholder="ej. 3"
                  value={form.alcobas}
                  onChange={(e) => updateField('alcobas', e.target.value)}
                  className="h-9 text-sm bg-secondary/40 border-border/40 font-mono focus:border-blue-500/40"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                  <Bath className="h-3 w-3" /> N° de Baños
                </Label>
                <Input
                  type="number"
                  placeholder="ej. 2"
                  value={form.banos}
                  onChange={(e) => updateField('banos', e.target.value)}
                  className="h-9 text-sm bg-secondary/40 border-border/40 font-mono focus:border-blue-500/40"
                />
              </div>
              <div className="space-y-1.5 flex flex-col justify-end">
                <div className="flex items-center justify-between rounded-lg border border-border/40 bg-card/40 p-2.5 h-9">
                  <Label className="text-xs text-muted-foreground cursor-pointer flex items-center gap-1.5" htmlFor="parqueadero">
                    <Car className="h-3 w-3" /> Parqueadero
                  </Label>
                  <Switch
                    id="parqueadero"
                    checked={form.parqueadero}
                    onCheckedChange={(v) => updateField('parqueadero', v)}
                  />
                </div>
              </div>
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
                disabled={!isValid || submitted}
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
