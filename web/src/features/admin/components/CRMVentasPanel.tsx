import { Fragment, useState, useEffect, useCallback, useMemo } from 'react';
import {
  Search, ChevronRight, ChevronDown, Loader2, AlertTriangle, Users2,
  Send, Clock3, MessageSquareReply, CalendarClock, PartyPopper, XCircle, Ban,
  Instagram, Linkedin, Radar,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
import { isDbConfigured } from '@/core/db/dbClient';
import {
  fetchCrmVentasLeads,
  crmVentasMarcarEnviado,
  crmVentasRegistrarRespuesta,
  crmVentasCambiarEtapa,
  type CrmVentasLeadDisplay,
  type CrmVentasEtapa,
  type CrmVentasCambiarEtapaExtra,
} from '@/core/db/repositories';
import EtapaVentaBadge from '@/components/crmVentas/EtapaVentaBadge';
import ExpandedLeadVenta from '@/components/crmVentas/ExpandedLeadVenta';
import { ETAPA_VENTA_ORDER, ETAPA_VENTA_CONFIG, CANAL_LABELS } from '@/components/crmVentas/etapaVentaConfig';

type CanalTab = 'Instagram' | 'LinkedIn' | 'Prospectos';

const CANAL_TABS: { id: CanalTab; label: string; icon: typeof Instagram }[] = [
  { id: 'Instagram', label: 'Leads Instagram', icon: Instagram },
  { id: 'LinkedIn', label: 'Leads LinkedIn', icon: Linkedin },
  { id: 'Prospectos', label: 'Prospectos', icon: Radar },
];

const KPI_ICONS: Partial<Record<CrmVentasEtapa, typeof Send>> = {
  'Pendiente de envío': Send,
  'En seguimiento': Clock3,
  'Respondió': MessageSquareReply,
  'Agendado': CalendarClock,
  'Cerrado - ganado': PartyPopper,
  'Perdido': XCircle,
  'Descartado': Ban,
};

/**
 * Pestaña "CRM Ventas" (docs/spec-crm-ventas-admin.md) — prospección diaria de Growth &
 * Adquisición trabajada por Jhey. 3 sub-tabs son SIEMPRE filtros sobre la misma tabla
 * `crm_ventas_leads` (nunca tablas separadas, sección 3 del spec).
 */
export default function CRMVentasPanel() {
  const [leads, setLeads] = useState<CrmVentasLeadDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [canalTab, setCanalTab] = useState<CanalTab>('Instagram');
  const [etapaFilter, setEtapaFilter] = useState<CrmVentasEtapa | 'todas'>('todas');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const loadLeads = useCallback(async () => {
    if (!isDbConfigured) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchCrmVentasLeads();
    if (fetchError) {
      setError(fetchError);
      setLeads([]);
    } else {
      setLeads(data ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => {
    loadLeads();
  }, [loadLeads]);

  /** Aplica un patch optimista a un lead, lo marca como recién tocado (`updatedAt` = ahora) y
   * re-ordena para que suba al tope — mismo criterio que el `order('updated_at desc')` del
   * fetch, para que el salto sea instantáneo y no haya que esperar el próximo reload. */
  const applyLeadPatch = useCallback((id: string, patch: Partial<CrmVentasLeadDisplay>) => {
    const now = new Date().toISOString();
    setLeads((prev) => {
      const next = prev.map((l) => (l.id === id ? { ...l, ...patch, updatedAt: now } : l));
      return [...next].sort((a, b) => (a.updatedAt < b.updatedAt ? 1 : a.updatedAt > b.updatedAt ? -1 : 0));
    });
  }, []);

  const handleMarcarEnviado = useCallback(async (id: string) => {
    applyLeadPatch(id, { estadoEnvio: 'Enviado', etapa: 'En seguimiento', fechaEnvio: new Date().toISOString() });
    const { error: updateError } = await crmVentasMarcarEnviado(id);
    if (updateError) {
      toast.error('No se pudo marcar como enviado', { description: updateError });
      loadLeads();
    } else {
      toast.success('Marcado como enviado', { description: 'El lead pasó a "En seguimiento".' });
    }
  }, [loadLeads, applyLeadPatch]);

  const handleGuardarRespuesta = useCallback(async (id: string, respuesta: string) => {
    applyLeadPatch(id, { respuestaReal: respuesta, etapa: 'Respondió', respuestaSugerida: null, fechaRespuesta: new Date().toISOString() });
    const { error: updateError } = await crmVentasRegistrarRespuesta(id, respuesta);
    if (updateError) {
      toast.error('No se pudo guardar la respuesta', { description: updateError });
      loadLeads();
    } else {
      toast.success('Respuesta guardada', { description: 'El agente de Ventas generará la respuesta sugerida en su próxima corrida.' });
    }
  }, [loadLeads, applyLeadPatch]);

  const handleCambiarEtapa = useCallback(async (id: string, etapa: CrmVentasEtapa, extra?: CrmVentasCambiarEtapaExtra) => {
    applyLeadPatch(id, {
      etapa,
      ...(extra?.fechaProximaAccion !== undefined && { fechaProximaAccion: extra.fechaProximaAccion }),
      ...(extra?.proximaAccion !== undefined && { proximaAccion: extra.proximaAccion }),
      ...(extra?.planElegido !== undefined && { planElegido: extra.planElegido }),
      ...(extra?.valorMensualEstimado !== undefined && { valorMensualEstimado: extra.valorMensualEstimado }),
      ...(extra?.notas !== undefined && { notas: extra.notas }),
    });
    const { error: updateError } = await crmVentasCambiarEtapa(id, etapa, extra);
    if (updateError) {
      toast.error('No se pudo mover la etapa', { description: updateError });
      loadLeads();
    } else {
      toast.success(`Etapa actualizada: ${ETAPA_VENTA_CONFIG[etapa].label}`);
    }
  }, [loadLeads, applyLeadPatch]);

  const canalScoped = useMemo(() => {
    if (canalTab === 'Prospectos') return leads.filter((l) => l.canalPrincipal !== 'Instagram' && l.canalPrincipal !== 'LinkedIn');
    return leads.filter((l) => l.canalPrincipal === canalTab);
  }, [leads, canalTab]);

  const kpis = useMemo(() => {
    const counts = new Map<CrmVentasEtapa, number>();
    for (const l of canalScoped) counts.set(l.etapa, (counts.get(l.etapa) ?? 0) + 1);
    return counts;
  }, [canalScoped]);

  const filtered = useMemo(() => {
    let result = canalScoped;
    if (etapaFilter !== 'todas') result = result.filter((l) => l.etapa === etapaFilter);
    if (search) {
      const q = search.toLowerCase();
      result = result.filter((l) =>
        l.nombreNegocio.toLowerCase().includes(q) ||
        (l.categoria ?? '').toLowerCase().includes(q) ||
        (l.ciudadZona ?? '').toLowerCase().includes(q) ||
        (l.contacto ?? '').toLowerCase().includes(q),
      );
    }
    return result;
  }, [canalScoped, etapaFilter, search]);

  // ───── DB not configured ─────
  if (!isDbConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Base de datos no configurada</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Configura las variables de entorno <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> y{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> para activar la persistencia real.
        </p>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Cargando CRM Ventas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar el CRM</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={loadLeads}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Users2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">CRM Ventas</h2>
            <p className="text-xs text-muted-foreground">Prospección de Growth &amp; Adquisición — trabajo diario, uso interno</p>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-muted-foreground">Leads totales</div>
          <div className="text-lg font-bold text-foreground font-mono">{leads.length}</div>
        </div>
      </div>

      {/* Sub-tabs por canal (filtros sobre la misma tabla) */}
      <Tabs value={canalTab} onValueChange={(v) => { setCanalTab(v as CanalTab); setEtapaFilter('todas'); setExpandedId(null); }}>
        <TabsList className="h-11 w-full justify-start gap-1 bg-transparent p-0 border-b border-border/40 rounded-none">
          {CANAL_TABS.map((tab) => (
            <TabsTrigger
              key={tab.id}
              value={tab.id}
              className="relative flex items-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all data-[state=active]:border-border/60 data-[state=active]:bg-card/80 data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-card/40 hover:text-foreground"
            >
              <tab.icon className="h-4 w-4" />
              {tab.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value={canalTab} className="mt-4 space-y-4 animate-fade-in">
          {/* KPI chips — también funcionan como filtro rápido por etapa */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setEtapaFilter('todas')}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors',
                etapaFilter === 'todas' ? 'border-foreground/30 bg-foreground/10 text-foreground' : 'border-border/40 bg-card/40 text-muted-foreground hover:text-foreground',
              )}
            >
              Todas <span className="font-mono">{canalScoped.length}</span>
            </button>
            {ETAPA_VENTA_ORDER.map((etapa) => {
              const count = kpis.get(etapa) ?? 0;
              const cfg = ETAPA_VENTA_CONFIG[etapa];
              const Icon = KPI_ICONS[etapa];
              const active = etapaFilter === etapa;
              return (
                <button
                  key={etapa}
                  onClick={() => setEtapaFilter(active ? 'todas' : etapa)}
                  disabled={count === 0}
                  className={cn(
                    'inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors disabled:opacity-40 disabled:cursor-not-allowed',
                    active ? cn(cfg.bg, cfg.text, cfg.border) : 'border-border/40 bg-card/40 text-muted-foreground hover:text-foreground',
                  )}
                >
                  {Icon && <Icon className="h-3 w-3" />}
                  {cfg.label} <span className="font-mono">{count}</span>
                </button>
              );
            })}
          </div>

          {/* Search */}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Buscar por negocio, categoría, ciudad o contacto..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-card/60 border-border/40 text-sm"
            />
          </div>

          {/* Tabla */}
          {filtered.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40 animate-fade-in">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
                <Users2 className="h-7 w-7 text-emerald-400" />
              </div>
              <h3 className="text-sm font-semibold text-foreground mb-1.5">
                {search || etapaFilter !== 'todas' ? 'No se encontraron leads con este filtro' : 'Sin leads todavía en este canal'}
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm">
                {search || etapaFilter !== 'todas'
                  ? 'Ajustá la búsqueda o quitá el filtro de etapa.'
                  : 'Cuando Growth & Adquisición prospecte por este canal, los leads van a aparecer acá automáticamente.'}
              </p>
            </div>
          ) : (
            <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40 bg-card/60">
                      <th className="w-8 px-2 py-3"></th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Negocio</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Canal</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Etapa</th>
                      <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha alta</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {filtered.map((lead) => {
                      const isExpanded = expandedId === lead.id;
                      const isCerrado = lead.etapa === 'Cerrado - ganado' || lead.etapa === 'Perdido' || lead.etapa === 'Descartado';
                      return (
                        <Fragment key={lead.id}>
                          <tr className={cn('group transition-colors hover:bg-card/60 cursor-pointer', isCerrado && 'opacity-60')} onClick={() => setExpandedId(isExpanded ? null : lead.id)}>
                            <td className="px-2 py-3">
                              <button className="text-muted-foreground hover:text-foreground" aria-label={isExpanded ? 'Contraer' : 'Expandir'}>
                                {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                              </button>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-foreground font-medium">{lead.nombreNegocio}</span>
                              {lead.cuentaGrande && <span className="ml-1.5 text-[9px] text-amber-400 font-semibold">★ grande</span>}
                            </td>
                            <td className="px-4 py-3">
                              <Badge variant="outline" className="text-xs border-border/40 bg-secondary/40">{lead.categoria ?? '—'}</Badge>
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">{CANAL_LABELS[lead.canalPrincipal]}</span>
                            </td>
                            <td className="px-4 py-3">
                              <EtapaVentaBadge etapa={lead.etapa} compact />
                            </td>
                            <td className="px-4 py-3">
                              <span className="text-xs text-muted-foreground">
                                {new Date(lead.fechaAlta).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
                              </span>
                            </td>
                          </tr>
                          {isExpanded && (
                            <tr className="bg-card/20">
                              <td colSpan={6} className="border-t border-border/30">
                                <ExpandedLeadVenta
                                  lead={lead}
                                  onMarcarEnviado={() => handleMarcarEnviado(lead.id)}
                                  onGuardarRespuesta={(respuesta) => handleGuardarRespuesta(lead.id, respuesta)}
                                  onCambiarEtapa={(etapa, extra) => handleCambiarEtapa(lead.id, etapa, extra)}
                                />
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
