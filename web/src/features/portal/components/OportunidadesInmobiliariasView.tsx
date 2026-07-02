import { useState, useMemo, useCallback } from 'react';
import {
  Home, MapPin, Building2, Wallet, Users,
  Loader2, CheckCircle2, Sparkles,
  PiggyBank, Clock, Percent, Gift, Ruler,
  BedDouble, Bath, Car, ShieldCheck,
  MessageCircle, Trophy, Upload, FileCheck,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { proyectos } from '@/data/mock';
import { usePortalStore } from '@/features/portal/store/usePortalStore';
import { cn } from '@/lib/utils';
import type { ProyectoConstructora } from '@/types';

// ───── Helpers ─────

const TIPO_LABELS: Record<string, string> = {
  apartamento: 'Apartamento',
  casa: 'Casa',
  local: 'Local Comercial',
  oficina: 'Oficina',
};

function formatCOP(value: number): string {
  if (value >= 1_000_000_000) return `$${(value / 1_000_000_000).toFixed(1)}MMM`;
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(0)}M`;
  return `$${value.toLocaleString('es-CO')}`;
}

// ───── Project Card ─────

function ProjectCard({ proyecto }: { proyecto: ProyectoConstructora }) {
  const [requestState, setRequestState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [showReservaForm, setShowReservaForm] = useState(false);
  const [reservaAmount, setReservaAmount] = useState('2000000');

  const handleSolicitar = useCallback(() => {
    setRequestState('loading');
    setTimeout(() => setRequestState('done'), 1200);
  }, []);

  const handleReservar = useCallback(() => {
    setRequestState('loading');
    setTimeout(() => setRequestState('done'), 1800);
  }, []);

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
            {formatCOP(proyecto.priceRangeMin)} — {formatCOP(proyecto.priceRangeMax)}
          </p>
        </div>

        {/* ── Payment Summary ── */}
        <div className="rounded-xl border border-border/40 bg-secondary/30 p-3 space-y-2">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground">
            Resumen de Pago
          </p>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="space-y-0.5">
              <PiggyBank className="h-3.5 w-3.5 text-blue-400 mx-auto" />
              <p className="text-[10px] text-muted-foreground">Separación</p>
              <p className="text-xs font-bold font-mono text-blue-400">
                {formatCOP(proyecto.valorSeparacion)}
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

        {/* ── Amenities + Specs pills ── */}
        <div className="flex flex-wrap gap-1.5">
          {/* Area */}
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 border border-border/40 px-2.5 py-1 text-[10px] text-muted-foreground font-medium">
            <Ruler className="h-3 w-3 text-blue-400" />
            {proyecto.areaConstruida}
          </span>
          {/* Alcobas */}
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 border border-border/40 px-2.5 py-1 text-[10px] text-muted-foreground font-medium">
            <BedDouble className="h-3 w-3 text-purple-400" />
            {proyecto.alcobas} alcobas
          </span>
          {/* Baños */}
          <span className="inline-flex items-center gap-1 rounded-full bg-secondary/60 border border-border/40 px-2.5 py-1 text-[10px] text-muted-foreground font-medium">
            <Bath className="h-3 w-3 text-cyan-400" />
            {proyecto.banos} baños
          </span>
          {/* Parqueadero */}
          <span className={cn(
            'inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-medium',
            proyecto.parqueadero
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-secondary/60 border-border/40 text-muted-foreground line-through',
          )}>
            <Car className="h-3 w-3" />
            Parqueadero
          </span>
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

        {/* ── Meta row: city + units + score ── */}
        <div className="grid grid-cols-3 gap-3 text-center">
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
          <div className="rounded-lg bg-secondary/40 p-2.5 space-y-0.5">
            <Users className="h-3.5 w-3.5 text-purple-400 mx-auto" />
            <p className="text-[10px] text-muted-foreground">Score Prom.</p>
            <p className="text-xs font-semibold text-purple-400 font-mono">{proyecto.avgScore}</p>
          </div>
        </div>

        {/* ── Stats row ── */}
        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 text-blue-400" />
            {proyecto.leadsGenerated} leads
          </span>
          <span className="flex items-center gap-1">
            <Wallet className="h-3 w-3 text-emerald-400" />
            {proyecto.hipotecarioInterest} interesados
          </span>
        </div>

        {/* ── Conversion rate bar ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">Tasa de conversión</span>
            <span className="font-mono font-semibold text-purple-400">
              {proyecto.conversionRate}%
            </span>
          </div>
          <div className="h-1.5 rounded-full bg-secondary/60 overflow-hidden">
            <div
              className="h-full rounded-full bg-purple-500 transition-all duration-500"
              style={{ width: `${Math.min(100, proyecto.conversionRate * 6)}%` }}
            />
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
                    Valor de separación sugerido: {formatCOP(proyecto.valorSeparacion)}
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
                Solicitar Asesoría de Cierre
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
                Solicitado ✓
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
  const { currentClient } = usePortalStore();

  const matchingProjects = useMemo(() => {
    return proyectos.filter((p) => {
      if (p.status !== 'activo') return false;
      return p.city === currentClient.city;
    });
  }, [currentClient.city]);

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
            Proyectos de constructoras en{' '}
            <span className="font-semibold text-purple-400">{currentClient.city}</span>{' '}
            que encajan con tu perfil financiero. Incluyen condiciones comerciales detalladas.
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
              {currentClient.city}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tu score</p>
            <p className="text-sm font-semibold text-blue-400 font-mono">{currentClient.score}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Perfil</p>
            <p className="text-sm font-semibold text-foreground">{currentClient.type}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">ID Cliente</p>
            <p className="text-sm font-semibold text-muted-foreground font-mono">{currentClient.id}</p>
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
      {matchingProjects.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {matchingProjects.map((proyecto) => (
            <ProjectCard key={proyecto.id} proyecto={proyecto} />
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
            No encontramos proyectos activos de constructoras en {currentClient.city}.
            Revisa más tarde o amplía tu búsqueda a otras ciudades.
          </p>
        </div>
      )}
    </div>
  );
}
