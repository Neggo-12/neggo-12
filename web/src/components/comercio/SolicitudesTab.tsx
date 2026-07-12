import { Fragment, useState, useEffect, useCallback } from 'react';
import {
  Store, Clock, FileText, Search, Shield, Sparkles, ChevronRight, ChevronDown,
  Loader2, AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { toast } from 'sonner';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  fetchMeInteresaLeadsByOrganization,
  updateMeInteresaPipelineEstado,
  updateMeInteresaProximaGestion,
  closeLeadWithCharge,
  fetchOrganizationPlanNegociacion,
  type MeInteresaLeadDisplay,
  type MeInteresaPipelineEstado,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';
import PipelineStatusBadge from '@/components/crm/PipelineStatusBadge';
import ExpandedLeadCRM from '@/components/crm/ExpandedLeadCRM';
import { ESTADOS_CIERRE } from '@/components/crm/pipelineConfig';

export default function SolicitudesTab({
  comercioNombre,
  comercioId,
  comercioCiudad,
  organizationId,
}: {
  comercioNombre: string;
  comercioId: string;
  comercioCiudad: string;
  organizationId: string | null;
}) {
  const [leads, setLeads] = useState<MeInteresaLeadDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [comercioPlan, setComercioPlan] = useState<string | null>(null);

  const loadSolicitudes = useCallback(async () => {
    if (!isDbConfigured || !organizationId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchMeInteresaLeadsByOrganization(organizationId);
    if (fetchError) {
      setError(fetchError);
      setLeads([]);
    } else {
      setLeads(data ?? []);
    }
    setIsLoading(false);
  }, [organizationId]);

  useEffect(() => {
    loadSolicitudes();
  }, [loadSolicitudes]);

  useEffect(() => {
    if (!organizationId) return;
    fetchOrganizationPlanNegociacion(organizationId).then(({ data }) => setComercioPlan(data));
  }, [organizationId]);

  const handlePipelineChange = useCallback(async (destinatarioId: string, estado: MeInteresaPipelineEstado) => {
    setLeads((prev) => prev.map((l) => (l.destinatarioId === destinatarioId ? { ...l, estadoPipeline: estado } : l)));
    const { error: updateError } = await updateMeInteresaPipelineEstado(destinatarioId, estado);
    if (updateError) {
      toast.error('No se pudo mover el pipeline', { description: updateError });
      loadSolicitudes();
    }
  }, [loadSolicitudes]);

  const handleSeguimientoChange = useCallback(async (destinatarioId: string, fecha: string | null) => {
    setLeads((prev) => prev.map((l) => (l.destinatarioId === destinatarioId ? { ...l, proximaGestionAt: fecha } : l)));
    const { error: updateError } = await updateMeInteresaProximaGestion(destinatarioId, fecha);
    if (updateError) {
      toast.error('No se pudo actualizar el seguimiento', { description: updateError });
      loadSolicitudes();
    }
  }, [loadSolicitudes]);

  const handleCierreConfirmado = useCallback(async (
    destinatarioId: string,
    input: { montoCierre: number; franquiciaTarjeta?: 'visa' | 'mastercard' | 'amex' },
  ) => {
    const lead = leads.find((l) => l.destinatarioId === destinatarioId);
    if (!lead) return;
    const { error: closeError } = await closeLeadWithCharge({
      destinatarioId, montoCierre: input.montoCierre, franquiciaTarjeta: input.franquiciaTarjeta ?? null,
    });
    if (closeError) {
      toast.error('No se pudo confirmar el cierre', { description: closeError });
    } else {
      setLeads((prev) => prev.map((l) => (l.destinatarioId === destinatarioId ? { ...l, estadoPipeline: ESTADOS_CIERRE[l.origen], montoCierre: input.montoCierre } : l)));
    }
  }, [leads]);

  const filtered = leads.filter((l) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      l.clienteNombre.toLowerCase().includes(q) ||
      (l.categoria ?? '').toLowerCase().includes(q) ||
      (l.subcategoria ?? '').toLowerCase().includes(q)
    );
  });

  // ───── DB not configured empty state ─────
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

  // ───── Loading state ─────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Cargando solicitudes de clientes...</p>
      </div>
    );
  }

  // ───── Error state ─────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar solicitudes</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={loadSolicitudes}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Comercio identity header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Store className="h-5 w-5 text-blue-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">{comercioNombre}</h2>
            <p className="text-xs text-muted-foreground">
              {comercioId ? `ID: ${comercioId}` : ''} · {comercioCiudad}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-blue-500/10 border border-blue-500/20 px-3 py-1.5">
            <Shield className="h-3.5 w-3.5 text-blue-400" />
            <span className="text-xs font-medium text-blue-400">Sesión Activa</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Solicitudes recibidas</div>
            <div className="text-lg font-bold text-foreground font-mono">{leads.length}</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por cliente, categoría o subcategoría..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card/60 border-border/40 text-sm"
        />
      </div>

      {/* Solicitudes table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-border/40 bg-card/40 animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-5">
            <FileText className="h-8 w-8 text-blue-400" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">
            {search ? 'No se encontraron solicitudes' : 'No tienes solicitudes de clientes en este momento'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {search
              ? 'Intenta ajustar tu término de búsqueda.'
              : 'Cuando un cliente elija tu categoría exacta en "Me Interesa", aparecerá aquí automáticamente.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-card/60">
                  <th className="w-8 px-2 py-3"></th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Subcategoría</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Teléfono</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((lead) => {
                  const isExpanded = expandedId === lead.destinatarioId;
                  const isClosed = lead.estadoPipeline === ESTADOS_CIERRE[lead.origen];
                  return (
                    <Fragment key={lead.destinatarioId}>
                    <tr className={cn('group transition-colors hover:bg-card/60', isClosed && 'opacity-50 bg-card/10')}>
                      <td className="px-2 py-3">
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : lead.destinatarioId)}
                          className="text-muted-foreground hover:text-foreground"
                          aria-label={isExpanded ? 'Contraer' : 'Expandir'}
                        >
                          {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-foreground font-medium">{lead.clienteNombre}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs border-border/40 bg-secondary/40">
                          {lead.categoria ?? '—'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">{lead.subcategoria || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs font-mono text-muted-foreground">{lead.clienteTelefono || '—'}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-1.5">
                          <PipelineStatusBadge estado={lead.estadoPipeline} />
                          {isClosed && (
                            <span className="inline-flex items-center gap-1 text-[9px] font-semibold text-emerald-400">
                              <CheckCircle2 className="h-3 w-3" /> Cerrado
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(lead.createdAt).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                    </tr>
                    {isExpanded && (
                      <tr className="bg-card/20">
                        <td colSpan={7} className="border-t border-border/30">
                          <ExpandedLeadCRM
                            lead={lead}
                            comercioPlan={comercioPlan}
                            onPipelineChange={(estado) => handlePipelineChange(lead.destinatarioId, estado)}
                            onCierreConfirmado={(input) => handleCierreConfirmado(lead.destinatarioId, input)}
                            onSeguimientoChange={(fecha) => handleSeguimientoChange(lead.destinatarioId, fecha)}
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

      {/* KPI summary footer */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          {[
            { label: 'Total Solicitudes', value: leads.length, icon: FileText, color: 'text-blue-400', bg: 'bg-blue-500/10' },
            {
              label: 'Pendientes',
              value: leads.filter((l) => l.estadoPipeline === 'pendiente').length,
              icon: Clock,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
            },
            {
              label: 'En Gestión',
              value: leads.filter((l) => l.estadoPipeline !== 'pendiente').length,
              icon: Sparkles,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border/40 bg-card/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', stat.bg)}>
                  <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
                </div>
              </div>
              <div className="text-xl font-bold text-foreground font-mono">{stat.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
