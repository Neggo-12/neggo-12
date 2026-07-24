import { useState, useMemo, useCallback, useEffect } from 'react';
import {
  Building2, Users, TrendingUp, MapPin, Home,
  Target, Award, ChevronRight,
  Loader2, AlertTriangle, Inbox,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import CrearProyectoDialog from '@/components/CrearProyectoDialog';
import ConstructoraSolicitudesTab from '@/components/constructora/SolicitudesTab';
import PuntosCanjeadosTab from '@/features/comercios/components/PuntosCanjeadosTab';
import MiFacturacionTab from '@/components/facturacion/MiFacturacionTab';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';
import CrossSectorFeedbackPanel from '@/components/feedback/CrossSectorFeedbackPanel';
import RejectionMetricsPanel from '@/components/rejection/RejectionMetricsPanel';
import SeguridadTab from '@/features/shared/components/SeguridadTab';
import type { SidebarNavItem } from '@/components/WorkspaceSidebar';
import { cn } from '@/lib/utils';
import {
  fetchProyectos,
  fetchMeInteresaLeadsByOrganization,
  type ProyectoRow,
  type MeInteresaLeadDisplay,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrganizationName } from '@/hooks/useOrganizationName';
import type { ProyectoConstructora } from '@/types';
import { MessageSquareText, Receipt, Lock, Gift, BarChart3 } from 'lucide-react';
import { MFA_ENFORCEMENT_ENABLED } from '@/core/config/mfaConfig';

type ConstTab = 'proyectos' | 'leads' | 'solicitudes' | 'matching' | 'puntos-canjeados' | 'mi-facturacion' | 'analitica' | 'feedback' | 'metricas-rechazo' | 'seguridad';

const CONST_SECTIONS: SidebarNavItem[] = [
  { key: 'proyectos', label: 'Proyectos', icon: Building2 },
  { key: 'leads', label: 'Leads Inmobiliarios', icon: Users },
  { key: 'solicitudes', label: 'Solicitudes (Me Interesa)', icon: Inbox },
  { key: 'matching', label: 'Matching', icon: Target },
  { key: 'puntos-canjeados', label: 'Puntos Canjeados', icon: Gift },
  { key: 'mi-facturacion', label: 'Mi Facturación', icon: Receipt },
  { key: 'analitica', label: 'Analítica', icon: TrendingUp },
  { key: 'feedback', label: 'Feedback Clientes', icon: MessageSquareText },
  { key: 'metricas-rechazo', label: 'Metricas Rechazo', icon: BarChart3 },
  ...(MFA_ENFORCEMENT_ENABLED ? [{ key: 'seguridad', label: 'Seguridad', icon: Lock }] : []),
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

export default function ConstructorasDashboard() {
  const [activeSection, setActiveSection] = useState<ConstTab>('proyectos');
  const [activeProject, setActiveProject] = useState<string | null>(null);

  const session = useAuthStore((s) => s.session);
  const getOrganizationId = useAuthStore((s) => s.getOrganizationId);
  const organizationId = getOrganizationId();
  const { name: orgName, status: orgNameStatus } = useOrganizationName();

  // Real data from Supabase
  const [proyectos, setProyectos] = useState<ProyectoConstructora[]>([]);
  const [meInteresaLeads, setMeInteresaLeads] = useState<MeInteresaLeadDisplay[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    if (!isDbConfigured || !session?.userId) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setLoadError(null);
    try {
      const [proyRes, leadRes] = await Promise.all([
        fetchProyectos(session.userId),
        organizationId ? fetchMeInteresaLeadsByOrganization(organizationId) : Promise.resolve({ data: [] as MeInteresaLeadDisplay[], error: null }),
      ]);
      if (proyRes.error) setLoadError(proyRes.error);
      if (leadRes.error && !proyRes.error) setLoadError(leadRes.error);

      setProyectos((proyRes.data ?? []).map(rowToProyecto));
      setMeInteresaLeads(leadRes.data ?? []);
    } catch (err) {
      setLoadError(err instanceof Error ? err.message : 'Error desconocido');
    }
    setIsLoading(false);
  }, [session?.userId, organizationId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const sidebarBrand = useMemo(() => {
    const orgDisplayName =
      orgNameStatus === 'ready' && orgName
        ? orgName
        : orgNameStatus === 'error'
          ? 'Error al cargar organización'
          : 'Cargando organización...';
    return { initials: 'NC', name: orgDisplayName, subtitle: 'Captación Inmobiliaria', icon: Home };
  }, [orgName, orgNameStatus]);

  const totals = useMemo(() => {
    const active = proyectos.filter((p) => p.status === 'activo');
    const leadsConProyecto = meInteresaLeads.filter((l) => l.proyectoId !== null);
    return {
      proyectos: active.length,
      totalUnits: active.reduce((s, p) => s + p.units, 0),
      totalLeads: leadsConProyecto.length,
      avgConversion: 0,
      avgScore: 0,
      hipotecarioInterest: 0,
    };
  }, [proyectos, meInteresaLeads]);

  // ───── DB Not Configured ─────
  if (!isDbConfigured) {
    return (
      <div className="min-h-screen bg-background flex">
        <WorkspaceSidebar
          brand={sidebarBrand}
          navItems={CONST_SECTIONS}
          activeKey={activeSection}
          onNavigate={(key) => setActiveSection(key as ConstTab)}
          footer={{ initials: 'OI', name: 'Operador Inmobiliario', role: 'Gerente de Proyecto' }}
          accent="blue"
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
          brand={sidebarBrand}
          navItems={CONST_SECTIONS}
          activeKey={activeSection}
          onNavigate={(key) => setActiveSection(key as ConstTab)}
          footer={{ initials: 'OI', name: 'Operador Inmobiliario', role: 'Gerente de Proyecto' }}
          accent="blue"
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
          brand={sidebarBrand}
          navItems={CONST_SECTIONS}
          activeKey={activeSection}
          onNavigate={(key) => setActiveSection(key as ConstTab)}
          footer={{ initials: 'OI', name: 'Operador Inmobiliario', role: 'Gerente de Proyecto' }}
          accent="blue"
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
        brand={sidebarBrand}
        navItems={CONST_SECTIONS}
        activeKey={activeSection}
        onNavigate={(key) => setActiveSection(key as ConstTab)}
        footer={{ initials: 'OI', name: 'Operador Inmobiliario', role: 'Gerente de Proyecto' }}
        accent="blue"
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
          {(activeSection === 'proyectos' || activeSection === 'leads') && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
                  <Building2 className="h-4 w-4 text-blue-400" />
                  Proyectos Activos
                </h3>
                <CrearProyectoDialog onProjectCreated={loadData} />
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
                      isActive={activeProject === project.id}
                      onClick={() => setActiveProject(activeProject === project.id ? null : project.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Section: mini-CRM del proyecto seleccionado — reutiliza el mismo componente de "Solicitudes (Me Interesa)" */}
          {(activeSection === 'leads' || activeSection === 'proyectos') && (
            <div>
              {activeProject ? (
                <ConstructoraSolicitudesTab
                  organizationName={orgNameStatus === 'ready' ? orgName : null}
                  organizationId={organizationId}
                  proyectoIdFilter={activeProject}
                  proyectoNombre={proyectos.find((p) => p.id === activeProject)?.name}
                />
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center rounded-xl border border-border/40 bg-card/40">
                  <Users className="h-10 w-10 text-muted-foreground/40 mb-3" />
                  <p className="text-sm font-medium text-foreground mb-1">Selecciona un proyecto para ver sus leads</p>
                  <p className="text-xs text-muted-foreground">
                    Haz clic en una tarjeta de proyecto para ver su mini-CRM: leads, código de verificación y gestión de pipeline.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Section: Solicitudes (Me Interesa) */}
          {activeSection === 'solicitudes' && (
            <ConstructoraSolicitudesTab
              organizationName={orgNameStatus === 'ready' ? orgName : null}
              organizationId={organizationId}
            />
          )}

          {activeSection === 'puntos-canjeados' && (
            <PuntosCanjeadosTab organizationId={organizationId} />
          )}

          {activeSection === 'mi-facturacion' && (
            <MiFacturacionTab organizationId={organizationId} />
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
            orgNameStatus === 'ready' && orgName ? (
              <RejectionMetricsPanel entityType="constructoras" entityName={orgName} />
            ) : orgNameStatus === 'error' ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
                <p className="text-sm text-muted-foreground">No se pudo cargar el nombre de tu organización.</p>
              </div>
            ) : (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
              </div>
            )
          )}

          {activeSection === 'seguridad' && <SeguridadTab />}
        </div>
      </div>
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
        <div className="min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="text-sm font-semibold text-foreground truncate">{project.name}</h4>
            {isLanzamiento && (
              <span className="inline-flex items-center gap-1 rounded-full border border-amber-500/30 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold text-amber-400 animate-pulse shrink-0">
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

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-3">
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

