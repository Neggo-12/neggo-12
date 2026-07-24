import { useState } from 'react';
import {
  Megaphone, MapPin, Target,
  Store, FileText, Plus, Check, Sparkles,
  TrendingUp, Loader2, Radio,
} from 'lucide-react';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle,
  DialogDescription, DialogFooter, DialogTrigger,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { insertCampana, type CampanaSegmentacion } from '@/core/db/repositories';
import { RANGO_INGRESOS_LABELS } from '@/components/crm/leadLabels';
import { CIUDADES } from '@/types';

const RANGOS_INGRESOS = Object.keys(RANGO_INGRESOS_LABELS);

interface CampanaForm {
  titulo: string;
  descripcion: string;
  modoLanzamiento: 'segmentado' | 'alcance_amplio';
  ciudades: string[];
  rangoIngresos: string[];
}

const initialForm: CampanaForm = {
  titulo: '',
  descripcion: '',
  modoLanzamiento: 'segmentado',
  ciudades: [],
  rangoIngresos: [],
};

export default function CrearCampanaComercioDialog({
  organizationId,
  creadoPor,
  comercioNombre,
  onCampanaCreated,
}: {
  organizationId: string | null;
  creadoPor: string | null;
  comercioNombre: string;
  onCampanaCreated?: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CampanaForm>(initialForm);
  const [submitted, setSubmitted] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const updateField = <K extends keyof CampanaForm>(key: K, value: CampanaForm[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCity = (city: string) => {
    setForm((prev) => ({
      ...prev,
      ciudades: prev.ciudades.includes(city) ? prev.ciudades.filter((c) => c !== city) : [...prev.ciudades, city],
    }));
  };

  const toggleRango = (rango: string) => {
    setForm((prev) => ({
      ...prev,
      rangoIngresos: prev.rangoIngresos.includes(rango)
        ? prev.rangoIngresos.filter((r) => r !== rango)
        : [...prev.rangoIngresos, rango],
    }));
  };

  const isValid = form.titulo.trim() !== '' && !!organizationId && !!creadoPor;

  const handleSubmit = async () => {
    if (!isValid || !organizationId || !creadoPor) return;
    setSubmitting(true);

    const segmentacion: CampanaSegmentacion = {
      ciudades: form.ciudades.length > 0 ? form.ciudades : undefined,
      rangoIngresos: form.modoLanzamiento === 'segmentado' && form.rangoIngresos.length > 0 ? form.rangoIngresos : undefined,
    };

    const { error } = await insertCampana({
      id: `CAMP-${Date.now().toString(36).toUpperCase()}`,
      organizationId,
      tipo: 'comercio',
      titulo: form.titulo.trim(),
      descripcion: form.descripcion.trim() || undefined,
      modoLanzamiento: form.modoLanzamiento,
      segmentacion,
      creadoPor,
    });
    setSubmitting(false);

    if (error) {
      toast.error('No se pudo crear la campaña', { description: error });
      return;
    }

    setSubmitted(true);
    onCampanaCreated?.();
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
        <Button className="gap-2 bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition-all hover:shadow-purple-600/30 hover:scale-[1.02]">
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">Crear Campaña</span>
        </Button>
      </DialogTrigger>

      <DialogContent className="max-w-lg border-border/60 bg-card/95 backdrop-blur-xl p-0 gap-0">
        <div className="relative">
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/40 to-transparent" />
          <DialogHeader className="px-6 pt-6 pb-4">
            <div className="flex items-center gap-3 mb-1">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-purple-500/10">
                <Megaphone className="h-4.5 w-4.5 text-purple-400" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-foreground">Nueva Campaña</DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground mt-0.5">
                  Elige quién debe verla — segmentado o alcance amplio.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>
        </div>

        <div className="px-6 py-2 space-y-4 max-h-[60vh] overflow-y-auto scrollbar-thin">
          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Título de la Campaña
            </Label>
            <Input
              placeholder="ej. Descuento de temporada"
              value={form.titulo}
              onChange={(e) => updateField('titulo', e.target.value)}
              className="h-9 text-sm bg-secondary/40 border-border/40 focus:border-purple-500/40"
            />
          </div>

          <div className="rounded-lg border border-purple-500/10 bg-purple-500/5 px-3 py-2 flex items-center gap-2">
            <Store className="h-3.5 w-3.5 text-purple-400 shrink-0" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Comercio Emisor</p>
              <p className="text-xs font-semibold text-purple-400">{comercioNombre}</p>
            </div>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <FileText className="h-3 w-3" /> Descripción <span className="normal-case font-normal text-muted-foreground/70">(opcional)</span>
            </Label>
            <Textarea
              placeholder="Detalles adicionales de la promoción..."
              value={form.descripcion}
              onChange={(e) => updateField('descripcion', e.target.value)}
              className="min-h-[70px] text-sm bg-secondary/40 border-border/40 resize-none focus:border-purple-500/40"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <Radio className="h-3 w-3" /> Modo de Lanzamiento
            </Label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => updateField('modoLanzamiento', 'segmentado')}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-left transition-all',
                  form.modoLanzamiento === 'segmentado'
                    ? 'border-purple-500/40 bg-purple-500/10'
                    : 'border-border/40 bg-secondary/40 hover:border-border/60',
                )}
              >
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Target className="h-3 w-3 text-purple-400" /> Segmentado
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Filtros específicos de público</p>
              </button>
              <button
                type="button"
                onClick={() => updateField('modoLanzamiento', 'alcance_amplio')}
                className={cn(
                  'rounded-lg border px-3 py-2.5 text-left transition-all',
                  form.modoLanzamiento === 'alcance_amplio'
                    ? 'border-purple-500/40 bg-purple-500/10'
                    : 'border-border/40 bg-secondary/40 hover:border-border/60',
                )}
              >
                <p className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Sparkles className="h-3 w-3 text-purple-400" /> Alcance Amplio
                </p>
                <p className="text-[10px] text-muted-foreground mt-0.5">Máxima visibilidad, sin afinar</p>
              </button>
            </div>
          </div>

          {form.modoLanzamiento === 'segmentado' && (
            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <TrendingUp className="h-3 w-3" /> Rango de Ingresos <span className="normal-case font-normal text-muted-foreground/70">(opcional)</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {RANGOS_INGRESOS.map((rango) => {
                  const selected = form.rangoIngresos.includes(rango);
                  return (
                    <button
                      key={rango}
                      type="button"
                      onClick={() => toggleRango(rango)}
                      className={cn(
                        'inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                        selected
                          ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-sm'
                          : 'border-border/40 bg-secondary/40 text-muted-foreground hover:border-border/60 hover:text-foreground',
                      )}
                    >
                      {selected && <Check className="h-3 w-3" />}
                      {RANGO_INGRESOS_LABELS[rango]}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
              <MapPin className="h-3 w-3" /> Ciudades <span className="normal-case font-normal text-muted-foreground/70">(opcional — vacío = todas)</span>
            </Label>
            <div className="flex flex-wrap gap-1.5">
              {CIUDADES.map((city) => {
                const selected = form.ciudades.includes(city);
                return (
                  <button
                    key={city}
                    type="button"
                    onClick={() => toggleCity(city)}
                    className={cn(
                      'inline-flex items-center gap-1 rounded-md border px-2.5 py-1.5 text-xs font-medium transition-all',
                      selected
                        ? 'border-purple-500/30 bg-purple-500/10 text-purple-400 shadow-sm'
                        : 'border-border/40 bg-secondary/40 text-muted-foreground hover:border-border/60 hover:text-foreground',
                    )}
                  >
                    {selected && <Check className="h-3 w-3" />}
                    {city}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <DialogFooter className="px-6 py-4 border-t border-border/40">
          <div className="flex w-full items-center justify-between">
            <div className="text-[10px] text-muted-foreground">
              {isValid ? (
                <span className="text-purple-400">Listo para crear</span>
              ) : (
                <span>Escribe un título para la campaña</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setOpen(false)} className="border-border/40 text-muted-foreground hover:text-foreground">
                Cancelar
              </Button>
              <Button
                size="sm"
                disabled={!isValid || submitted || submitting}
                onClick={handleSubmit}
                className={cn('gap-1.5 bg-purple-600 hover:bg-purple-500 min-w-[140px]', submitted && 'bg-purple-500 pointer-events-none')}
              >
                {submitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creando...
                  </>
                ) : submitted ? (
                  <>
                    <Check className="h-4 w-4" /> Campaña Creada
                  </>
                ) : (
                  <>
                    <Plus className="h-4 w-4" /> Crear Campaña
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
