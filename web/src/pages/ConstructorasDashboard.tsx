import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Building2, Users, TrendingUp, MapPin, Home, DollarSign,
  Target, Award, Search, ChevronDown, ChevronUp, ChevronRight,
  Phone, MessageCircle, MoreHorizontal, CheckCircle2,
  UserPlus, BarChart3, ArrowRightLeft, X, Loader2, AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import ScoreBadge from '@/components/ScoreBadge';
import PriorityBadge from '@/components/PriorityBadge';
import LeadStatusBadge from '@/components/LeadStatusBadge';
import CrearProyectoDialog from '@/components/CrearProyectoDialog';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';
import CrossSectorFeedbackPanel from '@/components/feedback/CrossSectorFeedbackPanel';
import RejectionMetricsPanel from '@/components/rejection/RejectionMetricsPanel';
import type { SidebarNavItem } from '@/components/WorkspaceSidebar';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import {
  upsertLeadEstado,
  fetchProyectos,
  fetchLeads,
  type ProyectoRow,
  type LeadRow,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';
import { useAuthStore } from '@/store/useAuthStore';
import type { LeadInmobiliario, ProyectoConstructora, LeadStatus } from '@/types';
import { MessageSquareText, TrendingDown } from 'lucide-react';

type ConstTab = 'proyectos' | 'leads' | 'matching' | 'analitica' | 'feedback' | 'metricas-rechazo';

const CONST_SECTIONS: SidebarNavItem[] = [
  { key: 'proyectos', label: 'Proyectos', icon: Building2 },
  { key: 'leads', label: 'Leads Inmobiliarios', icon: Users },
  { key: 'matching', label: 'Matching', icon: Target },
  { key: 'analitica', label: 'Analítica', icon: TrendingUp },
  { key: 'feedback', label: 'Feedback Clientes', icon: MessageSquareText },
  { key: 'metricas-rechazo', label: 'Metricas Rechazo', icon: BarChart3 },
];

/** Convierte un ProyectoRow de Supabase a ProyectoConstructora para la UI */
function rowToProyecto(row: ProyectoRow): ProyectoConstructora {
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
    tipoVivienda: 'apartamento',
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

/** Convierte un LeadRow de Supabase a LeadInmobiliario para la UI */
function rowToLead(row: LeadRow): LeadInmobiliario {
  const statusMap: Record<string, LeadInmobiliario['status']> = {
    pendiente: 'pendiente',
    contactado: 'contactado',
    'en-proceso': 'en-proceso',
    documentacion: 'documentacion',
    viable: 'viable',
    aprobado: 'aprobado',
    perdido: 'perdido',
  };
  return {
    id: row.id,
    name: row.cliente_nombre ?? 'Sin nombre',
    phone: '',
    email: '',
    capacidadCompra: 0,
    score: 500,
    hipotecarioInterest: true,
    ingresosEstimados: 0,
    city: '',
    tipoVivienda: 'apartamento' as const,
    priority: 'media' as const,
    proyecto: row.proyecto_id ?? '',
    proyectoId: row.proyecto_id ?? '',
    status: statusMap[row.estado] ?? 'pendiente',
    lastActivity: row.created_at,
    assignedTo: row.asesor_asignado ?? '',
    isBankClient: false,
    createdAt: row.created_at,
    clienteId: row.cliente_id ?? '',
    constructoraId: row.constructora_id ?? '',
  };
}

export default function ConstructorasDashboard() {
  const [activeSection, setActiveSection] = useState<ConstTab>('proyectos');
  const [search, setSearch] = useState('');
  const [activeProject, setActiveProject] = useState<string | null>(null);
  const [expandedLead, setExpandedLead] = useState<string | null>(null);
  const [callDialogLead, setCallDialogLead] = useState<LeadInmobiliario | null>(null);
  const [messageDialogLead, setMessageDialogLead] = useState<LeadInmobiliario | null>(null);

  // Resolve org ID from session for multi-tenant isolation
  const getOrganizationId = useAuthStore((s) => s.getOrganizationId);
  const organizationId = getOrganizationId();

  // Real data from Supabase
  const [proyectos, setProyectos] = useState<ProyectoConstructora[]>([]);
  const [leadsInmobiliarios, setLeadsInmobiliarios] = useState<LeadInmobiliario[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isDbConfigured) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const [proyRes, leadRes] = await Promise.all([
        fetchProyectos(organizationId),
        fetchLeads(organizationId),
      ]);
      if (proyRes.error) setLoadError(proyRes.error);
      if (leadRes.error && !proyRes.error) setLoadError(leadRes.error);

      const proyData = proyRes.data ?? [];
      const leadData = leadRes.data ?? [];

      setProyectos(proyData.map(rowToProyecto));
      setLeadsInmobiliarios(leadData.map(rowToLead));
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    }
    setIsLoading(false);
  }, [organizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const filteredLeads = useMemo(() => {
    let result = leadsInmobiliarios.filter((l) => l.hipotecarioInterest === true);
    if (activeProject) {
      result = result.filter((l) => l.proyecto === activeProject);
    }
    if (search) {
      const q = search.toLowerCase();
      result = result.filter(
        (l) =>
          l.name.toLowerCase().includes(q) ||
          l.phone.includes(q) ||
          l.proyecto.toLowerCase().includes(q)
      );
    }
    return result;
  }, [search, activeProject, leadsInmobiliarios]);

  const handleStatusChange = useCallback((leadId: string, newStatus: LeadStatus) => {
    const lead = leadsInmobiliarios.find((l) => l.id === leadId);
    if (!lead) return;
    const label =
      newStatus === 'contactado' ? 'Contactado' : newStatus === 'en-proceso' ? 'En Cita' : 'Separado ✓';
    void upsertLeadEstado({
      id: lead.id,
      clienteRef: lead.clienteId,
      clienteNombre: lead.name,
      proyectoId: lead.proyectoId,
      constructoraId: lead.constructoraId,
      status: newStatus,
      asesorAsignado: lead.assignedTo,
      canalContacto: 'Panel Constructora',
    }).then(({ error }) => {
      if (error) {
        toast.error('No se pudo sincronizar el estado del lead', { description: error });
      } else {
        toast.success(`Lead ${leadId} → ${label}`, {
          description: 'Estado guardado en la base de datos con token de atribución',
        });
      }
    });
  }, [leadsInmobiliarios]);

  const totals = useMemo(() => {
    const active = proyectos.filter((p) => p.status === 'activo');
    return {
      proyectos: active.length,
      totalUnits: active.reduce((s, p) => s + p.units, 0),
      totalLeads: leadsInmobiliarios.length,
      avgConversion: 0,
      avgScore: 0,
      hipotecarioInterest: 0,
    };
  }, [proyectos, leadsInmobiliarios]);

  // ───── DB Not Configured ─────
  if (!isDbConfigured) {
    return (
      <div className="min-h-screen bg-background flex">
        <WorkspaceSidebar
          brand={{ initials: 'NC', name: 'Neggo Constructoras', subtitle: 'Captación Inmobiliaria', icon: Home }}
          navItems={CONST_SECTIONS}
          activeKey={activeSection}
          onNavigate={(key) => setActiveSection(key as ConstTab)}
          footer={{ initials: 'OI', name: 'Operador Inmobiliario', role: 'Gerente de Proyecto' }}
          accent="blue"
          backToHubLabel="Cambiar Entorno"
        />
        <div className="flex-1 min-w-0 overflow-y-auto lg:pl-64">
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-5">
              <AlertTriangle className="h-8 w-8 text-blue-400" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">Base de datos no configurada</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Configura <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> y{' '}
              <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> para activar la persistencia real.
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ───── Loading ─────
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex">
        <WorkspaceSidebar
          brand={{ initials: 'NC', name: 'Neggo Constructoras', subtitle: 'Captación Inmobiliaria', icon: Home }}
          navItems={CONST_SECTIONS}
          activeKey={activeSection}
          onNavigate={(key) => setActiveSection(key as ConstTab)}
          footer={{ initials: 'OI', name: 'Operador Inmobiliario', role: 'Gerente de Proyecto' }}
          accent="blue"
          backToHubLabel="Cambiar Entorno"
        />
        <div className="flex-1 min-w-0 overflow-y-auto lg:pl-64">
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <Loader2 className="h-10 w-10 text-blue-400 animate-spin mb-4" />
            <p className="text-sm font-medium text-muted-foreground">Cargando proyectos y leads...</p>
          </div>
        </div>
      </div>
    );
  }

  // ───── Error ─────
  if (loadError) {
    return (
      <div className="min-h-screen bg-background flex">
        <WorkspaceSidebar
          brand={{ initials: 'NC', name: 'Neggo Constructoras', subtitle: 'Captación Inmobiliaria', icon: Home }}
          navItems={CONST_SECTIONS}
          activeKey={activeSection}
          onNavigate={(key) => setActiveSection(key as ConstTab)}
          footer={{ initials: 'OI', name: 'Operador Inmobiliario', role: 'Gerente de Proyecto' }}
          accent="blue"
          backToHubLabel="Cambiar Entorno"
        />
        <div className="flex-1 min-w-0 overflow-y-auto lg:pl-64">
          <div className="flex flex-col items-center justify-center py-32 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
              <AlertTriangle className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar datos</h3>
            <p className="text-sm text-muted-foreground mb-4 max-w-md">{loadError}</p>
            <Button variant="outline" size="sm" onClick={loadData}>Reintentar</Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex">
      <WorkspaceSidebar
        brand={{ initials: 'NC', name: 'Neggo Constructoras', subtitle: 'Captación Inmobiliaria', icon: Home }}
        navItems={CONST_SECTIONS}
        activeKey={activeSection}
        onNavigate={(key) => setActiveSection(key as ConstTab)}
        footer={{ initials: 'OI', name: 'Operador Inmobiliario', role: 'Gerente de Proyecto' }}
        accent="blue"
        backToHubLabel="Cambiar Entorno"
      />

      <div className="flex-1 min-w-0 overflow-y-auto lg:pl-64">
        <div className="mx-auto max-w-[1440px] space-y-6 p-4 lg:p-6">
          {/* Header */}
          <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm">
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-blue-500/30 to-transparent" />
            <div className="flex items-center gap-4 px-5 py-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 glow-blue">
                <Building2 className="h-5 w-5 text-blue-400" />
              </div>
              <div>
                <h2 className="text-sm font-semibold text-foreground">Centro de Captación Inmobiliaria</h2>
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span className="relative flex h-2 w-2">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-blue-400 opacity-75" />
                    <span className="relative inline-flex h-2 w-2 rounded-full bg-blue-400" />
                  </span>
                  Operativo — {totals.proyectos} proyectos activos
                </div>
              </div>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {[
              { label: 'Proyectos Activos', value: totals.proyectos, icon: Building2, color: 'text-blue-400', bg: 'bg-blue-500/10' },
              { label: 'Unidades Totales', value: totals.totalUnits, icon: Home, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
              { label: 'Leads Totales', value: totals.totalLeads, icon: Users, color: 'text-purple-400', bg: 'bg-purple-500/10' },
              { label: 'Conversión Prom.', value: `${totals.avgConversion.toFixed(1)}%`, icon: TrendingUp, color: 'text-amber-400', bg: 'bg-amber-500/10' },
              { label: 'Score Promedio', value: totals.avgScore, icon: Award, color: 'text-cyan-400', bg: 'bg-cyan-500/10' },
              { label: 'Interés Hipotecario', value: `${totals.hipotecarioInterest}%`, icon: Target, color: 'text-pink-400', bg: 'bg-pink-500/10' },
            ].map((stat) => (
              <div key={stat.label} className="rounded-xl border border-border/40 bg-card/40 p-4">
                <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg mb-2', stat.bg)}>
                  <stat.icon className={cn('h-4 w-4', stat.color)} />
                </div>
                <div className="text-xl font-bold text-foreground font-mono">{stat.value}</div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Section: Proyectos */}
          {activeSection === 'proyectos' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-400" />
                  Proyectos Activos
                </h3>
                <CrearProyectoDialog />
              </div>
              {proyectos.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-border/40 bg-card/40 animate-fade-in">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-5">
                    <Building2 className="h-8 w-8 text-blue-400" />
                  </div>
                  <h3 className="text-base font-semibold text-foreground mb-2">Aún no hay proyectos registrados</h3>
                  <p className="text-sm text-muted-foreground max-w-md">
                    Crea tu primer proyecto inmobiliario usando el botón "Nuevo Proyecto" para empezar a recibir leads calificados.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {proyectos.map((project) => (
                    <ProjectCard
                      key={project.id}
                      project={project}
                      isActive={activeProject === project.name}
                      onClick={() => setActiveProject(activeProject === project.name ? null : project.name)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: Leads */}
          {(activeSection === 'leads' || activeSection === 'proyectos') && (
            <div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Users className="h-4 w-4 text-primary" />
                  Leads Inmobiliarios
                  {activeProject && (
                    <Badge variant="outline" className="text-xs border-border/40 bg-secondary/40">
                      {activeProject}
                      <button onClick={() => setActiveProject(null)} className="ml-1.5 hover:text-foreground">×</button>
                    </Badge>
                  )}
                </h3>
                <div className="relative max-w-sm">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar leads..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-9 bg-card/60 border-border/40 text-sm"
                  />
                </div>
              </div>

              {filteredLeads.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/40 bg-card/40">
                  <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">
                    {search ? 'No se encontraron leads' : 'Aún no hay leads registrados'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {search ? 'Intenta ajustar tu búsqueda.' : 'Esperando nuevas solicitudes de clientes interesados...'}
                  </p>
                </div>
              ) : (
                <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
                  <div className="overflow-x-auto scrollbar-thin">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b border-border/40 bg-card/60">
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">Capacidad</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Score</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Proyecto de Interés</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden xl:table-cell">Ingresos</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ciudad</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden lg:table-cell">Tipo</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Prioridad</th>
                          <th className="px-3 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                          <th className="px-3 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border/30">
                        {filteredLeads.map((lead) => (
                          <tr key={lead.id} className="group transition-colors hover:bg-card/60 cursor-pointer" onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}>
                            <td className="px-3 py-3">
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-500/10 text-xs font-bold text-blue-400">
                                  {lead.name.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                                </div>
                                <div>
                                  <div className="font-medium text-foreground">{lead.name}</div>
                                  <div className="text-[11px] text-muted-foreground font-mono">{lead.id}</div>
                                </div>
                              </div>
                            </td>
                            <td className="px-3 py-3 hidden md:table-cell">
                              <span className="font-mono text-sm text-foreground">${(lead.capacidadCompra / 1000000).toFixed(1)}M</span>
                            </td>
                            <td className="px-3 py-3"><ScoreBadge score={lead.score} showLabel={false} size="sm" /></td>
                            <td className="px-3 py-3 hidden lg:table-cell">
                              <div className="space-y-0.5">
                                <span className="text-[10px] font-mono text-blue-400">[{lead.proyectoId}]</span>
                                <span className="block text-xs text-foreground/80 leading-tight">{lead.proyecto}</span>
                              </div>
                            </td>
                            <td className="px-3 py-3 hidden xl:table-cell">
                              <span className="font-mono text-xs text-muted-foreground">${(lead.ingresosEstimados / 1000000).toFixed(1)}M</span>
                            </td>
                            <td className="px-3 py-3"><span className="text-xs text-muted-foreground">{lead.city}</span></td>
                            <td className="px-3 py-3 hidden lg:table-cell">
                              <Badge variant="outline" className="text-[10px] border-border/40 bg-secondary/40 capitalize">{lead.tipoVivienda}</Badge>
                            </td>
                            <td className="px-3 py-3"><PriorityBadge priority={lead.priority} /></td>
                            <td className="px-3 py-3"><LeadStatusBadge status={lead.status} /></td>
                            <td className="px-3 py-3">
                              <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                                <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all" title="Llamar" onClick={() => setCallDialogLead(lead)}>
                                  <Phone className="h-3.5 w-3.5" />
                                </button>
                                <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all" title="Mensaje" onClick={() => setMessageDialogLead(lead)}>
                                  <MessageCircle className="h-3.5 w-3.5" />
                                </button>
                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <button className="p-1.5 rounded-md text-muted-foreground hover:text-foreground hover:bg-muted transition-all" title="Más acciones">
                                      <MoreHorizontal className="h-3.5 w-3.5" />
                                    </button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end" className="w-56 border-border/60 bg-card/95 backdrop-blur-xl">
                                    <DropdownMenuLabel className="text-xs font-semibold text-muted-foreground">Cambiar Estado</DropdownMenuLabel>
                                    {(['contactado', 'en-proceso', 'viable'] as LeadStatus[]).map((s) => (
                                      <DropdownMenuItem key={s} className="text-xs cursor-pointer gap-2" onClick={() => handleStatusChange(lead.id, s)}>
                                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
                                        {s === 'contactado' ? 'Contactado' : s === 'en-proceso' ? 'En Cita' : 'Separado ✓'}
                                      </DropdownMenuItem>
                                    ))}
                                    <DropdownMenuSeparator />
                                    <DropdownMenuItem className="text-xs cursor-pointer gap-2" onClick={() => handleStatusChange(lead.id, 'contactado')}>
                                      <UserPlus className="h-3.5 w-3.5 text-blue-400" /> Asignar asesor
                                    </DropdownMenuItem>
                                    <DropdownMenuItem className="text-xs cursor-pointer gap-2" onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}>
                                      <BarChart3 className="h-3.5 w-3.5 text-purple-400" /> Ver capacidad de compra
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                                <button className="ml-1 p-1 rounded hover:bg-muted transition-colors" onClick={() => setExpandedLead(expandedLead === lead.id ? null : lead.id)}>
                                  {expandedLead === lead.id ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {expandedLead && (() => {
                const lead = leadsInmobiliarios.find((l) => l.id === expandedLead);
                if (!lead) return null;
                return (
                  <div className="mt-2 rounded-xl border border-border/40 bg-card/30 p-4">
                    <ExpandedInmobiliario lead={lead} />
                  </div>
                );
              })()}
            </div>
          )}

          {/* Section: Matching placeholder */}
          {activeSection === 'matching' && (
            <div className="rounded-xl border border-border/40 bg-card/50 p-8 text-center">
              <Target className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <h3 className="text-sm font-semibold text-foreground mb-2">Motor de Matching</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">
                El motor de matching entre clientes con capacidad de compra y proyectos inmobiliarios estará disponible en la siguiente fase.
              </p>
            </div>
          )}

          {/* Section: Feedback Clientes */}
          {activeSection === 'feedback' && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-lg font-bold tracking-tight text-foreground">Feedback de Clientes</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">Mensajes de clientes sobre tus proyectos y servicios</p>
                </div>
              </div>
              <CrossSectorFeedbackPanel entityType="constructora" />
            </div>
          )}

          {/* Section: Métricas de Rechazo */}
          {activeSection === 'metricas-rechazo' && (
            <RejectionMetricsPanel entityType="constructoras" organizationId={organizationId} />
          )}
        </div>
      </div>

      {/* ── Call Dialog ── */}
      <Dialog open={callDialogLead !== null} onOpenChange={(open) => { if (!open) setCallDialogLead(null); }}>
        <DialogContent className="max-w-sm border-border/60 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <Phone className="h-5 w-5 text-blue-400" />
              Contacto Telefónico
            </DialogTitle>
            <DialogDescription className="text-sm">Datos de contacto del cliente.</DialogDescription>
          </DialogHeader>
          {callDialogLead && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/40 bg-secondary/30 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-500/10 text-sm font-bold text-blue-400">
                    {callDialogLead.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{callDialogLead.name}</p>
                    <p className="text-[11px] text-muted-foreground font-mono">{callDialogLead.id}</p>
                  </div>
                </div>
              </div>
              <Button className="w-full gap-2 bg-blue-600 hover:bg-blue-500 text-white rounded-xl" onClick={() => setCallDialogLead(null)}>
                <Phone className="h-4 w-4" /> Llamar ahora
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* ── Message Dialog ── */}
      <Dialog open={messageDialogLead !== null} onOpenChange={(open) => { if (!open) setMessageDialogLead(null); }}>
        <DialogContent className="max-w-sm border-border/60 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
              <MessageCircle className="h-5 w-5 text-emerald-400" />
              Seguimiento por Mensaje
            </DialogTitle>
            <DialogDescription className="text-sm">Inicia una conversación con el cliente.</DialogDescription>
          </DialogHeader>
          {messageDialogLead && (
            <div className="space-y-4">
              <div className="rounded-xl border border-border/40 bg-secondary/30 p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-500/10 text-sm font-bold text-emerald-400">
                    {messageDialogLead.name.split(' ').map((n: string) => n[0]).join('').slice(0, 2)}
                  </div>
                  <div>
                    <p className="font-semibold text-foreground">{messageDialogLead.name}</p>
                    <p className="text-[11px] text-muted-foreground">Proyecto: {messageDialogLead.proyecto}</p>
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" className="gap-2 border-border/40 rounded-xl text-xs" onClick={() => setMessageDialogLead(null)}>
                  <MessageCircle className="h-3.5 w-3.5" /> Enviar WhatsApp
                </Button>
                <Button variant="outline" className="gap-2 border-border/40 rounded-xl text-xs" onClick={() => setMessageDialogLead(null)}>
                  Enviar por Email
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function ProjectCard({ project, isActive, onClick }: { project: ProyectoConstructora; isActive: boolean; onClick: () => void }) {
  const statusConfig = {
    activo: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
    vendido: { bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
    pausado: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  };
  const cfg = statusConfig[project.status];

  const citasEstimadas = Math.round(project.leadsGenerated * 0.35);
  const separacionesEstimadas = Math.round((project.conversionRate / 100) * project.leadsGenerated);
  const successFeeRevenue = project.successFeePct > 0
    ? Math.round(project.priceRangeMin * (project.successFeePct / 100))
    : 0;

  const isLanzamiento = project.modoLanzamiento && project.status === 'activo';
  const unidadesRestantes = project.unidadesLanzamiento || 0;
  const totalUnidades = project.units;

  return (
    <div
      onClick={onClick}
      className={cn(
        'group cursor-pointer rounded-xl border p-4 transition-all hover:scale-[1.01] relative overflow-hidden',
        isActive ? 'border-blue-500/40 bg-blue-500/5' : 'border-border/40 bg-card/40 hover:border-border/60 hover:bg-card/60',
        isLanzamiento && 'ring-1 ring-amber-500/20',
      )}
    >
      {isLanzamiento && (
        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-amber-500/[0.03] via-transparent to-transparent pointer-events-none" />
      )}

      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-foreground">{project.name}</h4>
            {isLanzamiento && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 animate-pulse">
                <span className="relative flex h-1.5 w-1.5">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
                  <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-amber-400" />
                </span>
                Modo Lanzamiento
              </span>
            )}
          </div>
          <div className="flex items-center gap-2 mt-1">
            <span className="flex items-center gap-1 text-[11px] text-muted-foreground"><MapPin className="h-3 w-3" /> {project.city}</span>
            <span className={cn('rounded-full border px-2 py-0.5 text-[10px] font-medium', cfg.bg, cfg.text, cfg.border)}>
              {project.status.charAt(0).toUpperCase() + project.status.slice(1)}
            </span>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs font-mono text-muted-foreground">
            ${(project.priceRangeMin / 1000000).toFixed(0)}M - ${(project.priceRangeMax / 1000000).toFixed(0)}M
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mb-3 rounded-lg bg-secondary/20 p-2.5">
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">CPL Devengado</div>
          <div className="text-xs font-mono font-semibold text-emerald-400">${project.cplCosto.toLocaleString('es-CO')} COP</div>
          <div className="text-[9px] text-muted-foreground/60">por Lead IFC verificado</div>
        </div>
        <div className="text-left">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">Success Fee</div>
          <div className="text-xs font-mono font-semibold text-blue-400">{project.successFeePct}%</div>
          <div className="text-[9px] text-muted-foreground/60">~${(successFeeRevenue / 1000000).toFixed(1)}M por unidad</div>
        </div>
      </div>

      <div className="mb-3 space-y-1.5">
        <div className="flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">Embudo de Conversión</span>
          <span className="text-[10px] font-mono font-semibold text-foreground">{project.conversionRate}% cierre</span>
        </div>
        <div className="flex items-center gap-1">
          <div className="flex-1 h-5 rounded-full bg-secondary/40 border border-border/30 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-blue-500/20 rounded-l-full" style={{ width: '100%' }}>
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-blue-400">
                {project.leadsGenerated} Leads
              </div>
            </div>
          </div>
          <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          <div className="flex-1 h-5 rounded-full bg-secondary/40 border border-border/30 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-amber-500/20" style={{ width: '35%' }}>
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-amber-400">{citasEstimadas}</div>
            </div>
          </div>
          <ChevronRight className="h-3 w-3 text-muted-foreground/40 shrink-0" />
          <div className="flex-1 h-5 rounded-full bg-secondary/40 border border-border/30 relative overflow-hidden">
            <div className="absolute inset-y-0 left-0 bg-emerald-500/20 rounded-r-full" style={{ width: `${Math.min(project.conversionRate, 100)}%` }}>
              <div className="absolute inset-0 flex items-center justify-center text-[9px] font-mono font-bold text-emerald-400">{separacionesEstimadas}</div>
            </div>
          </div>
        </div>
      </div>

      {isLanzamiento && (
        <div className="mb-3 rounded-lg border border-amber-500/20 bg-amber-500/5 px-3 py-2 flex items-center justify-between">
          <span className="text-[10px] font-semibold text-amber-400 flex items-center gap-1.5">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-amber-400 opacity-75" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-amber-400" />
            </span>
            Unidades Restantes
          </span>
          <span className="text-sm font-mono font-bold text-amber-400">{unidadesRestantes}/{totalUnidades}</span>
        </div>
      )}

      <div className="grid grid-cols-4 gap-2 mb-3">
        <div className="text-center"><div className="text-sm font-bold text-foreground font-mono">{project.units}</div><div className="text-[10px] text-muted-foreground">Unidades</div></div>
        <div className="text-center"><div className="text-sm font-bold text-foreground font-mono">{project.leadsGenerated}</div><div className="text-[10px] text-muted-foreground">Leads</div></div>
        <div className="text-center"><div className="text-sm font-bold text-foreground font-mono">{project.hipotecarioInterest}%</div><div className="text-[10px] text-muted-foreground">Hipotecario</div></div>
        <div className="text-center"><div className="text-sm font-bold text-foreground font-mono">{project.conversionRate}%</div><div className="text-[10px] text-muted-foreground">Conversión</div></div>
      </div>
      <div className="flex items-center justify-between text-xs">
        <div className="flex items-center gap-1"><Award className="h-3 w-3 text-primary" /><span className="text-muted-foreground">Score promedio:</span><span className="font-mono font-semibold text-foreground">{project.avgScore}</span></div>
        <span className="text-[10px] text-muted-foreground">{project.constructora}</span>
      </div>
    </div>
  );
}

function ExpandedInmobiliario({ lead }: { lead: LeadInmobiliario }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perfil Financiero</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Score Datacrédito</div>
            <ScoreBadge score={lead.score} showLabel={true} size="md" />
          </div>
          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Capacidad de Compra</div>
            <div className="text-sm font-semibold text-foreground font-mono">${(lead.capacidadCompra / 1000000).toFixed(1)}M</div>
          </div>
          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ingresos Estimados</div>
            <div className="text-sm font-semibold text-foreground font-mono">${(lead.ingresosEstimados / 1000000).toFixed(1)}M</div>
          </div>
          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Interés Hipotecario</div>
            <div className={cn('text-sm font-semibold', lead.hipotecarioInterest ? 'text-emerald-400' : 'text-slate-400')}>
              {lead.hipotecarioInterest ? 'Sí — Alto potencial' : 'No confirmado'}
            </div>
          </div>
        </div>
      </div>
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datos del Lead</h4>
        <div className="space-y-2 text-sm">
          <div className="flex justify-between"><span className="text-muted-foreground">Proyecto</span><span className="font-medium">{lead.proyecto}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Ciudad</span><span className="font-medium">{lead.city}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Tipo Vivienda</span><span className="font-medium capitalize">{lead.tipoVivienda}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Asignado a</span><span className="font-medium">{lead.assignedTo}</span></div>
          <div className="flex justify-between"><span className="text-muted-foreground">Creado</span><span className="font-mono text-xs">{new Date(lead.createdAt).toLocaleDateString('es-CO')}</span></div>
        </div>
      </div>
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones Rápidas</h4>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" className="gap-1.5 text-xs bg-blue-600 hover:bg-blue-700"><Phone className="h-3.5 w-3.5" /> Llamar</Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs border-border/40"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs border-border/40"><ArrowRightLeft className="h-3.5 w-3.5" /> Mover Pipeline</Button>
          <Button size="sm" variant="outline" className="gap-1.5 text-xs border-border/40"><DollarSign className="h-3.5 w-3.5" /> Cotizar</Button>
        </div>
      </div>
    </div>
  );
}
