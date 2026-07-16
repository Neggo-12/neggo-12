import { useState, useCallback, useEffect } from 'react';
import {
  Plus, Loader2, CheckCircle2, Building2, Home, Sparkles,
  Clock, FileText, ChevronRight, Shield, AlertTriangle, Store, Bell,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { usePortalStore } from '@/features/portal/store/usePortalStore';
import type { SolicitudProductType, SolicitudCliente } from '@/features/portal/store/usePortalStore';
import { useClienteProfile } from '@/hooks/useClienteProfile';
import { cn, normalizeCiudad } from '@/lib/utils';
import { fetchBancosAprobados, fetchNegociosCuradosBySector } from '@/core/db/repositories';
import type { NegocioCuradoRow } from '@/core/db/repositories';
import { COMUNAS_MEDELLIN, CIUDADES, SUBCATEGORIAS } from '@/types';
import type { GoalCategory } from '@/types';

// ───── Product types for the Bancos form ─────

const PRODUCT_TYPES: { id: SolicitudProductType; label: string }[] = [
  { id: 'compra-cartera', label: 'Compra de Cartera' },
  { id: 'credito-hipotecario', label: 'Crédito Hipotecario' },
  { id: 'cdt', label: 'CDT' },
  { id: 'libre-inversion', label: 'Libre Inversión' },
  { id: 'retanqueo', label: 'Retanqueo' },
  { id: 'tarjeta-credito', label: 'Tarjeta de Crédito' },
];

const PRODUCT_LABELS: Record<SolicitudProductType, string> = {
  'compra-cartera': 'Compra de Cartera',
  'credito-hipotecario': 'Crédito Hipotecario',
  cdt: 'CDT',
  'libre-inversion': 'Libre Inversión',
  retanqueo: 'Retanqueo',
  'tarjeta-credito': 'Tarjeta de Crédito',
};

const TIPO_VIVIENDA_OPTIONS: { value: string; label: string }[] = [
  { value: 'apartamento', label: 'Apartamento' },
  { value: 'casa', label: 'Casa' },
  { value: 'apartaestudio', label: 'Apartaestudio' },
  { value: 'casa-campestre', label: 'Casa Campestre' },
  { value: 'lote', label: 'Lote' },
];

const ESTRATO_OPTIONS = [1, 2, 3, 4, 5, 6];

/** Las 15 categorías de la taxonomía compartida — se derivan de SUBCATEGORIAS, sin duplicar una 4ta lista hardcodeada. */
const CATEGORIA_OPTIONS = Object.keys(SUBCATEGORIAS) as GoalCategory[];

// ───── Solicitud Dialog — Bancos (idéntico al flujo anterior, solo renombrado) ─────

function SolicitudBancoDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addSolicitudBanco, addSenalInteres } = usePortalStore();
  const [productType, setProductType] = useState<SolicitudProductType | null>(null);
  const [bancos, setBancos] = useState<{ id: string; name: string }[]>([]);
  const [curados, setCurados] = useState<NegocioCuradoRow[]>([]);
  const [isLoadingBancos, setIsLoadingBancos] = useState(true);
  const [loadBancosError, setLoadBancosError] = useState<string | null>(null);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done'>('idle');

  useEffect(() => {
    if (!open) return;
    setIsLoadingBancos(true);
    setLoadBancosError(null);
    Promise.all([fetchBancosAprobados(), fetchNegociosCuradosBySector('banco')]).then(
      ([bancosRes, curadosRes]) => {
        if (bancosRes.error) {
          setLoadBancosError(bancosRes.error);
        } else {
          setBancos(bancosRes.data ?? []);
        }
        setCurados(curadosRes.data ?? []);
        setIsLoadingBancos(false);
      },
    );
  }, [open]);

  const toggleId = useCallback((id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((b) => b !== id) : [...prev, id],
    );
  }, []);

  const selectedBancos = bancos.filter((b) => selectedIds.includes(b.id));
  const selectedCurados = curados.filter((c) => selectedIds.includes(`curated:${c.id}`));
  const canSubmit = productType !== null && selectedIds.length > 0 && submitState === 'idle';

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !productType) return;
    setSubmitState('loading');

    const bancoSuccess =
      selectedBancos.length > 0
        ? await addSolicitudBanco({
            id: `SOL-${Date.now().toString(36).toUpperCase()}`,
            productType,
            bancos: selectedBancos.map((b) => ({ organizationId: b.id, nombre: b.name })),
          })
        : true;

    const senalResults = await Promise.all(
      selectedCurados.map((c, i) =>
        addSenalInteres({
          id: `SEN-${Date.now().toString(36).toUpperCase()}-${i}`,
          sector: 'banco',
          negocioDeseado: c.nombre,
          productoBancario: productType,
        }),
      ),
    );

    if (!bancoSuccess || senalResults.some((ok) => !ok)) {
      setSubmitState('idle');
      return;
    }

    setSubmitState('done');
    setTimeout(() => {
      setSubmitState('idle');
      setProductType(null);
      setSelectedIds([]);
      onOpenChange(false);
    }, 1500);
  }, [canSubmit, productType, selectedBancos, selectedCurados, addSolicitudBanco, addSenalInteres, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
            Nueva Solicitud Financiera
          </DialogTitle>
          <DialogDescription className="text-sm">
            Configura tu solicitud y selecciona los bancos que quieres que te contacten.
          </DialogDescription>
        </DialogHeader>

        {submitState === 'done' ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">Solicitud enviada</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Tus datos fueron enviados a {selectedIds.length} banco
              {selectedIds.length > 1 ? 's' : ''}. Un asesor te contactará pronto.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tipo de Producto
              </label>
              <Select
                value={productType ?? ''}
                onValueChange={(val) => setProductType(val as SolicitudProductType)}
              >
                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                  <SelectValue placeholder="Selecciona el tipo de producto..." />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl">
                  {PRODUCT_TYPES.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id} className="cursor-pointer text-sm">
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Bancos de Interés
              </label>
              <p className="text-[11px] text-muted-foreground">
                Selecciona las entidades que quieres que reciban tu solicitud
              </p>
              {isLoadingBancos ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                  <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando bancos disponibles...
                </div>
              ) : loadBancosError ? (
                <div className="flex items-center gap-2 text-xs text-red-400 py-2">
                  <AlertTriangle className="h-3.5 w-3.5" /> No se pudieron cargar los bancos.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {bancos.map((banco) => {
                    const isSelected = selectedIds.includes(banco.id);
                    return (
                      <button
                        key={banco.id}
                        type="button"
                        onClick={() => toggleId(banco.id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200',
                          isSelected
                            ? 'border-blue-500/40 bg-blue-500/10 text-blue-400 shadow-sm'
                            : 'border-border/50 bg-secondary/40 text-muted-foreground hover:border-border/70 hover:text-foreground',
                        )}
                      >
                        <Building2 className="h-3 w-3" />
                        {banco.name}
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
                      </button>
                    );
                  })}
                  {curados.map((curado) => {
                    const id = `curated:${curado.id}`;
                    const isSelected = selectedIds.includes(id);
                    return (
                      <button
                        key={id}
                        type="button"
                        onClick={() => toggleId(id)}
                        className={cn(
                          'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200',
                          isSelected
                            ? 'border-blue-500/40 bg-blue-500/10 text-blue-400 shadow-sm'
                            : 'border-border/50 bg-secondary/40 text-muted-foreground hover:border-border/70 hover:text-foreground',
                        )}
                      >
                        <Building2 className="h-3 w-3" />
                        {curado.nombre}
                        <span className="text-[9px] px-1 py-0.5 rounded-full bg-amber-500/10 text-amber-400 border border-amber-500/20">
                          No registrado
                        </span>
                        {isSelected && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
                      </button>
                    );
                  })}
                  {bancos.length === 0 && curados.length === 0 && (
                    <p className="text-xs text-muted-foreground">No hay bancos aprobados todavía.</p>
                  )}
                </div>
              )}
            </div>

            {productType && selectedIds.length > 0 && (
              <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                <p className="text-xs text-blue-400 font-medium text-center">
                  Solicitarás{' '}
                  <span className="font-semibold">
                    {PRODUCT_TYPES.find((p) => p.id === productType)?.label}
                  </span>{' '}
                  a {selectedIds.length} banco{selectedIds.length > 1 ? 's' : ''}:{' '}
                  {[...selectedBancos.map((b) => b.name), ...selectedCurados.map((c) => c.nombre)].join(', ')}
                </p>
              </div>
            )}

            <Button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={cn(
                'w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {submitState === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando solicitud...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ───── Solicitud Dialog — Constructoras (nuevo) ─────

function SolicitudConstructoraDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addSolicitudConstructora, addSenalInteres } = usePortalStore();
  const [tipoVivienda, setTipoVivienda] = useState<string | null>(null);
  const [comuna, setComuna] = useState<string | null>(null);
  const [estrato, setEstrato] = useState<number | null>(null);
  const [ciudad, setCiudad] = useState<string | null>(null);
  const [presupuestoMin, setPresupuestoMin] = useState('');
  const [presupuestoMax, setPresupuestoMax] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done' | 'fallback'>('idle');
  const [curados, setCurados] = useState<NegocioCuradoRow[]>([]);
  const [isLoadingCurados, setIsLoadingCurados] = useState(false);
  const [selectedCuradoId, setSelectedCuradoId] = useState<string | null>(null);
  const [senalSubmitState, setSenalSubmitState] = useState<'idle' | 'loading' | 'done'>('idle');

  const canSubmit =
    tipoVivienda !== null &&
    ciudad !== null &&
    presupuestoMin.trim() !== '' &&
    presupuestoMax.trim() !== '' &&
    submitState === 'idle';

  const resetAndClose = useCallback(() => {
    setSubmitState('idle');
    setSenalSubmitState('idle');
    setTipoVivienda(null);
    setComuna(null);
    setEstrato(null);
    setCiudad(null);
    setPresupuestoMin('');
    setPresupuestoMax('');
    setCurados([]);
    setSelectedCuradoId(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !tipoVivienda || !ciudad) return;
    setSubmitState('loading');

    const solicitudId = `SOL-${Date.now().toString(36).toUpperCase()}`;
    const success = await addSolicitudConstructora({
      id: solicitudId,
      tipoVivienda,
      comuna: comuna ?? undefined,
      ciudad,
      estrato: estrato ?? undefined,
      presupuestoMin: Number(presupuestoMin),
      presupuestoMax: Number(presupuestoMax),
    });

    if (!success) {
      setSubmitState('idle');
      return;
    }

    const creada = usePortalStore.getState().solicitudes.find((s) => s.id === solicitudId);
    if (creada && creada.origen === 'constructora' && creada.status === 'Sin destinatarios disponibles') {
      setSubmitState('fallback');
      setIsLoadingCurados(true);
      const { data } = await fetchNegociosCuradosBySector('constructora');
      setCurados((data ?? []).filter((c) => !c.ciudad || normalizeCiudad(c.ciudad) === normalizeCiudad(ciudad)));
      setIsLoadingCurados(false);
      return;
    }

    setSubmitState('done');
    setTimeout(resetAndClose, 1800);
  }, [canSubmit, tipoVivienda, comuna, ciudad, estrato, presupuestoMin, presupuestoMax, addSolicitudConstructora, resetAndClose]);

  const handleSenalSubmit = useCallback(async () => {
    if (!tipoVivienda || !ciudad) return;
    const curado = selectedCuradoId ? curados.find((c) => c.id === selectedCuradoId) : undefined;
    if (curados.length > 0 && !curado) return;
    setSenalSubmitState('loading');
    const ok = await addSenalInteres({
      id: `SEN-${Date.now().toString(36).toUpperCase()}`,
      sector: 'constructora',
      negocioDeseado: curado?.nombre,
      tipoVivienda,
      ciudad,
    });
    if (!ok) {
      setSenalSubmitState('idle');
      return;
    }
    setSenalSubmitState('done');
    setTimeout(resetAndClose, 1500);
  }, [curados, selectedCuradoId, tipoVivienda, ciudad, addSenalInteres, resetAndClose]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Home className="h-5 w-5 text-blue-400" />
            Nueva Solicitud Inmobiliaria
          </DialogTitle>
          <DialogDescription className="text-sm">
            Cuéntanos qué buscas y conectamos con las constructoras que tengan proyectos para ti.
          </DialogDescription>
        </DialogHeader>

        {submitState === 'done' ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              {senalSubmitState === 'done' ? 'Interés registrado' : 'Solicitud enviada'}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {senalSubmitState === 'done'
                ? 'Te avisaremos cuando se una a Neggo.'
                : 'Un asesor de las constructoras que hagan match te contactará pronto.'}
            </p>
          </div>
        ) : submitState === 'fallback' ? (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs text-amber-400 font-medium">
                No encontramos constructoras que hagan match. ¿Te interesa alguna de estas?
              </p>
            </div>
            {isLoadingCurados ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando negocios conocidos...
              </div>
            ) : curados.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Por ahora no tenemos ningún Negocio de Interés conocido en {ciudad}. Puedes registrar
                  tu interés igual — te avisaremos cuando aparezca una constructora que haga match.
                </p>
                <Button
                  disabled={senalSubmitState === 'loading'}
                  onClick={handleSenalSubmit}
                  className="w-full h-11 gap-2 font-semibold text-sm rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                >
                  {senalSubmitState === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registrando interés...
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4" />
                      Registrar interés de todas formas
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Constructoras conocidas en {ciudad}
                </label>
                <Select value={selectedCuradoId ?? ''} onValueChange={setSelectedCuradoId}>
                  <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                    <SelectValue placeholder="Selecciona una constructora..." />
                  </SelectTrigger>
                  <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl">
                    {curados.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="cursor-pointer text-sm">
                        {c.nombre} <span className="text-muted-foreground">(No registrado)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!selectedCuradoId || senalSubmitState === 'loading'}
                  onClick={handleSenalSubmit}
                  className={cn(
                    'w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
                    selectedCuradoId
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-muted text-muted-foreground cursor-not-allowed',
                  )}
                >
                  {senalSubmitState === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registrando interés...
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4" />
                      Registrar interés
                    </>
                  )}
                </Button>
              </div>
            )}
            <button
              type="button"
              onClick={resetAndClose}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              No, gracias — cerrar
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tipo de Vivienda
              </label>
              <div className="grid grid-cols-2 gap-2">
                {TIPO_VIVIENDA_OPTIONS.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTipoVivienda(t.value)}
                    className={cn(
                      'rounded-lg border px-3 py-2.5 text-xs font-medium transition-all duration-200',
                      tipoVivienda === t.value
                        ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                        : 'border-border/40 bg-card/40 text-muted-foreground hover:text-foreground hover:border-border/60',
                    )}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ciudad</label>
              <Select value={ciudad ?? ''} onValueChange={setCiudad}>
                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                  <SelectValue placeholder="Selecciona tu ciudad..." />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl">
                  {CIUDADES.map((c) => (
                    <SelectItem key={c} value={c} className="cursor-pointer text-sm">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Comuna <span className="normal-case font-normal text-muted-foreground/70">(opcional, solo informativo)</span>
              </label>
              <Select value={comuna ?? ''} onValueChange={setComuna}>
                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                  <SelectValue placeholder="Selecciona tu comuna..." />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl max-h-64">
                  {COMUNAS_MEDELLIN.map((c) => (
                    <SelectItem key={c.value} value={c.value} className="cursor-pointer text-sm">{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Estrato <span className="normal-case font-normal text-muted-foreground/70">(opcional)</span>
              </label>
              <Select value={estrato?.toString() ?? ''} onValueChange={(v) => setEstrato(Number(v))}>
                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                  <SelectValue placeholder="Selecciona tu estrato..." />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl">
                  {ESTRATO_OPTIONS.map((e) => (
                    <SelectItem key={e} value={e.toString()} className="cursor-pointer text-sm">Estrato {e}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Presupuesto (COP)
              </label>
              <div className="grid grid-cols-2 gap-3">
                <input
                  type="number"
                  placeholder="Desde"
                  value={presupuestoMin}
                  onChange={(e) => setPresupuestoMin(e.target.value)}
                  className="h-11 rounded-xl border border-border/60 bg-secondary/50 px-3 text-sm font-mono"
                />
                <input
                  type="number"
                  placeholder="Hasta"
                  value={presupuestoMax}
                  onChange={(e) => setPresupuestoMax(e.target.value)}
                  className="h-11 rounded-xl border border-border/60 bg-secondary/50 px-3 text-sm font-mono"
                />
              </div>
            </div>

            <Button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={cn(
                'w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {submitState === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando constructoras...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ───── Solicitud Dialog — Comercios (nuevo) ─────

function SolicitudComercioDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addSolicitudComercio, addSenalInteres } = usePortalStore();
  const [categoria, setCategoria] = useState<GoalCategory | null>(null);
  const [subcategoria, setSubcategoria] = useState<string | null>(null);
  const [ciudad, setCiudad] = useState<string | null>(null);
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done' | 'fallback'>('idle');
  const [curados, setCurados] = useState<NegocioCuradoRow[]>([]);
  const [isLoadingCurados, setIsLoadingCurados] = useState(false);
  const [selectedCuradoId, setSelectedCuradoId] = useState<string | null>(null);
  const [senalSubmitState, setSenalSubmitState] = useState<'idle' | 'loading' | 'done'>('idle');

  const subOptions = categoria ? SUBCATEGORIAS[categoria] : [];
  const canSubmit = categoria !== null && ciudad !== null && submitState === 'idle';

  const resetAndClose = useCallback(() => {
    setSubmitState('idle');
    setSenalSubmitState('idle');
    setCategoria(null);
    setSubcategoria(null);
    setCiudad(null);
    setCurados([]);
    setSelectedCuradoId(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const handleSubmit = useCallback(async () => {
    if (!canSubmit || !categoria || !ciudad) return;
    setSubmitState('loading');

    const solicitudId = `SOL-${Date.now().toString(36).toUpperCase()}`;
    const success = await addSolicitudComercio({
      id: solicitudId,
      categoria,
      subcategoria: subcategoria ?? undefined,
      ciudad,
    });

    if (!success) {
      setSubmitState('idle');
      return;
    }

    const creada = usePortalStore.getState().solicitudes.find((s) => s.id === solicitudId);
    if (creada && creada.origen === 'comercio' && creada.status === 'Sin destinatarios disponibles') {
      setSubmitState('fallback');
      setIsLoadingCurados(true);
      const { data } = await fetchNegociosCuradosBySector('comercio');
      setCurados((data ?? []).filter((c) => !c.ciudad || normalizeCiudad(c.ciudad) === normalizeCiudad(ciudad)));
      setIsLoadingCurados(false);
      return;
    }

    setSubmitState('done');
    setTimeout(resetAndClose, 1800);
  }, [canSubmit, categoria, subcategoria, ciudad, addSolicitudComercio, resetAndClose]);

  const handleSenalSubmit = useCallback(async () => {
    if (!categoria || !ciudad) return;
    const curado = selectedCuradoId ? curados.find((c) => c.id === selectedCuradoId) : undefined;
    if (curados.length > 0 && !curado) return;
    setSenalSubmitState('loading');
    const ok = await addSenalInteres({
      id: `SEN-${Date.now().toString(36).toUpperCase()}`,
      sector: 'comercio',
      negocioDeseado: curado?.nombre,
      categoria,
      subcategoria: subcategoria ?? undefined,
      ciudad,
    });
    if (!ok) {
      setSenalSubmitState('idle');
      return;
    }
    setSenalSubmitState('done');
    setTimeout(resetAndClose, 1500);
  }, [curados, selectedCuradoId, categoria, subcategoria, ciudad, addSenalInteres, resetAndClose]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Store className="h-5 w-5 text-blue-400" />
            Nueva Solicitud a Comercio
          </DialogTitle>
          <DialogDescription className="text-sm">
            Elige qué buscas y te conectamos con un comercio aliado que coincida exactamente.
          </DialogDescription>
        </DialogHeader>

        {submitState === 'done' ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              {senalSubmitState === 'done' ? 'Interés registrado' : 'Solicitud enviada'}
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              {senalSubmitState === 'done'
                ? 'Te avisaremos cuando se una a Neggo.'
                : 'Un asesor del comercio seleccionado te contactará pronto.'}
            </p>
          </div>
        ) : submitState === 'fallback' ? (
          <div className="space-y-4 animate-fade-in">
            <div className="rounded-lg bg-amber-500/5 border border-amber-500/20 p-3">
              <p className="text-xs text-amber-400 font-medium">
                No encontramos comercios que hagan match. ¿Te interesa alguno de estos?
              </p>
            </div>
            {isLoadingCurados ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Buscando negocios conocidos...
              </div>
            ) : curados.length === 0 ? (
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground">
                  Por ahora no tenemos ningún Negocio de Interés conocido en {ciudad}. Puedes registrar
                  tu interés igual — te avisaremos cuando aparezca un comercio que haga match.
                </p>
                <Button
                  disabled={senalSubmitState === 'loading'}
                  onClick={handleSenalSubmit}
                  className="w-full h-11 gap-2 font-semibold text-sm rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20"
                >
                  {senalSubmitState === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registrando interés...
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4" />
                      Registrar interés de todas formas
                    </>
                  )}
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Comercios conocidos en {ciudad}
                </label>
                <Select value={selectedCuradoId ?? ''} onValueChange={setSelectedCuradoId}>
                  <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                    <SelectValue placeholder="Selecciona un comercio..." />
                  </SelectTrigger>
                  <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl">
                    {curados.map((c) => (
                      <SelectItem key={c.id} value={c.id} className="cursor-pointer text-sm">
                        {c.nombre} <span className="text-muted-foreground">(No registrado)</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  disabled={!selectedCuradoId || senalSubmitState === 'loading'}
                  onClick={handleSenalSubmit}
                  className={cn(
                    'w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
                    selectedCuradoId
                      ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                      : 'bg-muted text-muted-foreground cursor-not-allowed',
                  )}
                >
                  {senalSubmitState === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Registrando interés...
                    </>
                  ) : (
                    <>
                      <Bell className="h-4 w-4" />
                      Registrar interés
                    </>
                  )}
                </Button>
              </div>
            )}
            <button
              type="button"
              onClick={resetAndClose}
              className="w-full text-center text-xs text-muted-foreground hover:text-foreground transition-colors py-1"
            >
              No, gracias — cerrar
            </button>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Categoría
              </label>
              <Select
                value={categoria ?? ''}
                onValueChange={(val) => {
                  setCategoria(val as GoalCategory);
                  setSubcategoria(null);
                }}
              >
                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                  <SelectValue placeholder="¿Qué estás buscando?" />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl">
                  {CATEGORIA_OPTIONS.map((cat) => (
                    <SelectItem key={cat} value={cat} className="cursor-pointer text-sm">{cat}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {categoria && subOptions.length > 0 && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Subcategoría <span className="normal-case font-normal text-muted-foreground/70">(opcional)</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {subOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSubcategoria(subcategoria === opt.value ? null : opt.value)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                        subcategoria === opt.value
                          ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
                          : 'border-border/40 bg-card/40 text-muted-foreground hover:text-foreground hover:border-border/60',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Ciudad</label>
              <Select value={ciudad ?? ''} onValueChange={setCiudad}>
                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                  <SelectValue placeholder="Selecciona tu ciudad..." />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl">
                  {CIUDADES.map((c) => (
                    <SelectItem key={c} value={c} className="cursor-pointer text-sm">{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <Button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={cn(
                'w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {submitState === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Buscando comercio...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ───── Helpers de historial ─────

function joinDestinatarios(destinatarios: string[]): string {
  if (destinatarios.length === 1) return destinatarios[0];
  return `${destinatarios.slice(0, -1).join(', ')} y ${destinatarios[destinatarios.length - 1]}`;
}

function solicitudResumen(sol: SolicitudCliente): string {
  const fecha = new Date(sol.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' });
  if (sol.origen === 'senal-interes') {
    const destino =
      sol.negocioDeseado ??
      (sol.sector === 'comercio'
        ? sol.categoria ?? 'un comercio'
        : sol.sector === 'constructora'
          ? (sol.tipoVivienda ? `vivienda tipo ${sol.tipoVivienda}` : 'una constructora')
          : 'un negocio');
    return `Interés registrado en ${destino} — Te avisaremos cuando se una a Neggo (${fecha})`;
  }
  const destino = sol.destinatarios.length > 0 ? `a ${joinDestinatarios(sol.destinatarios)}` : 'enviada';
  if (sol.origen === 'banco') {
    return `Solicitud ${destino} — ${PRODUCT_LABELS[sol.productType]} — ${fecha}`;
  }
  if (sol.origen === 'constructora') {
    const tipo = TIPO_VIVIENDA_OPTIONS.find((t) => t.value === sol.tipoVivienda)?.label ?? sol.tipoVivienda;
    return `Solicitud ${destino} — ${tipo} en ${sol.ciudad} — ${fecha}`;
  }
  const sub = sol.subcategoria
    ? SUBCATEGORIAS[sol.categoria as GoalCategory]?.find((s) => s.value === sol.subcategoria)?.label
    : undefined;
  return `Solicitud ${destino} — ${sol.categoria}${sub ? ` / ${sub}` : ''} — ${fecha}`;
}

// ───── Main MeInteresaView ─────

type Sector = 'banco' | 'constructora' | 'comercio';

export default function MeInteresaView() {
  const { solicitudes, hydrateSolicitudes } = usePortalStore();
  const { ciudad, scoreEstimado, status: perfilStatus } = useClienteProfile();
  const perfilCompleto = perfilStatus === 'ready' && ciudad !== null && scoreEstimado !== null;
  const [sector, setSector] = useState<Sector>('banco');
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  useEffect(() => {
    void hydrateSolicitudes();
  }, [hydrateSolicitudes]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Building2 className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Me Interesa</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Pide contacto directo con bancos, constructoras o comercios. A diferencia de Metas, aquí tu
            información se comparte de inmediato con quien elijas.
          </p>
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className={cn(
            'shrink-0 h-10 gap-2 rounded-xl px-5 font-semibold text-sm',
            'bg-blue-600 hover:bg-blue-500 text-white',
            'shadow-lg shadow-blue-600/20',
            'transition-all duration-200 hover:shadow-blue-600/30 hover:scale-[1.02]',
          )}
        >
          <Plus className="h-4 w-4" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Sector selector */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setSector('banco')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
            sector === 'banco'
              ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
              : 'border-border/40 bg-card/40 text-muted-foreground hover:text-foreground',
          )}
        >
          <Building2 className="h-3.5 w-3.5" />
          Bancos
        </button>
        <button
          type="button"
          onClick={() => setSector('constructora')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
            sector === 'constructora'
              ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
              : 'border-border/40 bg-card/40 text-muted-foreground hover:text-foreground',
          )}
        >
          <Home className="h-3.5 w-3.5" />
          Constructoras
        </button>
        <button
          type="button"
          onClick={() => setSector('comercio')}
          className={cn(
            'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
            sector === 'comercio'
              ? 'border-blue-500/40 bg-blue-500/10 text-blue-400'
              : 'border-border/40 bg-card/40 text-muted-foreground hover:text-foreground',
          )}
        >
          <Store className="h-3.5 w-3.5" />
          Comercios
        </button>
      </div>

      {/* Privacy assurance banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Shield className="h-4 w-4 text-blue-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-blue-400">Contacto directo, no anónimo</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            A diferencia de Metas/IFC, aquí el negocio que elijas ve tu nombre y teléfono de
            inmediato para poder contactarte
            {perfilCompleto ? ` (score ${scoreEstimado}, ciudad ${ciudad})` : ''}.
          </p>
        </div>
      </div>

      {/* Solicitudes history */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Historial de Solicitudes
        </h3>

        {solicitudes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-1">Sin solicitudes aún</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              Crea tu primera solicitud y deja que los bancos, constructoras y comercios aliados de Neggo
              compitan por ti.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {solicitudes.map((sol) => (
              <div
                key={sol.id}
                className="group rounded-xl border border-border/40 bg-card/60 p-4 transition-all duration-200 hover:border-border/60 hover:bg-card/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                      {sol.origen === 'banco' ? (
                        <Building2 className="h-4 w-4 text-blue-400" />
                      ) : sol.origen === 'constructora' ? (
                        <Home className="h-4 w-4 text-blue-400" />
                      ) : sol.origen === 'comercio' ? (
                        <Store className="h-4 w-4 text-blue-400" />
                      ) : (
                        <Bell className="h-4 w-4 text-violet-400" />
                      )}
                    </div>
                    <div className="min-w-0 space-y-0.5">
                      <p className="text-sm font-medium text-foreground truncate">
                        {solicitudResumen(sol)}
                      </p>
                      <p className="text-[10px] text-muted-foreground/70">ID: {sol.id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <Badge
                      className={cn(
                        'text-[10px] px-2 py-0.5 font-medium rounded-full',
                        sol.origen === 'senal-interes'
                          ? 'bg-violet-500/10 text-violet-400 border-violet-500/20'
                          : sol.status === 'Sin destinatarios disponibles'
                            ? 'bg-red-500/10 text-red-400 border-red-500/20'
                            : 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                      )}
                    >
                      {sol.origen === 'senal-interes' ? (
                        <Sparkles className="h-2.5 w-2.5 mr-1" />
                      ) : (
                        <Clock className="h-2.5 w-2.5 mr-1" />
                      )}
                      {sol.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Solicitud Dialogs */}
      {sector === 'banco' ? (
        <SolicitudBancoDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      ) : sector === 'constructora' ? (
        <SolicitudConstructoraDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      ) : (
        <SolicitudComercioDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
      )}
    </div>
  );
}
