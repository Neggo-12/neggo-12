import { useState } from 'react';
import {
  Megaphone, Calendar, DollarSign, MapPin, Target,
  Building2, FileText, Plus, Check, Sparkles, Percent,
  TrendingUp, TrendingDown,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

const campaignTypes: { value: string; label: string }[] = [
  { value: 'cdt', label: 'CDT' },
  { value: 'hipotecario', label: 'Hipotecario' },
  { value: 'compra-cartera', label: 'Compra Cartera' },
  { value: 'tarjetas', label: 'Tarjetas' },
  { value: 'libranzas', label: 'Libranzas' },
  { value: 'vehiculos', label: 'Vehículos' },
  { value: 'inversiones', label: 'Inversiones' },
];

const banksList = [
  'Bancolombia', 'Davivienda', 'BBVA',
  'Banco de Bogotá', 'Scotiabank', 'Itaú',
];

const citiesList = [
  'Bogotá', 'Medellín', 'Cali',
  'Barranquilla', 'Cartagena', 'Bucaramanga',
  'Pereira', 'Manizales', 'Santa Marta',
];

interface CampanaForm {
  name: string;
  type: string;
  bank: string;
  budget: string;
  tasa: string;
  minScore: string;
  maxScore: string;
  startDate: string;
  endDate: string;
  cities: string[];
  objective: string;
  description: string;
}

const initialForm: CampanaForm = {
  name: '',
  type: '',
  bank: '',
  budget: '',
  tasa: '',
  minScore: '',
  maxScore: '',
  startDate: '',
  endDate: '',
  cities: [],
  objective: '',
  description: '',
};

export default function CrearCampanaDialog() {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CampanaForm>(initialForm);
  const [submitted, setSubmitted] = useState(false);

  const updateField = <K extends keyof CampanaForm>(key: K, value: CampanaForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCity = (city: string) => {
    setForm((prev) => ({
      ...prev,
      cities: prev.cities.includes(city)
        ? prev.cities.filter((c) => c !== city)
        : [...prev.cities, city],
    }));
  };

  const isValid =
    form.name.trim() !== '' &&
    form.type !== '' &&
    form.bank !== '' &&
    form.budget !== '' &&
    form.tasa !== '' &&
    form.minScore !== '' &&
    form.maxScore !== '' &&
    form.startDate !== '' &&
    form.endDate !== '' &&
    form.cities.length > 0;

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

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button
          className="gap-2 bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/20 transition-all hover:shadow-primary/30 hover:scale-[1.02]"
        >
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Crear Campaña</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-xl border-border/60 bg-card/95 backdrop-blur-xl p-0 gap-0">
        {/* Header with gradient top bar */}
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 glow-green">
                <Megaphone className="h-4.5 w-4.5 text-emerald-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">
                  Nueva Campaña Financiera
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Configura los parámetros de la campaña para captación de leads
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        {/* Form body */}
        <div className="px-6 py-2 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
          {/* Nombre */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Nombre de la Campaña
            </Label>
            <Input
              placeholder="ej. CDT Primavera 2025"
              value={form.name}
              onChange={(e) => updateField('name', e.target.value)}
              className="h-9 text-sm bg-secondary/40 border-border/40 focus:border-emerald-500/40"
            />
          </div>

          {/* Tipo + Banco */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Target className="h-3 w-3" /> Tipo de Producto
              </Label>
              <Select value={form.type} onValueChange={(v) => updateField('type', v)}>
                <SelectTrigger className="h-9 text-sm bg-secondary/40 border-border/40">
                  <SelectValue placeholder="Seleccionar tipo" />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card">
                  {campaignTypes.map((t) => (
                    <SelectItem key={t.value} value={t.value} className="text-sm">
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Building2 className="h-3 w-3" /> Banco
              </Label>
              <Select value={form.bank} onValueChange={(v) => updateField('bank', v)}>
                <SelectTrigger className="h-9 text-sm bg-secondary/40 border-border/40">
                  <SelectValue placeholder="Seleccionar banco" />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card">
                  {banksList.map((b) => (
                    <SelectItem key={b} value={b} className="text-sm">
                      {b}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Presupuesto + Tasa */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <DollarSign className="h-3 w-3" /> Presupuesto (COP)
              </Label>
              <Input
                type="number"
                placeholder="ej. 50000000"
                value={form.budget}
                onChange={(e) => updateField('budget', e.target.value)}
                className="h-9 text-sm bg-secondary/40 border-border/40 font-mono focus:border-emerald-500/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Percent className="h-3 w-3" /> Tasa de Interés
              </Label>
              <Input
                placeholder="ej. 0.92% MV"
                value={form.tasa}
                onChange={(e) => updateField('tasa', e.target.value)}
                className="h-9 text-sm bg-secondary/40 border-border/40 font-mono focus:border-emerald-500/40"
              />
            </div>
          </div>

          {/* Segmentación por Score */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <TrendingUp className="h-3 w-3" /> Segmentación por Score (Datacrédito)
            </Label>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <TrendingDown className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">Score Mínimo</span>
                </div>
                <Input
                  type="number"
                  placeholder="500"
                  value={form.minScore}
                  onChange={(e) => updateField('minScore', e.target.value)}
                  className="h-9 text-sm bg-secondary/40 border-border/40 font-mono focus:border-emerald-500/40"
                />
              </div>
              <div className="space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <TrendingUp className="h-3 w-3 text-muted-foreground" />
                  <span className="text-[11px] text-muted-foreground">Score Máximo</span>
                </div>
                <Input
                  type="number"
                  placeholder="900"
                  value={form.maxScore}
                  onChange={(e) => updateField('maxScore', e.target.value)}
                  className="h-9 text-sm bg-secondary/40 border-border/40 font-mono focus:border-emerald-500/40"
                />
              </div>
            </div>
            {form.minScore && form.maxScore && (
              <p className="text-[10px] text-muted-foreground">
                Rango: {form.minScore} — {form.maxScore}
                {Number(form.maxScore) - Number(form.minScore) > 0 && (
                  <span className="text-emerald-400"> ({Number(form.maxScore) - Number(form.minScore)} puntos de cobertura)</span>
                )}
              </p>
            )}
          </div>

          {/* Fechas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Fecha de Inicio
              </Label>
              <Input
                type="date"
                value={form.startDate}
                onChange={(e) => updateField('startDate', e.target.value)}
                className="h-9 text-sm bg-secondary/40 border-border/40 focus:border-emerald-500/40"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Calendar className="h-3 w-3" /> Fecha de Cierre
              </Label>
              <Input
                type="date"
                value={form.endDate}
                onChange={(e) => updateField('endDate', e.target.value)}
                className="h-9 text-sm bg-secondary/40 border-border/40 focus:border-emerald-500/40"
              />
            </div>
          </div>

          {/* Ciudades */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Ciudades Objetivo
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {citiesList.map((city) => {
                const selected = form.cities.includes(city);
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => toggleCity(city)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                      selected
                        ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400 shadow-sm'
                        : 'border-border/40 bg-secondary/40 text-muted-foreground hover:border-border/60 hover:text-foreground',
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                    {city}
                  </button>
                );
              })}
            </div>
            {form.cities.length > 0 && (
              <p className="text-[10px] text-muted-foreground">
                {form.cities.length} {form.cities.length === 1 ? 'ciudad seleccionada' : 'ciudades seleccionadas'}
              </p>
            )}
          </div>

          {/* Objetivo */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Target className="h-3 w-3" /> Objetivo de la Campaña
            </Label>
            <Input
              placeholder="ej. Captar 300 leads de crédito hipotecario en Bogotá"
              value={form.objective}
              onChange={(e) => updateField('objective', e.target.value)}
              className="h-9 text-sm bg-secondary/40 border-border/40 focus:border-emerald-500/40"
            />
          </div>

          {/* Descripción */}
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Descripción y Notas
            </Label>
            <Textarea
              placeholder="Detalles adicionales, segmentación, condiciones especiales..."
              value={form.description}
              onChange={(e) => updateField('description', e.target.value)}
              className="min-h-[80px] text-sm bg-secondary/40 border-border/40 resize-none focus:border-emerald-500/40"
            />
          </div>

          {/* Validation summary */}
          {form.name && form.type && (
            <div className="flex items-center gap-2 rounded-lg bg-emerald-500/5 border border-emerald-500/10 px-3 py-2">
              <Sparkles className="h-3.5 w-3.5 text-emerald-400" />
              <div className="text-[11px] text-emerald-400">
                <span className="font-medium">
                  {campaignTypes.find((t) => t.value === form.type)?.label}
                </span>
                <span className="text-muted-foreground"> — </span>
                <span className="text-muted-foreground">{form.bank || 'sin banco'}</span>
                {form.cities.length > 0 && (
                  <>
                    <span className="text-muted-foreground"> — </span>
                    <span className="text-muted-foreground">{form.cities.length} ciudades</span>
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
                <span className="text-emerald-400">Formulario completo</span>
              ) : (
                <span>Completa todos los campos requeridos</span>
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
                  'gap-1.5 bg-emerald-600 hover:bg-emerald-700 min-w-[140px]',
                  submitted && 'bg-emerald-500 pointer-events-none',
                )}
              >
                {submitted ? (
                  <>
                    <Check className="h-4 w-4" />
                    Campaña Creada
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" />
                    Crear Campaña
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
