import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  TrendingDown, Target, BarChart3, Users,
  PieChart, XCircle, Loader2, RefreshCw,
  Filter,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { fetchMetricasRechazo, computeRejectionAggregates } from '@/core/db/repositories';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { RejectionMetric, RejectionAggregate, OfferSector } from '@/types';

// ───── Mock fallback data for demo mode (when DB is not configured) ─────

const MOCK_METRICS: RejectionMetric[] = [
  { id: 'REJ-001', offerId: 'CDT-180D', sector: 'banca', productType: 'CDT', entityName: 'Bancolombia', userId: 'USR-CLIENTE-01', userAge: 29, userGender: 'Mujer', userIncomeRange: '$3M - $6M COP', userProfileType: 'Ingreso Medio', userCity: 'Medellín', rejectedAt: new Date().toISOString() },
  { id: 'REJ-002', offerId: 'CDT-180D', sector: 'banca', productType: 'CDT', entityName: 'Davivienda', userId: 'USR-CLIENTE-01', userAge: 25, userGender: 'Mujer', userIncomeRange: '$3M - $6M COP', userProfileType: 'Ingreso Medio', userCity: 'Bogotá', rejectedAt: new Date().toISOString() },
  { id: 'REJ-003', offerId: 'CDT-180D', sector: 'banca', productType: 'CDT', entityName: 'BBVA', userId: 'USR-CLIENTE-01', userAge: 31, userGender: 'Mujer', userIncomeRange: '$3M - $6M COP', userProfileType: 'Ingreso Medio', userCity: 'Medellín', rejectedAt: new Date().toISOString() },
  { id: 'REJ-004', offerId: 'L-180D', sector: 'banca', productType: 'Libre Inversión', entityName: 'Banco de Bogotá', userId: 'USR-CLIENTE-01', userAge: 28, userGender: 'Hombre', userIncomeRange: '$1M - $3M COP', userProfileType: 'Ingreso Bajo', userCity: 'Cali', rejectedAt: new Date().toISOString() },
  { id: 'REJ-005', offerId: 'PROJ-SS10', sector: 'constructoras', productType: 'Apartamento', entityName: 'Constructora Marval', userId: 'USR-CLIENTE-01', userAge: 34, userGender: 'Mujer', userIncomeRange: '$3M - $6M COP', userProfileType: 'Ingreso Medio', userCity: 'Bogotá', rejectedAt: new Date().toISOString() },
  { id: 'REJ-006', offerId: 'PROJ-SS10', sector: 'constructoras', productType: 'Apartamento', entityName: 'Coninsa', userId: 'USR-CLIENTE-01', userAge: 30, userGender: 'Mujer', userIncomeRange: '$3M - $6M COP', userProfileType: 'Ingreso Medio', userCity: 'Medellín', rejectedAt: new Date().toISOString() },
  { id: 'REJ-007', offerId: 'COM-01', sector: 'establecimientos', productType: 'iPhone', entityName: 'ElectroMundo', userId: 'USR-CLIENTE-01', userAge: 25, userGender: 'Hombre', userIncomeRange: '$1M - $3M COP', userProfileType: 'Ingreso Bajo', userCity: 'Bogotá', rejectedAt: new Date().toISOString() },
  { id: 'REJ-008', offerId: 'COM-02', sector: 'establecimientos', productType: 'Carro Híbrido', entityName: 'AutoMercado Premium', userId: 'USR-CLIENTE-01', userAge: 27, userGender: 'Mujer', userIncomeRange: '$3M - $6M COP', userProfileType: 'Ingreso Medio', userCity: 'Cali', rejectedAt: new Date().toISOString() },
];

// ───── Sector filter config ─────

const SECTOR_CONFIG: Record<string, { label: string; color: string }> = {
  constructoras: { label: 'Constructoras', color: 'text-blue-400' },
  banca: { label: 'Banca', color: 'text-cyan-400' },
  establecimientos: { label: 'Establecimientos', color: 'text-emerald-400' },
  inversiones: { label: 'Inversiones', color: 'text-amber-400' },
};

// ───── Component ─────

interface RejectionMetricsPanelProps {
  /** Filter metrics to only this sector (optional) */
  entityType?: OfferSector;
  /** Optional: further filter by entity name */
  entityName?: string;
  /** Organization ID for multi-tenant isolation — when provided, only metrics
   *  belonging to users in this organization are fetched from the DB */
  organizationId?: string | null;
}

export default function RejectionMetricsPanel({ entityType, entityName, organizationId }: RejectionMetricsPanelProps) {
  const [metrics, setMetrics] = useState<RejectionMetric[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedSector, setSelectedSector] = useState<OfferSector | 'all'>(entityType ?? 'all');

  /** When an entityType is provided, lock the sector to that specific value */
  const isSectorLocked = entityType !== undefined;

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await fetchMetricasRechazo(organizationId);
    if (data && data.length > 0) {
      setMetrics(data);
    } else if (error) {
      // Fallback to mock data for demo
      console.warn('[RejectionMetrics] Using mock data:', error);
      setMetrics(MOCK_METRICS);
    } else {
      // No data — use mock
      setMetrics(MOCK_METRICS);
    }
    setIsLoading(false);
  }, [organizationId]);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  const effectiveSector = isSectorLocked ? entityType : selectedSector;

  const filtered = useMemo(() => {
    let result = metrics;
    if (effectiveSector !== 'all') {
      result = result.filter((m) => m.sector === effectiveSector);
    }
    if (entityName) {
      result = result.filter((m) => m.entityName === entityName);
    }
    return result;
  }, [metrics, effectiveSector, entityName]);

  const aggregates: RejectionAggregate = useMemo(
    () => computeRejectionAggregates(filtered),
    [filtered],
  );

  const sectorOptions: (OfferSector | 'all')[] = ['all', 'constructoras', 'banca', 'establecimientos', 'inversiones'];

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
              <TrendingDown className="h-3.5 w-3.5 text-red-400" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Métricas de Demanda y Rechazos</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Analítica agregada de por qué y quiénes están descartando tus ofertas.
            Datos demográficos anonimizados para optimizar tus campañas.
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          onClick={loadMetrics}
          disabled={isLoading}
          className="gap-1.5 text-xs border-border/40 rounded-lg"
        >
          {isLoading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <RefreshCw className="h-3.5 w-3.5" />
          )}
          Actualizar
        </Button>
      </div>

      {/* Sector filter — hidden when locked to a single entity type */}
      {!isSectorLocked && (
        <div className="flex flex-wrap gap-2">
          {sectorOptions.map((sector) => {
            const cfg = SECTOR_CONFIG[sector];
            return (
              <button
                key={sector}
                onClick={() => setSelectedSector(sector)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-all',
                  selectedSector === sector
                    ? 'border-red-500/30 bg-red-500/10 text-red-400'
                    : 'border-border/40 bg-card/40 text-muted-foreground hover:text-foreground',
                )}
              >
                <Filter className="h-3 w-3" />
                {sector === 'all' ? 'Todos los sectores' : cfg?.label ?? sector}
              </button>
            );
          })}
        </div>
      )}

      {/* Locked sector indicator */}
      {isSectorLocked && entityType && (
        <div className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/20 bg-red-500/5 px-3 py-1.5 text-xs font-medium text-red-400">
          <Filter className="h-3 w-3" />
          Mostrando solo: {SECTOR_CONFIG[entityType]?.label ?? entityType}
        </div>
      )}

      {isLoading && filtered.length === 0 ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/40 bg-card/40">
          <XCircle className="h-10 w-10 text-muted-foreground/40 mb-3" />
          <p className="text-sm font-medium text-muted-foreground">Sin métricas de rechazo aún</p>
          <p className="text-xs text-muted-foreground/50 mt-1">
            Los rechazos comenzarán a aparecer cuando los clientes descarten ofertas desde el portal.
          </p>
        </div>
      ) : (
        <>
          {/* Key Insights */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-red-500/10">
                  <Target className="h-3.5 w-3.5 text-red-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Producto más rechazado
                </span>
              </div>
              <p className="text-sm font-bold text-red-400 mb-0.5">{aggregates.topRejectedProduct}</p>
              <p className="text-[10px] text-muted-foreground">
                {aggregates.topRejectedProductCount} rechazo
                {aggregates.topRejectedProductCount !== 1 ? 's' : ''} en el período
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10">
                  <Users className="h-3.5 w-3.5 text-amber-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Segmento que más descarta
                </span>
              </div>
              <p className="text-sm font-bold text-amber-400 mb-0.5">{aggregates.topDemographicSegment}</p>
              <p className="text-[10px] text-muted-foreground">
                {aggregates.topDemographicCount} rechazo
                {aggregates.topDemographicCount !== 1 ? 's' : ''}
              </p>
            </div>

            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-blue-500/10">
                  <BarChart3 className="h-3.5 w-3.5 text-blue-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Total rechazos
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground font-mono">{aggregates.totalRejections}</p>
            </div>

            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex h-6 w-6 items-center justify-center rounded-md bg-purple-500/10">
                  <PieChart className="h-3.5 w-3.5 text-purple-400" />
                </div>
                <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">
                  Por sector
                </span>
              </div>
              <div className="space-y-1">
                {Object.entries(aggregates.bySector)
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 3)
                  .map(([sector, count]) => (
                    <div key={sector} className="flex items-center justify-between text-xs">
                      <span className={cn(SECTOR_CONFIG[sector]?.color ?? 'text-muted-foreground')}>
                        {SECTOR_CONFIG[sector]?.label ?? sector}
                      </span>
                      <span className="font-mono font-semibold text-foreground">{count}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>

          {/* Distribution breakdowns */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {/* By Gender */}
            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                <Users className="h-3.5 w-3.5 text-pink-400" />
                Distribución por Género
              </h4>
              <div className="space-y-2">
                {Object.entries(aggregates.byGender).map(([gender, count]) => {
                  const pct = aggregates.totalRejections > 0
                    ? Math.round((count / aggregates.totalRejections) * 100)
                    : 0;
                  return (
                    <div key={gender} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground">{gender}</span>
                        <span className="font-mono text-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-pink-500/60 transition-all duration-500"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* By Income Range */}
            <div className="rounded-xl border border-border/40 bg-card/40 p-4">
              <h4 className="text-xs font-semibold text-foreground mb-3 flex items-center gap-2">
                <BarChart3 className="h-3.5 w-3.5 text-emerald-400" />
                Distribución por Ingresos
              </h4>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {Object.entries(aggregates.byIncome).map(([income, count]) => {
                  const pct = aggregates.totalRejections > 0
                    ? Math.round((count / aggregates.totalRejections) * 100)
                    : 0;
                  return (
                    <div key={income} className="space-y-1">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-muted-foreground truncate max-w-[140px]">{income || 'No especificado'}</span>
                        <span className="font-mono text-foreground">{count} ({pct}%)</span>
                      </div>
                      <div className="h-1.5 rounded-full bg-secondary overflow-hidden">
                        <div
                          className="h-full rounded-full bg-emerald-500/60 transition-all duration-500"
                          style={{ width: `${Math.max(pct, 4)}%` }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Insight banner */}
          {aggregates.totalRejections > 0 && (
            <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex items-start gap-3">
              <Target className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-amber-400">
                  Recomendación de Neggo para optimizar tus campañas
                </p>
                <p className="text-[11px] text-muted-foreground leading-relaxed">
                  El segmento que más descarta tus ofertas es{' '}
                  <span className="font-semibold text-amber-400">{aggregates.topDemographicSegment}</span>.
                  Considera ajustar tu mensaje comercial o las condiciones para este perfil.
                  Los datos agregados son 100% anónimos y cumplen con las políticas de privacidad de Neggo.
                </p>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
