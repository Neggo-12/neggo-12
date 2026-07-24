import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Gift, MapPin,
  Loader2, CheckCircle2, Sparkles,
  Target, Star, Home, Store, AlertTriangle,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import { usePortalStore, type SolicitudProductType } from '@/features/portal/store/usePortalStore';
import { useRejectionTracking } from '@/hooks/useRejectionTracking';
import { useClienteProfile } from '@/hooks/useClienteProfile';
import { isDbConfigured } from '@/core/db/dbClient';
import {
  fetchCampanasActivas,
  fetchCampanaIdsConSolicitud,
  type CampanaDisplay,
} from '@/core/db/repositories';
import { PRODUCT_LABELS, RANGO_INGRESOS_LABELS } from '@/components/crm/leadLabels';
import type { GoalCategory } from '@/types';

// ───── Matching (client-side, mismo patrón que fetchProyectosMatch/OportunidadesInmobiliariasView) ─────

function matchesCampana(
  campana: CampanaDisplay,
  ciudad: string | null,
  scoreEstimado: number | null,
  rangoIngresos: string | null,
): boolean {
  const seg = campana.segmentacion;
  if (campana.modoLanzamiento === 'alcance_amplio') {
    if (seg.ciudades && seg.ciudades.length > 0) return !!ciudad && seg.ciudades.includes(ciudad);
    return true;
  }
  if (seg.ciudades && seg.ciudades.length > 0 && (!ciudad || !seg.ciudades.includes(ciudad))) return false;
  if (seg.rangoIngresos && seg.rangoIngresos.length > 0 && (!rangoIngresos || !seg.rangoIngresos.includes(rangoIngresos))) return false;
  if (seg.scoreMin !== undefined && (scoreEstimado === null || scoreEstimado < seg.scoreMin)) return false;
  if (seg.scoreMax !== undefined && (scoreEstimado === null || scoreEstimado > seg.scoreMax)) return false;
  return true;
}

function segmentacionChips(campana: CampanaDisplay): string[] {
  const chips: string[] = [];
  const seg = campana.segmentacion;
  if (seg.ciudades && seg.ciudades.length > 0) chips.push(seg.ciudades.join(', '));
  if (seg.producto) chips.push(PRODUCT_LABELS[seg.producto] ?? seg.producto);
  if (seg.rangoIngresos && seg.rangoIngresos.length > 0) {
    chips.push(seg.rangoIngresos.map((r) => RANGO_INGRESOS_LABELS[r] ?? r).join(', '));
  }
  if (seg.scoreMin !== undefined || seg.scoreMax !== undefined) {
    chips.push(`Score ${seg.scoreMin ?? '—'}–${seg.scoreMax ?? '—'}`);
  }
  return chips;
}

// ───── Campaign Card (real, reutilizada por bancos y comercios) ─────

function CampanaOfferCard({
  campana,
  yaSolicitado,
  onSolicitar,
  accent,
}: {
  campana: CampanaDisplay;
  yaSolicitado: boolean;
  onSolicitar: () => Promise<boolean>;
  accent: 'cyan' | 'amber';
}) {
  const [requestState, setRequestState] = useState<'idle' | 'loading' | 'done'>(yaSolicitado ? 'done' : 'idle');
  const [isRejected, setIsRejected] = useState(false);
  const { trackRejection } = useRejectionTracking();

  useEffect(() => {
    if (yaSolicitado) setRequestState('done');
  }, [yaSolicitado]);

  const handleReject = useCallback(() => {
    void trackRejection({
      offerId: campana.id,
      sector: accent === 'cyan' ? 'banca' : 'establecimientos',
      productType: campana.titulo,
      entityName: campana.organizationNombre,
      onRejected: () => setIsRejected(true),
    });
  }, [campana, accent, trackRejection]);

  const handleSolicitar = useCallback(async () => {
    setRequestState('loading');
    const ok = await onSolicitar();
    setRequestState(ok ? 'done' : 'idle');
  }, [onSolicitar]);

  if (isRejected) {
    return (
      <div className="rounded-2xl border border-border/20 bg-secondary/10 p-5 opacity-40 pointer-events-none">
        <p className="text-[11px] text-muted-foreground italic text-center">Oferta descartada</p>
      </div>
    );
  }

  const chips = segmentacionChips(campana);
  const accentColor = accent === 'cyan' ? 'blue' : 'amber';

  return (
    <div
      className={cn(
        'group relative rounded-2xl border bg-card/60 overflow-hidden',
        'transition-all duration-300 hover:bg-card/90',
        'hover:border-border/60 hover:shadow-xl hover:shadow-black/10',
        'hover:-translate-y-0.5',
      )}
    >
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-px',
          accent === 'cyan'
            ? 'bg-gradient-to-r from-transparent via-blue-400/30 to-transparent'
            : 'bg-gradient-to-r from-transparent via-amber-400/30 to-transparent',
        )}
      />

      <div className="p-5 space-y-4">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-sm font-bold font-mono',
              accent === 'cyan' ? 'bg-blue-500/10 border-blue-500/20 text-blue-400' : 'bg-amber-500/10 border-amber-500/20 text-amber-400',
            )}>
              {campana.organizationNombre.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground truncate">
                {campana.organizationNombre}
              </p>
              <h4 className="text-sm font-semibold text-foreground truncate">{campana.titulo}</h4>
            </div>
          </div>

          <Badge className={cn(
            'shrink-0 text-[10px] gap-1 px-2 py-0.5 font-medium rounded-full',
            campana.modoLanzamiento === 'segmentado'
              ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20'
              : 'bg-purple-500/10 text-purple-400 border-purple-500/20',
          )}>
            <Sparkles className="h-2.5 w-2.5" />
            {campana.modoLanzamiento === 'segmentado' ? 'Match para ti' : 'Alcance Amplio'}
          </Badge>
        </div>

        {campana.descripcion && (
          <p className="text-xs text-muted-foreground leading-relaxed line-clamp-3">{campana.descripcion}</p>
        )}

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {chips.map((chip, i) => (
              <span key={i} className="inline-flex items-center gap-1 rounded-full bg-secondary/60 border border-border/40 px-2.5 py-1 text-[10px] text-muted-foreground font-medium">
                {i === 0 && <MapPin className="h-3 w-3 text-emerald-400" />}
                {chip}
              </span>
            ))}
          </div>
        )}

        <button
          onClick={(e) => { e.stopPropagation(); handleReject(); }}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border/20 bg-transparent px-3 py-1.5 text-[10px] text-muted-foreground/50 hover:text-red-400/70 hover:border-red-500/20 hover:bg-red-500/5 transition-all cursor-pointer"
        >
          No me interesa
        </button>

        <Button
          disabled={requestState !== 'idle'}
          onClick={handleSolicitar}
          className={cn(
            'w-full h-10 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
            requestState === 'idle' && accentColor === 'blue' &&
              'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 hover:shadow-cyan-600/30',
            requestState === 'idle' && accentColor === 'amber' &&
              'bg-amber-600 hover:bg-amber-500 text-white shadow-lg shadow-amber-600/20 hover:shadow-amber-600/30',
            requestState === 'loading' && 'bg-secondary text-muted-foreground cursor-wait',
            requestState === 'done' && 'bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 cursor-default',
          )}
        >
          {requestState === 'idle' && (
            <>
              Me interesa
              <Sparkles className="h-3.5 w-3.5" />
            </>
          )}
          {requestState === 'loading' && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando solicitud...
            </>
          )}
          {requestState === 'done' && (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Solicitud enviada
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ───── Meta creation dialog (sin cambios) ─────

const GOAL_CATEGORIES: { id: GoalCategory; label: string; emoji: string }[] = [
  { id: 'Celular', label: 'Celular', emoji: '📱' },
  { id: 'Viaje', label: 'Viaje', emoji: '✈️' },
  { id: 'Vivienda', label: 'Vivienda', emoji: '🏠' },
  { id: 'Carro', label: 'Carro', emoji: '🚗' },
  { id: 'Moto', label: 'Moto', emoji: '🏍️' },
  { id: 'Computador', label: 'Computador', emoji: '💻' },
  { id: 'Remodelación', label: 'Remodelación de Casa', emoji: '🔨' },
];

function CrearMetaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [category, setCategory] = useState<GoalCategory | null>(null);
  const [targetAmount, setTargetAmount] = useState('');
  const [monthlyGoal, setMonthlyGoal] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done'>('idle');

  const canSubmit =
    category !== null &&
    targetAmount.trim() !== '' &&
    Number(targetAmount) > 0 &&
    monthlyGoal.trim() !== '' &&
    Number(monthlyGoal) > 0 &&
    submitState === 'idle';

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    setSubmitState('loading');
    setTimeout(() => {
      setSubmitState('done');
      setTimeout(() => {
        setSubmitState('idle');
        setCategory(null);
        setTargetAmount('');
        setMonthlyGoal('');
        onOpenChange(false);
      }, 1500);
    }, 1000);
  }, [canSubmit, onOpenChange]);

  const formatCOP = (val: string) => {
    const num = Number(val);
    if (isNaN(num) || num === 0) return '';
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M COP`;
    return `$${num.toLocaleString('es-CO')} COP`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            Crear Nueva Meta de Ahorro
          </DialogTitle>
          <DialogDescription className="text-sm">
            Define tu meta financiera. Cuando actives la IFC, los comercios aliados de Neggo
            competirán por ofrecerte las mejores condiciones.
          </DialogDescription>
        </DialogHeader>

        {submitState === 'done' ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              Meta creada exitosamente
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Tu meta de ahorro ha sido registrada. Activa tu IFC para empezar a recibir ofertas
              de comercios aliados.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Categoría
              </label>
              <Select
                value={category ?? ''}
                onValueChange={(val) => setCategory(val as GoalCategory)}
              >
                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                  <SelectValue placeholder="¿Para qué estás ahorrando?" />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl">
                  {GOAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="cursor-pointer text-sm">
                      <span className="flex items-center gap-2">
                        <span>{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Monto Objetivo (COP)
              </label>
              <Input
                type="number"
                placeholder="ej. 15.000.000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono"
              />
              {targetAmount && Number(targetAmount) > 0 && (
                <p className="text-[11px] text-cyan-400 font-mono">
                  {formatCOP(targetAmount)}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ahorro Mensual (COP)
              </label>
              <Input
                type="number"
                placeholder="ej. 1.200.000"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(e.target.value)}
                className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono"
              />
              {monthlyGoal && Number(monthlyGoal) > 0 && targetAmount && Number(targetAmount) > 0 && (
                <p className="text-[11px] text-blue-400 font-mono">
                  Alcanzarás tu meta en aproximadamente{' '}
                  {Math.ceil(Number(targetAmount) / Number(monthlyGoal))} meses
                </p>
              )}
            </div>

            <Button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={cn(
                'w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
                canSubmit
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {submitState === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando meta...
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" />
                  Crear Meta de Ahorro
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ───── Sector tab type ─────

type OfferSector = 'bancarios' | 'inmobiliarios' | 'comercio';

const OFFER_SECTORS: { id: OfferSector; label: string; emoji: string }[] = [
  { id: 'bancarios', label: 'Créditos Bancarios', emoji: '🏦' },
  { id: 'inmobiliarios', label: 'Proyectos Inmobiliarios', emoji: '🏗️' },
  { id: 'comercio', label: 'Ofertas de Comercio', emoji: '🏬' },
];

// ───── Main OfertasView ─────

export default function OfertasView() {
  const { ciudad, scoreEstimado, rangoIngresos, status: perfilStatus } = useClienteProfile();
  const userId = useAuthStore((s) => s.session?.userId);
  const addSolicitudBanco = usePortalStore((s) => s.addSolicitudBanco);
  const addSolicitudComercio = usePortalStore((s) => s.addSolicitudComercio);
  const [isCrearMetaOpen, setCrearMetaOpen] = useState(false);
  const [activeSector, setActiveSector] = useState<OfferSector>('bancarios');

  const [campanasBanco, setCampanasBanco] = useState<CampanaDisplay[]>([]);
  const [campanasComercio, setCampanasComercio] = useState<CampanaDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [campanaIdsConSolicitud, setCampanaIdsConSolicitud] = useState<Set<string>>(new Set());

  // Cuentas antiguas pueden no tener ciudad/score poblados — mejor mostrar
  // todas las campañas activas sin filtrar que inventar un valor por defecto.
  const perfilCompleto = perfilStatus === 'ready' && ciudad !== null && scoreEstimado !== null;

  useEffect(() => {
    if (!isDbConfigured || perfilStatus === 'loading') return;
    setIsLoading(true);
    setError(null);
    Promise.all([fetchCampanasActivas('banco'), fetchCampanasActivas('comercio')]).then(([bancoRes, comercioRes]) => {
      if (bancoRes.error || comercioRes.error) {
        setError(bancoRes.error ?? comercioRes.error);
        setIsLoading(false);
        return;
      }
      setCampanasBanco(bancoRes.data ?? []);
      setCampanasComercio(comercioRes.data ?? []);
      setIsLoading(false);
    });
  }, [perfilStatus]);

  useEffect(() => {
    if (!isDbConfigured || !userId) return;
    fetchCampanaIdsConSolicitud(userId).then(({ data }) => {
      if (data) setCampanaIdsConSolicitud(new Set(data));
    });
  }, [userId]);

  const matchingBanco = useMemo(() => {
    if (!perfilCompleto) return campanasBanco;
    return campanasBanco.filter((c) => matchesCampana(c, ciudad, scoreEstimado, rangoIngresos));
  }, [perfilCompleto, campanasBanco, ciudad, scoreEstimado, rangoIngresos]);

  const matchingComercio = useMemo(() => {
    if (!perfilCompleto) return campanasComercio;
    return campanasComercio.filter((c) => matchesCampana(c, ciudad, scoreEstimado, rangoIngresos));
  }, [perfilCompleto, campanasComercio, ciudad, scoreEstimado, rangoIngresos]);

  const handleSolicitarBanco = useCallback(async (campana: CampanaDisplay) => {
    const solicitudId = `SOL-${Date.now().toString(36).toUpperCase()}`;
    return addSolicitudBanco({
      id: solicitudId,
      productType: (campana.segmentacion.producto as SolicitudProductType | undefined) ?? 'compra-cartera',
      bancos: [{ organizationId: campana.organizationId, nombre: campana.organizationNombre }],
      campanaId: campana.id,
    });
  }, [addSolicitudBanco]);

  const handleSolicitarComercio = useCallback(async (campana: CampanaDisplay) => {
    const solicitudId = `SOL-${Date.now().toString(36).toUpperCase()}`;
    return addSolicitudComercio({
      id: solicitudId,
      categoria: campana.titulo,
      ciudad: ciudad ?? '',
      campana: { id: campana.id, organizationId: campana.organizationId, organizationNombre: campana.organizationNombre },
    });
  }, [addSolicitudComercio, ciudad]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Gift className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Ofertas para ti
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {perfilCompleto ? (
              <>
                Campañas que coinciden con tu perfil en{' '}
                <span className="font-semibold text-cyan-400">{ciudad}</span>{' '}
                — Score <span className="font-mono text-cyan-400">{scoreEstimado}</span>
              </>
            ) : (
              'No pudimos determinar tu ciudad o score todavía — mostrando todas las campañas activas.'
            )}
          </p>
        </div>

        <Badge className="self-start bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-xs px-3 py-1 gap-1.5 font-medium">
          <Sparkles className="h-3 w-3" />
          {matchingBanco.length + matchingComercio.length} ofertas disponibles
        </Badge>
      </div>

      {/* Crear Meta banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Target className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              ¿Tienes una meta de ahorro en mente?
            </p>
            <p className="text-xs text-muted-foreground">
              Crea tu meta y deja que los comercios aliados de Neggo compitan por ofrecerte las mejores condiciones.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setCrearMetaOpen(true)}
          className="shrink-0 h-10 gap-2 rounded-xl px-5 font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition-all duration-200 hover:shadow-amber-500/30 hover:scale-[1.02]"
        >
          <Star className="h-4 w-4" />
          Crear Nueva Meta de Ahorro
        </Button>
      </div>

      {/* Matching logic summary */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tu ciudad</p>
            <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {ciudad ?? 'No disponible'}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tu score</p>
            <p className="text-sm font-semibold text-blue-400 font-mono">{scoreEstimado ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* ── Sector sub-tabs ── */}
      <div className="flex items-center gap-1 rounded-xl border border-border/40 bg-card/40 p-1">
        {OFFER_SECTORS.map((sector) => {
          const isActive = activeSector === sector.id;
          return (
            <button
              key={sector.id}
              onClick={() => setActiveSector(sector.id)}
              className={cn(
                'flex-1 flex items-center justify-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium transition-all duration-200',
                isActive
                  ? 'bg-card text-foreground border border-border/60 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60 border border-transparent',
              )}
            >
              <span className="text-sm">{sector.emoji}</span>
              <span className="hidden sm:inline">{sector.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── Sector: Créditos Bancarios ── */}
      {activeSector === 'bancarios' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 text-muted-foreground animate-spin" /></div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
              <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">No se pudieron cargar las ofertas</h3>
              <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            </div>
          ) : matchingBanco.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {matchingBanco.map((campana) => (
                <CampanaOfferCard
                  key={campana.id}
                  campana={campana}
                  yaSolicitado={campanaIdsConSolicitud.has(campana.id)}
                  onSolicitar={() => handleSolicitarBanco(campana)}
                  accent="cyan"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card/60 border border-border/40 mb-4">
                <Gift className="h-7 w-7 text-muted-foreground" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Sin ofertas bancarias disponibles
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {perfilCompleto
                  ? `No encontramos campañas activas que coincidan con tu perfil en ${ciudad}.`
                  : 'No encontramos campañas activas por el momento.'}{' '}
                Revisa más tarde o actualiza tus preferencias.
              </p>
            </div>
          )}
        </>
      )}

      {/* ── Sector: Proyectos Inmobiliarios ── */}
      {activeSector === 'inmobiliarios' && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <Home className="h-7 w-7 text-blue-400" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Proyectos Inmobiliarios
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            Explora proyectos de vivienda que coinciden con tu capacidad financiera en la pestaña de{' '}
            <span className="font-semibold text-cyan-400">Oportunidades Inmobiliarias</span>.
          </p>
        </div>
      )}

      {/* ── Sector: Ofertas de Comercio ── */}
      {activeSector === 'comercio' && (
        <>
          {isLoading ? (
            <div className="flex items-center justify-center py-20"><Loader2 className="h-8 w-8 text-muted-foreground animate-spin" /></div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
              <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
              <h3 className="text-base font-semibold text-foreground mb-1">No se pudieron cargar las ofertas</h3>
              <p className="text-sm text-muted-foreground max-w-md">{error}</p>
            </div>
          ) : matchingComercio.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {matchingComercio.map((campana) => (
                <CampanaOfferCard
                  key={campana.id}
                  campana={campana}
                  yaSolicitado={campanaIdsConSolicitud.has(campana.id)}
                  onSolicitar={() => handleSolicitarComercio(campana)}
                  accent="amber"
                />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-20 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
                <Store className="h-7 w-7 text-amber-400" />
              </div>
              <h3 className="text-base font-semibold text-foreground mb-1">
                Sin ofertas de comercios disponibles
              </h3>
              <p className="text-sm text-muted-foreground max-w-sm">
                {perfilCompleto
                  ? `No encontramos campañas activas de comercios en ${ciudad}.`
                  : 'No encontramos campañas activas por el momento.'}{' '}
                Revisa más tarde.
              </p>
            </div>
          )}
        </>
      )}

      {/* Crear Meta Dialog */}
      <CrearMetaDialog open={isCrearMetaOpen} onOpenChange={setCrearMetaOpen} />
    </div>
  );
}
