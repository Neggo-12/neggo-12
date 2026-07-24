import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Home, MapPin, Building2,
  Loader2, CheckCircle2, Sparkles,
  PiggyBank, Clock, Percent, Gift,
  ShieldCheck,
  MessageCircle, Trophy, Upload, FileCheck, AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/store/useAuthStore';
import { usePortalStore } from '@/features/portal/store/usePortalStore';
import { cn, formatCOPCompact } from '@/lib/utils';
import { useRejectionTracking } from '@/hooks/useRejectionTracking';
import { useClienteProfile } from '@/hooks/useClienteProfile';
import { fetchProyectosMatch, fetchProyectoIdsConSolicitud, type ProyectoRow } from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';
import type { ProyectoConstructora } from '@/types';

/** Convierte un ProyectoRow real a la forma que ya consume esta vista — analítica (leads/score/conversión) queda en 0: son métricas internas de la constructora, no del cliente que navega ofertas. */
function rowToProyectoDisplay(row: ProyectoRow): ProyectoConstructora {
  return {
    id: row.id,
    name: row.nombre,
    city: row.ciudad ?? '',
    units: row.unidades,
    priceRangeMin: row.precio_min,
    priceRangeMax: row.precio_max,
    leadsGenerated: 0,
    hipotecarioInterest: 0,
    avgScore: 0,
    conversionRate: 0,
    status: (row.estado as ProyectoConstructora['status']) ?? 'activo',
    constructora: row.constructora_nombre ?? '',
    constructoraId: row.constructora_id ?? '',
    tipoVivienda: (row.tipo_vivienda as ProyectoConstructora['tipoVivienda']) ?? 'apartamento',
    valorSeparacion: row.valor_separacion,
    cuotaInicialPct: row.cuota_inicial_pct,
    plazoCuotaInicialMeses: row.plazo_cuota_inicial_meses,
    subsidioCajaCompensacion: false,
    subsidioMiCasaYa: false,
    bonoComercial: row.bono_comercial ?? '',
    areaConstruida: '',
    alcobas: 0,
    banos: 0,
    parqueadero: false,
    cplCosto: row.cpl_costo,
    successFeePct: row.success_fee_pct,
    modoLanzamiento: row.modo_lanzamiento,
    unidadesLanzamiento: row.unidades_lanzamiento,
    visibilidad: 'publico-general' as const,
  };
}

// ───── Helpers ─────

const TIPO_LABELS: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  local: 'Local Comercial',
  oficina: 'Oficina',
};

// ───── Project Card ─────

function ProjectCard({ proyecto, yaSolicitado }: { proyecto: ProyectoConstructora; yaSolicitado: boolean }) {
  const [requestState, setRequestState] = useState<'idle' | 'loading' | 'done'>(yaSolicitado ? 'done' : 'idle');
  const [showReservaForm, setShowReservaForm] = useState(false);
  const [reservaAmount, setReservaAmount] = useState('2000000');
  const [isRejected, setIsRejected] = useState(proyecto.offerStatus === 'rejected');
  const { trackRejection } = useRejectionTracking();
  const addSolicitudConstructora = usePortalStore((s) => s.addSolicitudConstructora);

  // yaSolicitado llega de una consulta async al montar la vista — puede resolverse
  // después del primer render, así que se sincroniza aparte del estado inicial.
  useEffect(() => {
    if (yaSolicitado) setRequestState('done');
  }, [yaSolicitado]);

  const handleReject = useCallback(() => {
    void trackRejection({
      offerId: proyecto.id,
      sector: 'constructoras',
      productType: TIPO_LABELS[proyecto.tipoVivienda] ?? proyecto.tipoVivienda,
      entityName: proyecto.constructora,
      onRejected: () => setIsRejected(true),
    });
  }, [proyecto.id, proyecto.tipoVivienda, proyecto.constructora, trackRejection]);

  const handleSolicitar = useCallback(async () => {
    setRequestState('loading');
    const solicitudId = `SOL-${Date.now().toString(36).toUpperCase()}`;
    const ok = await addSolicitudConstructora({
      id: solicitudId,
      tipoVivienda: proyecto.tipoVivienda,
      ciudad: proyecto.city,
      proyecto: {
        id: proyecto.id,
        constructoraUserId: proyecto.constructoraId,
        constructoraNombre: proyecto.constructora,
      },
    });
    setRequestState(ok ? 'done' : 'idle');
  }, [proyecto, addSolicitudConstructora]);

  const handleReservar = useCallback(() => {
    setRequestState('loading');
    setTimeout(() => setRequestState('done'), 1800);
  }, []);

  if (isRejected) {
    return (
      <div className="rounded-2xl border border-border/20 bg-secondary/10 p-5 opacity-40 pointer-events-none">
        <p className="text-[11px] text-muted-foreground italic text-center">Proyecto descartado</p>
      </div>
    );
  }

  const hasSubsidio = proyecto.subsidioCajaCompensacion || proyecto.subsidioMiCasaYa;
  const isLanzamiento = proyecto.modoLanzamiento && proyecto.unidadesLanzamiento > 0;

  return (
    <div
      className={cn(
        'group relative rounded-2xl border bg-card/60 overflow-hidden',
        'transition-all duration-300 hover:bg-card/90',
        'hover:border-border/60 hover:shadow-xl hover:shadow-black/10',
        'hover:-translate-y-0.5',
      )}
    >
      {/* Top glow accent */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-purple-400/30 to-transparent" />

      <div className="p-5 space-y-4">
        {/* ── Header: Constructora + Project Name ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20 text-sm font-bold text-purple-400 font-mono">
              {proyecto.constructora.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {proyecto.constructora}
              </p>
              <h4 className="text-sm font-semibold text-foreground truncate">
                {proyecto.name}
              </h4>
            </div>
          </div>

          {/* Type badge */}
          <Badge className="shrink-0 bg-purple-500/10 text-purple-400 border-purple-500/20 text-[10px] px-2 py-0.5 font-medium rounded-full">
            {TIPO_LABELS[proyecto.tipoVivienda] ?? proyecto.tipoVivienda}
          </Badge>
        </div>

        {/* ── Bonus / Promotion Badge ── */}
        {proyecto.bonoComercial && (
          <div className="flex items-center gap-2 rounded-lg bg-amber-500/5 border border-amber-500/10 px-3 py-2">
            <Gift className="h-3.5 w-3.5 text-amber-400 shrink-0" />
            <p className="text-[11px] text-amber-400 font-medium leading-snug">
              {proyecto.bonoComercial}
            </p>
          </div>
        )}

        {/* ── Price range ── */}
        <div className="rounded-xl border border-border/40 bg-secondary/30 p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">
            Rango de Precios
          </p>
          <p className="text-xl font-bold font-mono text-purple-300 tracking-tight">
            {formatCOPCompact(proyecto.priceRangeMin)} — {formatCOPCompact(proyecto.priceRangeMax)}
          </p>
        </div>

        {/* ── Payment Summary ── */}
        <div className="rounded-xl border border-border/40 bg-secondary/30 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Resumen de Pago
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-center">
            <div className="space-y-0.5">
              <PiggyBank className="h-3.5 w-3.5 text-blue-400 mx-auto" />
              <p className="text-[10px] text-muted-foreground">Separación</p>
              <p className="text-xs font-bold font-mono text-blue-400">
                {formatCOPCompact(proyecto.valorSeparacion)}
              </p>
            </div>
            <div className="space-y-0.5">
              <Percent className="h-3.5 w-3.5 text-emerald-400 mx-auto" />
              <p className="text-[10px] text-muted-foreground">Cuota Inicial</p>
              <p className="text-xs font-bold font-mono text-emerald-400">
                {proyecto.cuotaInicialPct}%
              </p>
            </div>
            <div className="space-y-0.5">
              <Clock className="h-3.5 w-3.5 text-amber-400 mx-auto" />
              <p className="text-[10px] text-muted-foreground">Plazo</p>
              <p className="text-xs font-bold font-mono text-amber-400">
                {proyecto.plazoCuotaInicialMeses} meses
              </p>
            </div>
          </div>
        </div>

        {/* ── Subsidies row ── */}
        {hasSubsidio && (
          <div className="flex flex-wrap gap-1.5">
            {proyecto.subsidioCajaCompensacion && (
              <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] px-2 py-0.5 font-medium rounded-full gap-1">
                <ShieldCheck className="h-3 w-3" />
                Caja de Compensación
              </Badge>
            )}
            {proyecto.subsidioMiCasaYa && (
              <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px] px-2 py-0.5 font-medium rounded-full gap-1">
                <ShieldCheck className="h-3 w-3" />
                Mi Casa Ya
              </Badge>
            )}
          </div>
        )}

        {/* ── Meta row: city + units ── */}
        <div className="grid grid-cols-2 gap-3 text-center">
          <div className="rounded-lg bg-secondary/40 p-2.5 space-y-0.5">
            <MapPin className="h-3.5 w-3.5 text-emerald-400 mx-auto" />
            <p className="text-[10px] text-muted-foreground">Ciudad</p>
            <p className="text-xs font-semibold text-emerald-400">{proyecto.city}</p>
          </div>
          <div className="rounded-lg bg-secondary/40 p-2.5 space-y-0.5">
            <Home className="h-3.5 w-3.5 text-blue-400 mx-auto" />
            <p className="text-[10px] text-muted-foreground">Unidades</p>
            <p className="text-xs font-semibold text-blue-400">{proyecto.units}</p>
          </div>
        </div>

        {/* ── Match badge ── */}
        <div className="flex items-center gap-2 rounded-lg bg-cyan-500/5 border border-cyan-500/10 px-3 py-2">
          <Sparkles className="h-3.5 w-3.5 text-cyan-400" />
          <p className="text-[11px] text-cyan-400">
            <span className="font-semibold">Match inmobiliario</span>
            <span className="text-cyan-400/60"> — {proyecto.city} coincide con tu ubicación</span>
          </p>
        </div>

        {/* ── Launch mode banner ── */}
        {isLanzamiento && (
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/10 to-orange-500/5 p-3">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-amber-400" />
              <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">
                Modo Lanzamiento Especial
              </span>
            </div>
            <p className="text-[10px] text-amber-400/80 leading-relaxed">
              Solo quedan{' '}
              <span className="font-bold text-amber-300 font-mono">{proyecto.unidadesLanzamiento} unidades</span>{' '}
              disponibles para reserva 100% digital. Precio de preventa exprés con condiciones preferenciales.
            </p>
          </div>
        )}

        {/* ── CTA ── */}
        {/* ── Reject button ── */}
        <button
          onClick={(e) => { e.stopPropagation(); handleReject(); }}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border/20 bg-transparent px-3 py-1.5 text-[10px] text-muted-foreground/50 hover:text-red-400/70 hover:border-red-500/20 hover:bg-red-500/5 transition-all cursor-pointer"
        >
          No me interesa
        </button>

        {isLanzamiento ? (
          <>
            {!showReservaForm ? (
              <Button
                disabled={requestState !== 'idle'}
                onClick={() => setShowReservaForm(true)}
                className={cn(
                  'w-full h-10 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
                  requestState === 'idle' &&
                    'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black shadow-lg shadow-amber-500/30 hover:shadow-amber-500/40',
                  requestState === 'loading' &&
                    'bg-amber-700 text-amber-300 cursor-wait',
                  requestState === 'done' &&
                    'bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 cursor-default',
                )}
              >
                {requestState === 'idle' && (
                  <>
                    <ShieldCheck className="h-3.5 w-3.5" />
                    Reservar Unidad en Línea
                  </>
                )}
                {requestState === 'loading' && (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Procesando reserva...
                  </>
                )}
                {requestState === 'done' && (
                  <>
                    <CheckCircle2 className="h-4 w-4" />
                    Unidad Reservada ✓
                  </>
                )}
              </Button>
            ) : (
              <div className="space-y-3 rounded-xl border border-amber-500/30 bg-card/60 p-4 animate-slide-up">
                <p className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Pago simulado de separación
                </p>
                <div className="space-y-1.5">
                  <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    Monto a pagar (COP)
                  </Label>
                  <Input
                    type="text"
                    value={`$${Number(reservaAmount).toLocaleString('es-CO')} COP`}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^0-9]/g, '');
                      setReservaAmount(raw || '0');
                    }}
                    className="h-10 rounded-lg border-border/60 bg-secondary/50 text-sm font-mono text-center"
                  />
                  <p className="text-[9px] text-muted-foreground text-center italic">
                    Valor de separación sugerido: {formatCOPCompact(proyecto.valorSeparacion)}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowReservaForm(false)}
                    className="flex-1 border-border/40 rounded-lg text-xs"
                  >
                    Cancelar
                  </Button>
                  <Button
                    size="sm"
                    disabled={requestState !== 'idle'}
                    onClick={handleReservar}
                    className={cn(
                      'flex-1 gap-1.5 rounded-lg text-xs font-semibold',
                      requestState === 'idle' &&
                        'bg-amber-500 hover:bg-amber-400 text-black',
                      requestState === 'done' &&
                        'bg-emerald-600/50 text-emerald-300 cursor-default',
                    )}
                  >
                    {requestState === 'idle' ? (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Confirmar Reserva
                      </>
                    ) : requestState === 'loading' ? (
                      <>
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        Procesando...
                      </>
                    ) : (
                      <>
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Reservado ✓
                      </>
                    )}
                  </Button>
                </div>
              </div>
            )}
          </>
        ) : (
          <Button
            disabled={requestState !== 'idle'}
            onClick={handleSolicitar}
            className={cn(
              'w-full h-10 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
              requestState === 'idle' &&
                'bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 hover:shadow-purple-600/30',
              requestState === 'loading' &&
                'bg-purple-700 text-purple-300 cursor-wait',
              requestState === 'done' &&
                'bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 cursor-default',
            )}
          >
            {requestState === 'idle' && (
              <>
                Me interesa este proyecto
                <MessageCircle className="h-3.5 w-3.5" />
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
        )}
      </div>
    </div>
  );
}

// ───── Main View ─────

export default function OportunidadesInmobiliariasView() {
  const { ciudad, scoreEstimado, status: perfilStatus } = useClienteProfile();
  const userId = useAuthStore((s) => s.session?.userId);

  // Cuentas antiguas pueden no tener ciudad poblada — mejor mostrar todos los
  // proyectos activos sin filtrar que inventar un valor por defecto.
  const perfilCompleto = perfilStatus === 'ready' && ciudad !== null;

  const [proyectos, setProyectos] = useState<ProyectoConstructora[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [proyectoIdsConSolicitud, setProyectoIdsConSolicitud] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!isDbConfigured || perfilStatus === 'loading') return;
    setIsLoading(true);
    setError(null);
    fetchProyectosMatch({ ciudad: ciudad ?? undefined }).then(({ data, error: fetchError }) => {
      if (fetchError) {
        setError(fetchError);
        setIsLoading(false);
        return;
      }
      setProyectos((data ?? []).map(rowToProyectoDisplay));
      setIsLoading(false);
    });
  }, [perfilStatus, ciudad]);

  useEffect(() => {
    if (!isDbConfigured || !userId) return;
    fetchProyectoIdsConSolicitud(userId).then(({ data }) => {
      if (data) setProyectoIdsConSolicitud(new Set(data));
    });
  }, [userId]);

  const matchingProjects = useMemo(() => {
    if (!perfilCompleto) return proyectos.filter((p) => p.status === 'activo');
    return proyectos.filter((p) => p.status === 'activo' && p.city === ciudad);
  }, [perfilCompleto, ciudad, proyectos]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
              <Building2 className="h-3.5 w-3.5 text-purple-400" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Oportunidades Inmobiliarias para ti
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            {perfilCompleto ? (
              <>
                Proyectos de constructoras en{' '}
                <span className="font-semibold text-purple-400">{ciudad}</span>{' '}
                que encajan con tu perfil financiero. Incluyen condiciones comerciales detalladas.
              </>
            ) : (
              'No pudimos determinar tu ciudad todavía — mostrando todos los proyectos activos.'
            )}
          </p>
        </div>

        <Badge className="self-start bg-purple-500/10 text-purple-400 border-purple-500/20 text-xs px-3 py-1 gap-1.5 font-medium">
          <Home className="h-3 w-3" />
          {matchingProjects.length} proyectos
        </Badge>
      </div>

      {/* Matching logic summary */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
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
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ID Cliente</p>
            <p className="text-sm font-semibold text-muted-foreground font-mono">{userId ?? '—'}</p>
          </div>
        </div>
      </div>

      {/* ── Citizen Audit Banner ── */}
      <div className="rounded-xl border border-amber-500/30 bg-gradient-to-r from-amber-500/5 to-transparent p-5">
        <div className="flex items-start gap-4">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-amber-500/10 border border-amber-500/20">
            <Trophy className="h-5 w-5 text-amber-400" />
          </div>
          <div className="space-y-2 flex-1">
            <h3 className="text-sm font-bold text-foreground">
              ¿Firmaste separación en la sala de ventas física?
            </h3>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Sube tu promesa de compraventa aquí y reclama un{' '}
              <span className="font-bold text-amber-400">Bono Neggo de $1.000.000 COP</span>{' '}
              para los acabados de tu hogar. Tu documento será almacenado para auditoría de Neggo
              y se cruzará con las ventas de la constructora para verificar legitimidad.
            </p>
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                className="gap-1.5 bg-amber-500 hover:bg-amber-400 text-black font-semibold text-xs rounded-lg"
              >
                <Upload className="h-3.5 w-3.5" />
                Subir Promesa de Compraventa
              </Button>
              <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                <FileCheck className="h-3 w-3 text-amber-400/60" />
                Documento verificado por Neggo
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of matching projects */}
      {isLoading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
          <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
          <h3 className="text-base font-semibold text-foreground mb-1">No se pudieron cargar los proyectos</h3>
          <p className="text-sm text-muted-foreground max-w-md">{error}</p>
        </div>
      ) : matchingProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {matchingProjects.map((proyecto) => (
            <ProjectCard key={proyecto.id} proyecto={proyecto} yaSolicitado={proyectoIdsConSolicitud.has(proyecto.id)} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card/60 border border-border/40 mb-4">
            <Home className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Sin proyectos disponibles
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            {perfilCompleto
              ? `No encontramos proyectos activos de constructoras en ${ciudad}.`
              : 'No encontramos proyectos activos por el momento.'}{' '}
            Revisa más tarde o amplía tu búsqueda a otras ciudades.
          </p>
        </div>
      )}
    </div>
  );
}
