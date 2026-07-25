import { useState, useEffect, useCallback } from 'react';
import { Megaphone, DollarSign, Loader2, AlertTriangle, Landmark, Store, Home, Search, Compass } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatCOP } from '@/lib/utils';
import {
  fetchCampanasRankingAdmin,
  fetchFacturasResumenPorNegocio,
  fetchComerciosMasBuscados,
  fetchSeccionesMasUsadas,
  type CampanaRankingRow,
  type FacturaResumenNegocio,
  type ComercioMasBuscado,
  type SeccionMasUsada,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';
import type { PortalTab } from '@/features/portal/store/usePortalStore';

const TIPO_ICON: Record<string, typeof Landmark> = {
  banco: Landmark,
  constructora: Home,
  comercio: Store,
};

// Mismas etiquetas que ve el cliente en el portal (ClientPortal.tsx TAB_LABELS)
// — se repite acá porque ese mapa vive junto al router, no es exportable sin
// arrastrar el resto de la página.
const SECCION_LABELS: Record<PortalTab, string> = {
  finanzas: 'Finanzas',
  'control-financiero': 'Control Financiero',
  ofertas: 'Ofertas',
  'oportunidades-inmobiliarias': 'Oportunidades Inmobiliarias',
  metas: 'Metas',
  facturas: 'Facturas',
  solicitudes: 'Me Interesa',
  'buscar-comercios': 'Buscar Comercios',
  feedback: 'Soporte y Feedback',
};

function seccionLabel(seccion: string): string {
  return SECCION_LABELS[seccion as PortalTab] ?? seccion;
}

export default function EstadisticasPanel() {
  const [campanas, setCampanas] = useState<CampanaRankingRow[]>([]);
  const [ingresos, setIngresos] = useState<FacturaResumenNegocio[]>([]);
  const [comerciosBuscados, setComerciosBuscados] = useState<ComercioMasBuscado[]>([]);
  const [seccionesUsadas, setSeccionesUsadas] = useState<SeccionMasUsada[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isDbConfigured) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const [campanasRes, ingresosRes, comerciosRes, seccionesRes] = await Promise.all([
      fetchCampanasRankingAdmin(),
      fetchFacturasResumenPorNegocio({ orderBy: 'total_facturado', offset: 0, limit: 5 }),
      fetchComerciosMasBuscados(5),
      fetchSeccionesMasUsadas(),
    ]);
    if (campanasRes.error) {
      setError(campanasRes.error);
    } else {
      setCampanas(campanasRes.data ?? []);
    }
    if (ingresosRes.data) setIngresos(ingresosRes.data);
    if (comerciosRes.data) setComerciosBuscados(comerciosRes.data);
    if (seccionesRes.data) setSeccionesUsadas(seccionesRes.data.slice(0, 5));
    setIsLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  if (!isDbConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <AlertTriangle className="h-8 w-8 text-amber-400 mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-2">Base de datos no configurada</h3>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar estadísticas</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>Reintentar</Button>
      </div>
    );
  }

  const campanasConLeads = campanas.filter((c) => c.totalLeads > 0).slice(0, 5);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Estadísticas</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Ranking de campañas, ingresos, y qué buscan y usan los clientes en el ecosistema
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {/* Campañas más exitosas */}
        <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Megaphone className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Campañas con más leads</h3>
          </div>
          {campanasConLeads.length === 0 ? (
            <p className="text-xs text-muted-foreground">Ninguna campaña tiene leads todavía.</p>
          ) : (
            <div className="space-y-2">
              {campanasConLeads.map((c) => {
                const Icon = TIPO_ICON[c.organizationType] ?? Megaphone;
                return (
                  <div key={c.id} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-card/40 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{c.titulo}</p>
                        <p className="text-[10px] text-muted-foreground truncate">{c.organizationName}</p>
                      </div>
                    </div>
                    <span className="shrink-0 text-xs font-mono font-semibold text-foreground">{c.totalLeads} leads</span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* B2B con más ingresos */}
        <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <DollarSign className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Negocios que más ingresos generan</h3>
          </div>
          {ingresos.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin facturación registrada todavía.</p>
          ) : (
            <div className="space-y-2">
              {ingresos.map((r) => {
                const Icon = TIPO_ICON[r.organizationType] ?? Store;
                return (
                  <div key={r.organizationId} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-card/40 px-3 py-2">
                    <div className="flex items-center gap-2 min-w-0">
                      <Icon className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                      <div className="min-w-0">
                        <p className="text-xs font-medium text-foreground truncate">{r.organizationName}</p>
                        <p className="text-[10px] text-muted-foreground">{r.cantidadCargos} cargo{r.cantidadCargos === 1 ? '' : 's'}</p>
                      </div>
                    </div>
                    <span className={cn('shrink-0 text-xs font-mono font-semibold', r.totalFacturado > 0 ? 'text-emerald-400' : 'text-muted-foreground')}>
                      {formatCOP(r.totalFacturado)}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Comercios más buscados */}
        <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Search className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Comercios más buscados</h3>
          </div>
          {comerciosBuscados.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no hay clientes contactando comercios.</p>
          ) : (
            <div className="space-y-2">
              {comerciosBuscados.map((c) => (
                <div key={c.organizationId} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-card/40 px-3 py-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <Store className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-foreground truncate">{c.name}</p>
                      {c.ciudad && <p className="text-[10px] text-muted-foreground truncate">{c.ciudad}</p>}
                    </div>
                  </div>
                  <span className="shrink-0 text-xs font-mono font-semibold text-foreground">{c.totalSelecciones}x</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Secciones más usadas */}
        <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Secciones más usadas</h3>
          </div>
          {seccionesUsadas.length === 0 ? (
            <p className="text-xs text-muted-foreground">Todavía no hay navegación registrada.</p>
          ) : (
            <div className="space-y-2">
              {seccionesUsadas.map((s) => (
                <div key={s.seccion} className="flex items-center justify-between gap-3 rounded-lg border border-border/30 bg-card/40 px-3 py-2">
                  <span className="text-xs font-medium text-foreground truncate">{seccionLabel(s.seccion)}</span>
                  <span className="shrink-0 text-xs font-mono font-semibold text-foreground">{s.totalVistas} vistas</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
