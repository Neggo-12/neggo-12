import { useAdminStore } from '@/features/admin/store/useAdminStore';
import AuthorizationCenter from '@/features/admin/components/AuthorizationCenter';
import AlgorithmMonitor from '@/features/admin/components/AlgorithmMonitor';
import KPICard from '@/components/KPICard';
import SeguridadTab from '@/features/shared/components/SeguridadTab';
import SaludSistemaPanel from '@/features/admin/components/SaludSistemaPanel';
import { MFA_ENFORCEMENT_ENABLED } from '@/core/config/mfaConfig';
import { cn, formatCOP } from '@/lib/utils';
import {
  LayoutDashboard,
  ShieldCheck,
  Building2,
  Home,
  ShoppingBag,
  BarChart3,
  Users,
  Landmark,
  Store,
  TrendingUp,
  Radio,
  Receipt,
  Percent,
  DollarSign,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  ChevronRight,
  ChevronDown,
  Search,
  ClipboardCheck,
  Loader2,
  Plus,
  Bell,
  Lock,
  HeartPulse,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { Fragment, useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { toast } from 'sonner';
import { isDbConfigured } from '@/core/db/dbClient';
import type { OnboardingRequest, EcosistemaMetrics, ComercioAdmin } from '@/types';
import {
  fetchTarifasBancos, updateTarifaBanco, fetchPlanesComercio, updatePlanComercio,
  fetchOrganizationIdsByUserIds, fetchOrganizationsByIds, updateOrganizationPlanNegociacion,
  fetchFacturasResumenPorNegocio, fetchFacturasTotalesGlobales, fetchFacturasLedgerByOrganization,
  fetchBancosAprobados, fetchTarifasBancoOrganizacion, upsertTarifaBancoOrganizacion,
  fetchTodasLasFacturasMensuales, confirmarPagoFactura,
  fetchTodosLosNegociosCurados, insertNegocioCurado, toggleNegocioCuradoActivo,
  fetchTodasLasSenalesInteres,
  type TarifaBancoRow, type PlanComercioRow, type FacturaResumenNegocio, type FacturaLedgerRow,
  type TarifaBancoTipo, type FacturaMensualAdminRow,
  type NegocioCuradoAdminRow, type SenalInteresDisplay,
} from '@/core/db/repositories';

// ───── Sidebar sections ─────

const adminSections = [
  { key: 'resumen' as const, label: 'Resumen Global', icon: LayoutDashboard },
  { key: 'autorizaciones' as const, label: 'Autorizaciones', icon: ShieldCheck },
  { key: 'bancos' as const, label: 'Bancos', icon: Building2 },
  { key: 'constructoras' as const, label: 'Constructoras', icon: Home },
  { key: 'comercios' as const, label: 'Comercios', icon: ShoppingBag },
  { key: 'analitica' as const, label: 'Analítica IFC', icon: BarChart3 },
  { key: 'facturacion' as const, label: 'Facturación Ecosistema', icon: Receipt },
  { key: 'tarifas' as const, label: 'Tarifas y Planes', icon: SlidersHorizontal },
  { key: 'conciliacion' as const, label: 'Conciliación de Pagos', icon: ClipboardCheck },
  { key: 'senales-interes' as const, label: 'Clientes en Espera', icon: Bell },
  { key: 'salud-sistema' as const, label: 'Salud del Sistema', icon: HeartPulse },
  ...(MFA_ENFORCEMENT_ENABLED ? [{ key: 'seguridad' as const, label: 'Seguridad', icon: Lock }] : []),
];

// ───── Main component ─────

export default function AdminDashboard() {
  const {
    activeSection,
    setActiveSection,
    ecosistemaMetrics,
    onboardingRequests,
    isOnboardingLoading,
    refreshOnboarding,
  } = useAdminStore();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);

  // Re-fetch en cada montaje para ver los nuevos registros en tiempo real
  useEffect(() => {
    void refreshOnboarding();
  }, [refreshOnboarding]);

  const handleLogout = async () => {
    await useAuthStore.getState().logout();
    navigate('/login-ecosistema', { replace: true });
  };

  const pendingAuths = onboardingRequests.filter(
    (r: OnboardingRequest) => r.status === 'pendiente' || r.status === 'en-revision'
  ).length;

  const bancosAutorizados = onboardingRequests.filter(
    (r: OnboardingRequest) => r.entityType === 'banco' && r.status === 'autorizado'
  ).length;

  const constructorasActivas = onboardingRequests.filter(
    (r: OnboardingRequest) => r.entityType === 'constructora' && r.status !== 'rechazado'
  ).length;

  const comerciosConSello = onboardingRequests.filter(
    (r: OnboardingRequest) => r.entityType === 'comercio' && r.status === 'autorizado'
  ).length;

  return (
    <div className="min-h-screen bg-background flex">
      {/* Mobile overlay — dims the content and closes the menu on click outside */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* ─── Internal Admin Sidebar ─── */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border/40 bg-card/50 shrink-0 transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 h-16 border-b border-border/40 px-5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
            <ShieldCheck className="h-4 w-4 text-red-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground">Admin Neggo</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">Centro de Control Maestro</p>
          </div>
        </div>

        {/* Cerrar sesión */}
        <button
          onClick={handleLogout}
          className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-border/40 bg-card/40 px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-border/60 hover:bg-card hover:text-foreground"
        >
          <LogOut className="h-3.5 w-3.5" />
          Cerrar sesión
        </button>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 p-3">
          {adminSections.map((section) => {
            const isActive = activeSection === section.key;
            const Icon = section.icon;
            let badge: number | null = null;
            if (section.key === 'autorizaciones') badge = pendingAuths;

            return (
              <button
                key={section.key}
                onClick={() => {
                  setActiveSection(section.key);
                  setMobileOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left',
                  isActive
                    ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                    : 'text-muted-foreground hover:bg-card hover:text-foreground border border-transparent'
                )}
              >
                <Icon className={cn('h-4 w-4', isActive ? 'text-red-400' : 'text-muted-foreground')} />
                {section.label}
                {badge !== null && badge > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500/20 px-1.5 text-[10px] font-bold text-red-400 border border-red-500/30">
                    {badge}
                  </span>
                )}
                {isActive && badge === null && (
                  <div className="ml-auto h-1.5 w-1.5 rounded-full bg-red-400 animate-pulse" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer identity */}
        <div className="border-t border-border/40 p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-red-500/10 text-xs font-bold text-red-400 border border-red-500/20">
              SA
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">Super Admin</p>
              <p className="text-[10px] text-muted-foreground">Máximo Privilegio</p>
            </div>
          </div>
        </div>
      </aside>

      {/* Mobile header */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-30 border-b border-border/40 bg-card/95 backdrop-blur-xl px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setMobileOpen((prev) => !prev)}
            className="flex h-7 w-7 items-center justify-center rounded-lg border border-border/40 text-muted-foreground hover:text-foreground"
            aria-label={mobileOpen ? 'Cerrar menú' : 'Abrir menú'}
          >
            {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </button>
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
            <ShieldCheck className="h-3.5 w-3.5 text-red-400" />
          </div>
          <span className="text-sm font-bold text-foreground">Admin Neggo</span>
        </div>
        <button onClick={handleLogout} className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <LogOut className="h-3 w-3" />
          Salir
        </button>
      </div>

      {/* ─── Main content ─── */}
      <div className="flex-1 min-w-0 overflow-y-auto lg:pl-64">
        <div className="pt-16 lg:pt-0 p-4 sm:p-6 lg:p-8 space-y-6 animate-fade-in">
          {/* KPIs — always visible */}
          <KPIBar metrics={ecosistemaMetrics} />

          {/* Render section content */}
          {activeSection === 'resumen' && (
            <ResumenView
              metrics={ecosistemaMetrics}
              pendingAuths={pendingAuths}
              bancosAutorizados={bancosAutorizados}
              constructorasActivas={constructorasActivas}
              comerciosConSello={comerciosConSello}
            />
          )}

          {activeSection === 'autorizaciones' && <AuthorizationCenter />}

          {activeSection === 'bancos' && (
            <EntityView
              title="Bancos Conectados"
              subtitle="Instituciones financieras autorizadas en el ecosistema"
              entities={onboardingRequests.filter((r: OnboardingRequest) => r.entityType === 'banco')}
              icon={Building2}
              statusLabel="Estado de Conexión"
            />
          )}

          {activeSection === 'constructoras' && (
            <div className="space-y-6 animate-fade-in">
              <EntityView
                title="Constructoras Registradas"
                subtitle="Proyectos inmobiliarios con verificación fiduciaria"
                entities={onboardingRequests.filter((r: OnboardingRequest) => r.entityType === 'constructora')}
                icon={Home}
                statusLabel="Estado Fiduciario"
              />
            </div>
          )}

          {activeSection === 'comercios' && <ComerciosAdminPanel />}

          {activeSection === 'facturacion' && <FacturacionLedger />}

          {activeSection === 'tarifas' && <TarifasYPlanes />}

          {activeSection === 'conciliacion' && <ConciliacionPagos />}

          {activeSection === 'senales-interes' && <ClientesEnEsperaPanel />}

          {activeSection === 'analitica' && <AlgorithmMonitor />}

          {activeSection === 'seguridad' && <SeguridadTab />}

          {activeSection === 'salud-sistema' && <SaludSistemaPanel />}
        </div>
      </div>
    </div>
  );
}

// ───── KPI bar ─────

function KPIBar({ metrics }: { metrics: EcosistemaMetrics }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      <KPICard
        title="Clientes Activos"
        value={metrics.clientesActivos.toLocaleString()}
        delta={metrics.deltaClientes}
        icon={Users}
        gradient="cyan"
      />
      <KPICard
        title="Bancos Conectados"
        value={metrics.bancosConectados}
        delta={metrics.deltaBancos}
        icon={Landmark}
        gradient="blue"
      />
      <KPICard
        title="Constructoras"
        value={metrics.constructorasRegistradas}
        delta={metrics.deltaConstructoras}
        icon={Home}
        gradient="amber"
      />
      <KPICard
        title="Comercios con Sello"
        value={metrics.comerciosSuscritos}
        delta={metrics.deltaComercios}
        icon={Store}
        gradient="emerald"
      />
    </div>
  );
}

// ───── Resumen View ─────

function ResumenView({
  metrics,
  pendingAuths,
  bancosAutorizados,
  constructorasActivas,
  comerciosConSello,
}: {
  metrics: EcosistemaMetrics;
  pendingAuths: number;
  bancosAutorizados: number;
  constructorasActivas: number;
  comerciosConSello: number;
}) {
  return (
    <div className="space-y-6 animate-fade-in">
      {/* Ecosystem stat cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <QuickStat label="IFC Generadas" value={metrics.ifcGeneradas.toLocaleString()} icon={BarChart3} color="blue" />
        <QuickStat label="Propuestas Enviadas" value={metrics.propuestasEnviadas.toLocaleString()} icon={TrendingUp} color="emerald" />
        <QuickStat label="Tasa de Match" value={`${metrics.tasaMatch}%`} icon={Radio} color="cyan" />
        <QuickStat label="Autorizaciones Pendientes" value={pendingAuths.toString()} icon={ShieldCheck} color={pendingAuths > 0 ? 'red' : 'green'} />
      </div>

      {/* Ecosystem grid */}
      <div className="grid gap-4 lg:grid-cols-2">
        {/* Left: entity summary */}
        <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Building2 className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Resumen de Entidades</h3>
          </div>
          <div className="space-y-3">
            <EntityBar label="Bancos Autorizados" value={bancosAutorizados} total={6} color="bg-blue-500" />
            <EntityBar label="Constructoras Activas" value={constructorasActivas} total={5} color="bg-amber-500" />
            <EntityBar label="Comercios con Sello" value={comerciosConSello} total={14} color="bg-emerald-500" />
            <EntityBar label="Pendientes de Revisión" value={pendingAuths} total={10} color="bg-red-500" />
          </div>
        </div>

        {/* Right: ecosystem health */}
        <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
          <div className="flex items-center gap-2">
            <Radio className="h-4 w-4 text-green-400" />
            <h3 className="text-sm font-semibold text-foreground">Salud del Ecosistema</h3>
            <div className="ml-auto flex items-center gap-1.5">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-medium text-emerald-400">Operativo</span>
            </div>
          </div>
          <div className="space-y-2 text-xs text-muted-foreground leading-relaxed">
            <p>
              <span className="font-medium text-foreground">API Core:</span>{' '}
              <span className="font-mono text-emerald-400">42ms</span> · Uptime{' '}
              <span className="font-mono text-emerald-400">99.97%</span>
            </p>
            <p>
              <span className="font-medium text-foreground">Datacrédito:</span>{' '}
              <span className="font-mono text-emerald-400">128ms</span> · Uptime{' '}
              <span className="font-mono text-emerald-400">99.91%</span>
            </p>
            <p>
              <span className="font-medium text-foreground">Motor IFC:</span>{' '}
              <span className="font-mono text-emerald-400">18ms</span> · Uptime{' '}
              <span className="font-mono text-emerald-400">99.99%</span>
            </p>
            <p>
              <span className="font-medium text-foreground">Notificaciones:</span>{' '}
              <span className="font-mono text-amber-400">340ms</span> · Uptime{' '}
              <span className="font-mono text-amber-400">98.45%</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ───── Quick stat card ─────

function QuickStat({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: typeof BarChart3;
  color: 'blue' | 'emerald' | 'cyan' | 'red' | 'green';
}) {
  const colorMap = {
    blue: 'border-blue-500/20 bg-blue-500/5',
    emerald: 'border-emerald-500/20 bg-emerald-500/5',
    cyan: 'border-cyan-500/20 bg-cyan-500/5',
    red: 'border-red-500/20 bg-red-500/5',
    green: 'border-emerald-500/20 bg-emerald-500/5',
  };
  const iconMap = {
    blue: 'text-blue-400 bg-blue-500/10',
    emerald: 'text-emerald-400 bg-emerald-500/10',
    cyan: 'text-cyan-400 bg-cyan-500/10',
    red: 'text-red-400 bg-red-500/10',
    green: 'text-emerald-400 bg-emerald-500/10',
  };

  return (
    <div className={cn('rounded-xl border p-4', colorMap[color])}>
      <div className="flex items-center justify-between">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{label}</p>
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg', iconMap[color])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      <p className="mt-2 text-2xl font-bold font-mono text-foreground">{value}</p>
    </div>
  );
}

// ───── Entity bar ─────

function EntityBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-mono font-semibold text-foreground">
          {value}/{total}
        </span>
      </div>
      <div className="h-1.5 rounded-full bg-muted overflow-hidden">
        <div className={cn('h-full rounded-full transition-all', color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ───── Generic entity view ─────

function EntityView({
  title,
  subtitle,
  entities,
  icon: Icon,
  statusLabel,
}: {
  title: string;
  subtitle: string;
  entities: OnboardingRequest[];
  icon: typeof Building2;
  statusLabel: string;
}) {
  const { authorizeEntity, rejectEntity } = useAdminStore();
  const [expandedId, setExpandedId] = useState<string | null>(null);

  return (
    <div className="space-y-4 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">{subtitle}</p>
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {entities.map((e) => {
          const isExpanded = expandedId === e.id;
          return (
            <div key={e.id}>
              <button
                onClick={() => setExpandedId(isExpanded ? null : e.id)}
                className={cn(
                  'w-full rounded-xl border bg-card/50 p-4 hover:border-border/60 transition-all text-left',
                  isExpanded ? 'border-border/60 ring-1 ring-border/40' : 'border-border/40',
                )}
              >
                <div className="flex items-center gap-3 mb-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card border border-border/40">
                    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{e.name}</p>
                    <p className="text-[11px] text-muted-foreground truncate">{e.city}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-[10px] text-muted-foreground">{statusLabel}</span>
                  <span
                    className={cn(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                      e.status === 'autorizado'
                        ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20'
                        : e.status === 'rechazado'
                        ? 'text-red-400 bg-red-500/10 border-red-500/20'
                        : 'text-amber-400 bg-amber-500/10 border-amber-500/20'
                    )}
                  >
                    {e.status === 'autorizado' ? 'Autorizado' : e.status === 'rechazado' ? 'Rechazado' : e.status === 'en-revision' ? 'En Revisión' : 'Pendiente'}
                  </span>
                </div>
                <p className="text-[10px] text-muted-foreground mt-2 truncate">{e.detail}</p>
              </button>

              {/* Contact detail card + validation actions */}
              {isExpanded && e.contacto && (
                <div className="mt-2 rounded-xl border border-border/40 bg-card/60 p-4 animate-slide-up">
                  <div className="flex items-center gap-2 mb-3">
                    <Users className="h-3.5 w-3.5 text-cyan-400" />
                    <h4 className="text-xs font-semibold text-foreground">Ficha de Contacto Institucional</h4>
                  </div>
                  <div className="space-y-2.5 text-xs">
                    <div className="flex justify-between"><span className="text-muted-foreground">Representante</span><span className="font-medium text-foreground">{e.contacto.nombre}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Cargo</span><span className="text-foreground">{e.contacto.cargo}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Correo</span><span className="font-mono text-blue-400">{e.contacto.correo}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Teléfono</span><span className="font-mono text-blue-400">{e.contacto.telefono}</span></div>
                    <div className="flex justify-between"><span className="text-muted-foreground">Documentos</span>
                      <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border', e.contacto.estadoDocumentos === 'verificado' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20')}>
                        {e.contacto.estadoDocumentos === 'verificado' ? 'Verificado' : 'Pendiente'}
                      </span>
                    </div>
                  </div>
                  {e.status !== 'autorizado' && e.status !== 'rechazado' && (
                    <div className="flex gap-2 mt-4 pt-3 border-t border-border/30">
                      <Button size="sm" onClick={(ev) => { ev.stopPropagation(); authorizeEntity(e.id); toast.success(`${e.name} autorizado`, { description: 'La entidad ya puede operar en el ecosistema.' }); }} className="flex-1 h-8 text-[10px] font-semibold gap-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"><CheckCircle2 className="h-3 w-3" />Autorizar</Button>
                      <Button size="sm" variant="outline" onClick={(ev) => { ev.stopPropagation(); rejectEntity(e.id); toast.error(`${e.name} rechazado`); }} className="flex-1 h-8 text-[10px] font-semibold gap-1 border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-lg"><XCircle className="h-3 w-3" />Rechazar</Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {entities.length === 0 && (
          <div className="col-span-full rounded-xl border border-dashed border-border/40 p-8 text-center">
            <p className="text-sm text-muted-foreground">Sin entidades registradas en esta categoría</p>
          </div>
        )}
      </div>
    </div>
  );
}

// ───── Comercios Admin Panel ─────

function ComerciosAdminPanel() {
  const { onboardingRequests } = useAdminStore();
  const [comercios, setComercios] = useState<ComercioAdmin[]>([]);
  const rawComercios = useMemo(() => onboardingRequests.filter((r) => r.entityType === 'comercio'), [onboardingRequests]);

  useEffect(() => {
    if (rawComercios.length === 0) { setComercios([]); return; }
    fetchOrganizationIdsByUserIds(rawComercios.map((r) => r.id)).then(async ({ data: orgIdMap }) => {
      if (!orgIdMap) return;
      const orgIds = Array.from(orgIdMap.values());
      const { data: orgs } = await fetchOrganizationsByIds(orgIds);
      const orgById = new Map((orgs ?? []).map((o) => [o.id, o]));
      setComercios(rawComercios.map((r) => {
        const organizationId = orgIdMap.get(r.id) ?? '';
        const org = orgById.get(organizationId);
        return {
          id: r.id,
          organizationId,
          nombre: r.name,
          nit: r.nit ?? '',
          ciudad: r.city,
          categoria: 'General' as ComercioAdmin['categoria'],
          plan: 'basico' as const,
          hasTrustSeal: r.status === 'autorizado',
          planNegociacion: (org?.planNegociacion as ComercioAdmin['planNegociacion']) ?? 'balanceado',
          estado: r.status === 'autorizado' ? 'autorizado' as const : r.status === 'rechazado' ? 'rechazado' as const : 'pendiente' as const,
          fechaRegistro: r.submittedAt,
          leadsRecibidos: 0,
          propuestasEnviadas: 0,
        };
      }));
    });
  }, [rawComercios]);

  const handleEmitirSello = useCallback(async (id: string) => {
    const { updateUserStatus } = await import('@/core/db/repositories');
    const { error } = await updateUserStatus(id, 'approved');
    if (error) {
      toast.error('Error al emitir sello', { description: error });
    } else {
      toast.success('Sello de Confianza emitido', { description: 'Comercio autorizado en el ecosistema.' });
    }
  }, []);

  const handleChangePlan = useCallback(async (organizationId: string, plan: string) => {
    const { error } = await updateOrganizationPlanNegociacion(organizationId, plan);
    if (error) {
      toast.error('No se pudo actualizar el plan', { description: error });
      return;
    }
    setComercios((prev) => prev.map((c) => (c.organizationId === organizationId ? { ...c, planNegociacion: plan as ComercioAdmin['planNegociacion'] } : c)));
  }, []);

  const totalComercios = comercios.length;
  const conSello = comercios.filter((c) => c.hasTrustSeal).length;
  const pendientes = comercios.filter((c) => c.estado === 'pendiente' || c.estado === 'en-revision').length;
  const totalLeadsRecibidos = comercios.reduce((s, c) => s + c.leadsRecibidos, 0);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Panel de Control de Comercios</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Administra comercios registrados, ajusta tasas de comisión B2B y emite el Sello de Confianza Neggo
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Comercios registrados', value: totalComercios, icon: Store, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Con Sello de Confianza', value: conSello, icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Pendientes de revisión', value: pendientes, icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Leads distribuidos', value: totalLeadsRecibidos, icon: Users, color: 'text-blue-400', bg: 'bg-blue-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/40 bg-card/50 p-4">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg mb-2', stat.bg)}>
              <stat.icon className={cn('h-4 w-4', stat.color)} />
            </div>
            <div className="text-2xl font-bold text-foreground font-mono">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-card/60">
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comercio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground hidden md:table-cell">NIT</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Categoría</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan de Negociación</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sello</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {comercios.map((c) => (
                <tr key={c.id} className="group transition-colors hover:bg-card/60">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 text-xs font-bold text-emerald-400">
                        {c.nombre.split(' ').map((n) => n[0]).join('').slice(0, 2)}
                      </div>
                      <div>
                        <div className="font-medium text-foreground text-xs">{c.nombre}</div>
                        <div className="text-[10px] text-muted-foreground">{c.ciudad}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 hidden md:table-cell">
                    <span className="font-mono text-xs text-muted-foreground">{c.nit}</span>
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className="text-[10px] border-border/40 bg-secondary/40">{c.categoria}</Badge>
                  </td>
                  <td className="px-4 py-3 text-center">
                    <Select value={c.planNegociacion} onValueChange={(v) => handleChangePlan(c.organizationId, v)}>
                      <SelectTrigger className="h-7 w-36 text-[10px] mx-auto">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="solo_pauta" className="text-xs">Solo Pauta</SelectItem>
                        <SelectItem value="balanceado" className="text-xs">Balanceado</SelectItem>
                        <SelectItem value="solo_resultados" className="text-xs">Solo Resultados</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                  <td className="px-4 py-3 text-center">
                    {c.hasTrustSeal ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-2 py-0.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20">
                        <ShieldCheck className="h-3 w-3" /> Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] font-medium text-muted-foreground border border-border/40">
                        Pendiente
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right">
                    {!c.hasTrustSeal && (
                      <Button size="sm" onClick={() => handleEmitirSello(c.id)} className="h-7 text-[10px] font-semibold gap-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg">
                        <ShieldCheck className="h-3 w-3" /> Emitir Sello
                      </Button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

// ───── Tarifas y Planes (configuración editable de cargos) ─────

interface BancoTarifaEditable {
  clave: string;
  label: string;
  tipoTarifa: TarifaBancoTipo;
  valor: string;
  isOverride: boolean;
}

function AsignarBancoDialog({
  open, onOpenChange, tarifasGlobales,
}: { open: boolean; onOpenChange: (open: boolean) => void; tarifasGlobales: TarifaBancoRow[] }) {
  const [bancos, setBancos] = useState<{ id: string; name: string }[]>([]);
  const [selectedBancoId, setSelectedBancoId] = useState('');
  const [filas, setFilas] = useState<BancoTarifaEditable[]>([]);
  const [dirtyClaves, setDirtyClaves] = useState<Set<string>>(new Set());
  const [isLoadingBanco, setIsLoadingBanco] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    fetchBancosAprobados().then(({ data }) => setBancos(data ?? []));
  }, [open]);

  const handleSelectBanco = useCallback(async (bancoId: string) => {
    setSelectedBancoId(bancoId);
    setDirtyClaves(new Set());
    setIsLoadingBanco(true);
    const { data: overrides } = await fetchTarifasBancoOrganizacion(bancoId);
    const overrideByClave = new Map((overrides ?? []).map((o) => [o.clave, o]));
    setFilas(tarifasGlobales.map((g) => {
      const override = overrideByClave.get(g.clave);
      return {
        clave: g.clave,
        label: g.label,
        tipoTarifa: override?.tipoTarifa ?? g.tipoTarifa,
        valor: String(override?.valor ?? g.valor),
        isOverride: !!override,
      };
    }));
    setIsLoadingBanco(false);
  }, [tarifasGlobales]);

  const handleChangeValor = useCallback((clave: string, valor: string) => {
    setFilas((prev) => prev.map((f) => (f.clave === clave ? { ...f, valor } : f)));
    setDirtyClaves((prev) => new Set(prev).add(clave));
  }, []);

  const handleGuardar = useCallback(async () => {
    if (!selectedBancoId || dirtyClaves.size === 0) { onOpenChange(false); return; }
    const filasDirty = filas.filter((f) => dirtyClaves.has(f.clave));

    const invalida = filasDirty.find((f) => {
      const n = Number(f.valor);
      return isNaN(n) || n <= 0;
    });
    if (invalida) {
      toast.error('Valor inválido', { description: `"${invalida.label}" debe ser un número mayor a 0.` });
      return;
    }

    setIsSaving(true);
    const results = await Promise.all(
      filasDirty.map((f) => upsertTarifaBancoOrganizacion(selectedBancoId, f.clave, f.tipoTarifa, Number(f.valor))),
    );
    const firstError = results.find((r) => r.error)?.error;
    setIsSaving(false);
    if (firstError) {
      toast.error('No se pudo guardar alguna tarifa', { description: firstError });
      return;
    }
    toast.success('Tarifas asignadas', { description: `${filasDirty.length} tarifa(s) actualizadas.` });
    onOpenChange(false);
  }, [selectedBancoId, dirtyClaves, filas, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">Asignar tarifas a un banco</DialogTitle>
          <DialogDescription className="text-xs">
            Sobrescribe la tarifa global para un banco específico. Aplica desde este mes en adelante.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Banco</Label>
          <Select value={selectedBancoId} onValueChange={handleSelectBanco}>
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="Selecciona un banco..." />
            </SelectTrigger>
            <SelectContent>
              {bancos.map((b) => (<SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>))}
            </SelectContent>
          </Select>
        </div>

        {selectedBancoId && (
          isLoadingBanco ? (
            <p className="text-xs text-muted-foreground py-4">Cargando tarifas...</p>
          ) : (
            <div className="rounded-lg border border-border/40 overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y divide-border/30">
                  {filas.map((f) => (
                    <tr key={f.clave}>
                      <td className="px-3 py-2 text-xs text-foreground">
                        {f.label}
                        {f.isOverride && <span className="ml-1.5 text-[9px] text-cyan-400">(personalizada)</span>}
                      </td>
                      <td className="px-3 py-2 text-right">
                        <Input type="number" value={f.valor} onChange={(e) => handleChangeValor(f.clave, e.target.value)} className="w-28 h-7 text-xs text-right font-mono ml-auto" />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )
        )}

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" disabled={!selectedBancoId || isSaving} onClick={handleGuardar} className="bg-emerald-600 hover:bg-emerald-500">
            {isSaving ? 'Guardando...' : 'Guardar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───── Conciliación de Pagos (facturas mensuales — Admin) ─────

type ConciliacionEstadoFilter = 'todas' | 'pendiente_pago' | 'reportado_por_negocio' | 'confirmado_pagado';

const CONCILIACION_ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pendiente_pago: { label: 'Pendiente de pago', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  reportado_por_negocio: { label: 'Reportado', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  confirmado_pagado: { label: 'Pagado', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

function ConciliacionPagos() {
  const [facturas, setFacturas] = useState<FacturaMensualAdminRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [estadoFilter, setEstadoFilter] = useState<ConciliacionEstadoFilter>('todas');
  const [confirmingId, setConfirmingId] = useState<string | null>(null);

  const loadFacturas = useCallback(async () => {
    setIsLoading(true);
    const { data, error } = await fetchTodasLasFacturasMensuales();
    if (error) toast.error('No se pudieron cargar las facturas', { description: error });
    else setFacturas(data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => { loadFacturas(); }, [loadFacturas]);

  const handleConfirmar = useCallback(async (facturaId: string) => {
    setConfirmingId(facturaId);
    const { error } = await confirmarPagoFactura(facturaId);
    if (error) {
      toast.error('No se pudo confirmar el pago', { description: error });
    } else {
      setFacturas((prev) => prev.map((f) => (f.id === facturaId ? { ...f, estado: 'confirmado_pagado', confirmadoAt: new Date().toISOString() } : f)));
      toast.success('Pago confirmado');
    }
    setConfirmingId(null);
  }, []);

  const esperandoConfirmacion = facturas.filter((f) => f.estado === 'reportado_por_negocio');

  const filtradas = facturas.filter((f) => {
    if (estadoFilter !== 'todas' && f.estado !== estadoFilter) return false;
    if (!search) return true;
    const q = search.toLowerCase();
    return f.organizationName.toLowerCase().includes(q) || (f.organizationNit ?? '').toLowerCase().includes(q);
  });

  const renderRow = (f: FacturaMensualAdminRow, showConfirmButton: boolean) => {
    const cfg = CONCILIACION_ESTADO_CONFIG[f.estado];
    return (
      <tr key={f.id} className="border-b border-border/30 last:border-0">
        <td className="px-4 py-2.5 text-xs font-medium text-foreground">{f.organizationName}</td>
        <td className="px-4 py-2.5">
          <Badge variant="outline" className="text-[10px] border-border/40 bg-secondary/40">
            {{ banco: 'Banco', constructora: 'Constructora', comercio: 'Comercio' }[f.organizationType]}
          </Badge>
        </td>
        <td className="px-4 py-2.5 text-xs text-muted-foreground font-mono">{f.organizationNit ?? '—'}</td>
        <td className="px-4 py-2.5 text-xs text-muted-foreground">{f.periodo}</td>
        <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-foreground">{formatCOP(f.montoTotal)}</td>
        <td className="px-4 py-2.5 text-xs text-muted-foreground">{new Date(f.fechaLimitePago).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</td>
        <td className="px-4 py-2.5 text-center">
          <span className={cn('inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium', cfg.bg, cfg.text, cfg.border)}>
            {cfg.label}
          </span>
        </td>
        <td className="px-4 py-2.5 text-right">
          {showConfirmButton && (
            <Button
              size="sm"
              onClick={() => handleConfirmar(f.id)}
              disabled={confirmingId === f.id}
              className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-500"
            >
              {confirmingId === f.id ? 'Confirmando...' : 'Confirmar Pago Recibido'}
            </Button>
          )}
        </td>
      </tr>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Conciliación de Pagos</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Facturas mensuales reportadas como pagadas por los negocios, pendientes de tu confirmación</p>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16"><Loader2 className="h-8 w-8 text-muted-foreground animate-spin" /></div>
      ) : (
        <>
          {esperandoConfirmacion.length > 0 && (
            <div className="rounded-xl border border-blue-500/30 bg-blue-500/5 overflow-hidden">
              <div className="px-4 py-3 border-b border-blue-500/20 bg-blue-500/10">
                <h3 className="text-sm font-semibold text-blue-400">Esperando tu confirmación ({esperandoConfirmacion.length})</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-border/40">
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Negocio</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sector</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">NIT</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Período</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monto</th>
                    <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vence</th>
                    <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                    <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acción</th>
                  </tr>
                </thead>
                <tbody>{esperandoConfirmacion.map((f) => renderRow(f, true))}</tbody>
              </table>
            </div>
          )}

          <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 bg-card/60 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
              <h3 className="text-sm font-semibold text-foreground">Todas las facturas</h3>
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Buscar por nombre o NIT..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-8 h-8 text-xs w-full sm:w-56"
                  />
                </div>
                <Select value={estadoFilter} onValueChange={(v) => setEstadoFilter(v as ConciliacionEstadoFilter)}>
                  <SelectTrigger className="h-8 text-xs w-full sm:w-44"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="todas" className="text-xs">Todos los estados</SelectItem>
                    <SelectItem value="pendiente_pago" className="text-xs">Pendiente de pago</SelectItem>
                    <SelectItem value="reportado_por_negocio" className="text-xs">Reportado</SelectItem>
                    <SelectItem value="confirmado_pagado" className="text-xs">Pagado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {filtradas.length === 0 ? (
              <p className="px-4 py-10 text-center text-xs text-muted-foreground">No hay facturas que coincidan.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border/40">
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Negocio</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sector</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">NIT</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Período</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monto</th>
                      <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Vence</th>
                      <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                      <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acción</th>
                    </tr>
                  </thead>
                  <tbody>{filtradas.map((f) => renderRow(f, false))}</tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

const SECTOR_LABELS: Record<'banco' | 'constructora' | 'comercio', string> = {
  banco: 'Banco',
  constructora: 'Constructora',
  comercio: 'Comercio',
};
const SECTOR_LABELS_PLURAL: Record<'banco' | 'constructora' | 'comercio', string> = {
  banco: 'Bancos',
  constructora: 'Constructoras',
  comercio: 'Comercios',
};
const SECTOR_ORDER: ('banco' | 'constructora' | 'comercio')[] = ['banco', 'constructora', 'comercio'];

function sectorIcon(sector: string) {
  if (sector === 'banco') return <Building2 className="h-3.5 w-3.5 text-blue-400" />;
  if (sector === 'constructora') return <Home className="h-3.5 w-3.5 text-blue-400" />;
  return <Store className="h-3.5 w-3.5 text-blue-400" />;
}

function senalGroupLabel(s: SenalInteresDisplay): string {
  if (s.negocioDeseado) return s.negocioDeseado;
  if (s.sector === 'comercio') {
    const cat = s.categoria ?? 'Sin categoría';
    return s.ciudad ? `${cat} — ${s.ciudad} (sin negocio específico)` : `${cat} (sin negocio específico)`;
  }
  if (s.sector === 'constructora') {
    const tipo = s.tipoVivienda ?? 'Vivienda';
    return s.ciudad ? `${tipo} — ${s.ciudad} (sin negocio específico)` : `${tipo} (sin negocio específico)`;
  }
  return 'Sin negocio específico';
}

function ClientesEnEsperaPanel() {
  const [curados, setCurados] = useState<NegocioCuradoAdminRow[]>([]);
  const [isLoadingCurados, setIsLoadingCurados] = useState(true);
  const [senales, setSenales] = useState<SenalInteresDisplay[]>([]);
  const [isLoadingSenales, setIsLoadingSenales] = useState(true);

  const [formSector, setFormSector] = useState<'banco' | 'constructora' | 'comercio'>('banco');
  const [formNombre, setFormNombre] = useState('');
  const [formCiudad, setFormCiudad] = useState('');
  const [isSubmittingCurado, setIsSubmittingCurado] = useState(false);
  const [togglingId, setTogglingId] = useState<string | null>(null);
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(new Set());

  const loadCurados = useCallback(async () => {
    setIsLoadingCurados(true);
    const { data, error } = await fetchTodosLosNegociosCurados();
    if (error) toast.error('No se pudieron cargar los Negocios de Interés', { description: error });
    else setCurados(data ?? []);
    setIsLoadingCurados(false);
  }, []);

  const loadSenales = useCallback(async () => {
    setIsLoadingSenales(true);
    const { data, error } = await fetchTodasLasSenalesInteres();
    if (error) toast.error('No se pudieron cargar las señales de interés', { description: error });
    else setSenales(data ?? []);
    setIsLoadingSenales(false);
  }, []);

  useEffect(() => {
    loadCurados();
    loadSenales();
  }, [loadCurados, loadSenales]);

  const ciudadRequerida = formSector !== 'banco';
  const canSubmitCurado =
    formNombre.trim() !== '' && (!ciudadRequerida || formCiudad.trim() !== '') && !isSubmittingCurado;

  const handleAddCurado = useCallback(async () => {
    if (!canSubmitCurado) return;
    setIsSubmittingCurado(true);
    const { error } = await insertNegocioCurado({
      sector: formSector,
      nombre: formNombre.trim(),
      ciudad: formCiudad.trim() || undefined,
    });
    if (error) {
      toast.error('No se pudo agregar el negocio', { description: error });
      setIsSubmittingCurado(false);
      return;
    }
    toast.success('Negocio de Interés agregado');
    setFormNombre('');
    setFormCiudad('');
    setIsSubmittingCurado(false);
    loadCurados();
  }, [canSubmitCurado, formSector, formNombre, formCiudad, loadCurados]);

  const handleToggle = useCallback(async (id: string, nextActivo: boolean) => {
    setTogglingId(id);
    setCurados((prev) => prev.map((c) => (c.id === id ? { ...c, activo: nextActivo } : c)));
    const { error } = await toggleNegocioCuradoActivo(id, nextActivo);
    if (error) {
      setCurados((prev) => prev.map((c) => (c.id === id ? { ...c, activo: !nextActivo } : c)));
      toast.error('No se pudo actualizar el negocio', { description: error });
    }
    setTogglingId(null);
  }, []);

  const toggleGroup = useCallback((key: string) => {
    setExpandedGroups((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }, []);

  const senalesAgrupadas = useMemo(() => {
    const bySector = new Map<string, Map<string, SenalInteresDisplay[]>>();
    for (const s of senales) {
      if (!bySector.has(s.sector)) bySector.set(s.sector, new Map());
      const porGrupo = bySector.get(s.sector)!;
      const label = senalGroupLabel(s);
      if (!porGrupo.has(label)) porGrupo.set(label, []);
      porGrupo.get(label)!.push(s);
    }
    return SECTOR_ORDER.filter((sector) => bySector.has(sector)).map((sector) => ({
      sector,
      items: Array.from(bySector.get(sector)!.entries())
        .map(([negocio, clientes]) => ({ negocio, clientes, count: clientes.length }))
        .sort((a, b) => b.count - a.count),
    }));
  }, [senales]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Clientes en Espera</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Negocios no registrados que los clientes están pidiendo, y la lista de Negocios de Interés que se les ofrece.
        </p>
      </div>

      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 bg-card/60">
          <h3 className="text-sm font-semibold text-foreground">Negocios de Interés</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Negocios grandes conocidos que aún no se han unido — se ofrecen como alternativa cuando no hay match real.
          </p>
        </div>

        <div className="p-4 border-b border-border/40 flex flex-col sm:flex-row gap-3 sm:items-end">
          <div className="flex-1 min-w-[140px] space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Sector</Label>
            <Select
              value={formSector}
              onValueChange={(v) => {
                setFormSector(v as typeof formSector);
                setFormCiudad('');
              }}
            >
              <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="banco" className="text-xs">Banco</SelectItem>
                <SelectItem value="constructora" className="text-xs">Constructora</SelectItem>
                <SelectItem value="comercio" className="text-xs">Comercio</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="flex-1 min-w-[160px] space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">Nombre</Label>
            <Input
              placeholder="Nombre del negocio"
              value={formNombre}
              onChange={(e) => setFormNombre(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <div className="flex-1 min-w-[160px] space-y-1">
            <Label className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Ciudad {ciudadRequerida ? '' : '(opcional)'}
            </Label>
            <Input
              placeholder={ciudadRequerida ? 'Obligatoria para este sector' : 'Nacional si se deja vacío'}
              value={formCiudad}
              onChange={(e) => setFormCiudad(e.target.value)}
              className="h-9 text-xs"
            />
          </div>
          <Button
            onClick={handleAddCurado}
            disabled={!canSubmitCurado}
            className="h-9 text-xs gap-1.5 bg-blue-600 hover:bg-blue-500 shrink-0"
          >
            {isSubmittingCurado ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />}
            Agregar
          </Button>
        </div>

        {isLoadingCurados ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 text-muted-foreground animate-spin" /></div>
        ) : curados.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">No hay Negocios de Interés todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40">
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sector</th>
                  <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ciudad</th>
                  <th className="px-4 py-2 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Activo</th>
                </tr>
              </thead>
              <tbody>
                {curados.map((c) => (
                  <tr key={c.id} className="border-b border-border/30 last:border-0">
                    <td className="px-4 py-2.5 text-xs font-medium text-foreground">{c.nombre}</td>
                    <td className="px-4 py-2.5">
                      <Badge variant="outline" className="text-[10px] border-border/40 bg-secondary/40">
                        {SECTOR_LABELS[c.sector]}
                      </Badge>
                    </td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{c.ciudad ?? '—'}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Switch
                        checked={c.activo}
                        disabled={togglingId === c.id}
                        onCheckedChange={(checked) => handleToggle(c.id, checked)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 bg-card/60">
          <h3 className="text-sm font-semibold text-foreground">Señales de interés ({senales.length})</h3>
          <p className="text-[11px] text-muted-foreground mt-0.5">
            Volumen de clientes esperando por cada negocio — úsalo para priorizar a quién reclutar.
          </p>
        </div>

        {isLoadingSenales ? (
          <div className="flex items-center justify-center py-10"><Loader2 className="h-6 w-6 text-muted-foreground animate-spin" /></div>
        ) : senales.length === 0 ? (
          <p className="px-4 py-8 text-center text-xs text-muted-foreground">Aún no hay señales de interés registradas.</p>
        ) : (
          <div className="divide-y divide-border/30">
            {senalesAgrupadas.map(({ sector, items }) => (
              <div key={sector} className="p-4 space-y-2">
                <h4 className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  {sectorIcon(sector)}
                  {SECTOR_LABELS_PLURAL[sector as 'banco' | 'constructora' | 'comercio']}
                </h4>
                <div className="space-y-1.5">
                  {items.map(({ negocio, clientes, count }) => {
                    const key = `${sector}:${negocio}`;
                    const isExpanded = expandedGroups.has(key);
                    return (
                      <div key={key} className="rounded-lg bg-secondary/30 overflow-hidden">
                        <button
                          type="button"
                          onClick={() => toggleGroup(key)}
                          className="w-full flex items-center justify-between gap-3 px-3 py-2 text-left hover:bg-secondary/50 transition-colors"
                        >
                          <span className="text-xs text-foreground">{negocio}</span>
                          <div className="flex items-center gap-2 shrink-0">
                            <Badge className="text-[10px] bg-violet-500/10 text-violet-400 border-violet-500/20">
                              {count} cliente{count > 1 ? 's' : ''}
                            </Badge>
                            {isExpanded ? (
                              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
                            ) : (
                              <ChevronRight className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                          </div>
                        </button>
                        {isExpanded && (
                          <div className="px-3 pb-2 pt-2 space-y-1 border-t border-border/20">
                            {clientes.map((c) => (
                              <div key={c.id} className="flex items-center justify-between text-[11px] text-muted-foreground">
                                <span>{c.clienteNombre}</span>
                                <span className="font-mono">{c.clienteTelefono}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function TarifasYPlanes() {
  const [tarifas, setTarifas] = useState<TarifaBancoRow[]>([]);
  const [planes, setPlanes] = useState<PlanComercioRow[]>([]);
  const [editingTarifa, setEditingTarifa] = useState<string | null>(null);
  const [tarifaValue, setTarifaValue] = useState('');
  const [editingPlan, setEditingPlan] = useState<string | null>(null);
  const [planCpl, setPlanCpl] = useState('');
  const [planComision, setPlanComision] = useState('');
  const [assignBancoOpen, setAssignBancoOpen] = useState(false);

  useEffect(() => {
    fetchTarifasBancos().then(({ data }) => setTarifas(data ?? []));
    fetchPlanesComercio().then(({ data }) => setPlanes(data ?? []));
  }, []);

  const handleSaveTarifa = useCallback(async (clave: string) => {
    const valor = Number(tarifaValue);
    if (isNaN(valor) || valor < 0) return;
    const { error } = await updateTarifaBanco(clave, valor);
    if (error) { toast.error('No se pudo actualizar', { description: error }); return; }
    setTarifas((prev) => prev.map((t) => (t.clave === clave ? { ...t, valor } : t)));
    setEditingTarifa(null);
  }, [tarifaValue]);

  const handleSavePlan = useCallback(async (clave: string) => {
    const cpl = Number(planCpl);
    const comision = Number(planComision);
    if (isNaN(cpl) || isNaN(comision) || cpl < 0 || comision < 0) return;
    const { error } = await updatePlanComercio(clave, cpl, comision);
    if (error) { toast.error('No se pudo actualizar', { description: error }); return; }
    setPlanes((prev) => prev.map((p) => (p.clave === clave ? { ...p, cpl, comisionPct: comision } : p)));
    setEditingPlan(null);
  }, [planCpl, planComision]);

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Tarifas y Planes</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Configuración editable de los cargos automáticos del ecosistema</p>
      </div>

      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 bg-card/60 flex items-center justify-between">
          <h3 className="text-sm font-semibold text-foreground">Tarifas de Bancos (Success Fee al desembolso)</h3>
          <Button size="sm" variant="outline" onClick={() => setAssignBancoOpen(true)} className="h-7 text-xs gap-1.5">
            <Building2 className="h-3.5 w-3.5" /> Asignar Banco
          </Button>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Producto</th>
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Tipo</th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Valor</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {tarifas.map((t) => (
              <tr key={t.clave}>
                <td className="px-4 py-2.5 text-xs font-medium text-foreground">{t.label}</td>
                <td className="px-4 py-2.5 text-xs text-muted-foreground">{t.tipoTarifa === 'por_millon_desembolsado' ? 'Por millón desembolsado' : 'Monto fijo'}</td>
                <td className="px-4 py-2.5 text-right">
                  {editingTarifa === t.clave ? (
                    <div className="flex items-center gap-1 justify-end">
                      <Input type="number" value={tarifaValue} onChange={(e) => setTarifaValue(e.target.value)} className="w-28 h-7 text-xs text-right font-mono" autoFocus
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSaveTarifa(t.clave); if (e.key === 'Escape') setEditingTarifa(null); }} />
                      <button onClick={() => handleSaveTarifa(t.clave)} className="text-emerald-400 hover:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingTarifa(t.clave); setTarifaValue(String(t.valor)); }} className="font-mono text-xs text-cyan-400 hover:text-cyan-300">
                      {formatCOP(t.valor)}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 bg-card/60">
          <h3 className="text-sm font-semibold text-foreground">Planes de Negociación — Comercios</h3>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border/40">
              <th className="px-4 py-2 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Plan</th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">CPL</th>
              <th className="px-4 py-2 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comisión</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30">
            {planes.map((p) => (
              <tr key={p.clave}>
                <td className="px-4 py-2.5 text-xs font-medium text-foreground">{p.label}</td>
                <td className="px-4 py-2.5 text-right">
                  {editingPlan === p.clave ? (
                    <Input type="number" value={planCpl} onChange={(e) => setPlanCpl(e.target.value)} className="w-24 h-7 text-xs text-right font-mono" />
                  ) : (
                    <span className="font-mono text-xs text-foreground">{formatCOP(p.cpl)}</span>
                  )}
                </td>
                <td className="px-4 py-2.5 text-right">
                  {editingPlan === p.clave ? (
                    <div className="flex items-center gap-1 justify-end">
                      <Input type="number" value={planComision} onChange={(e) => setPlanComision(e.target.value)} className="w-16 h-7 text-xs text-right font-mono" />
                      <span className="text-[10px] text-muted-foreground">%</span>
                      <button onClick={() => handleSavePlan(p.clave)} className="text-emerald-400 hover:text-emerald-300"><CheckCircle2 className="h-3.5 w-3.5" /></button>
                    </div>
                  ) : (
                    <button onClick={() => { setEditingPlan(p.clave); setPlanCpl(String(p.cpl)); setPlanComision(String(p.comisionPct)); }} className="font-mono text-xs text-cyan-400 hover:text-cyan-300">
                      {p.comisionPct}%
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AsignarBancoDialog open={assignBancoOpen} onOpenChange={setAssignBancoOpen} tarifasGlobales={tarifas} />
    </div>
  );
}

// ───── Facturación / Ledger de Cobros ─────

const FACTURAS_PAGE_SIZE = 25;

function EstadoPagoBadge({ estado }: { estado: string }) {
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border',
      estado === 'Facturado' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : estado === 'Pagado' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20')}>
      {estado}
    </span>
  );
}

function FacturacionLedger() {
  const [resumenes, setResumenes] = useState<FacturaResumenNegocio[]>([]);
  const [totales, setTotales] = useState({ totalCpl: 0, totalSuccessFee: 0, totalFacturado: 0, totalPendiente: 0 });
  const [search, setSearch] = useState('');
  const [orderBy, setOrderBy] = useState<'organization_name' | 'total_pendiente'>('organization_name');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [expandedOrgId, setExpandedOrgId] = useState<string | null>(null);
  const [detalleCache, setDetalleCache] = useState<Map<string, FacturaLedgerRow[]>>(new Map());
  const [loadingDetalleId, setLoadingDetalleId] = useState<string | null>(null);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    fetchFacturasTotalesGlobales().then(({ data }) => {
      if (data) setTotales(data);
    });
  }, []);

  const loadPage = useCallback(async (reset: boolean, searchValue: string, orderByValue: typeof orderBy) => {
    const nextOffset = reset ? 0 : offset;
    if (reset) { setIsLoading(true); } else { setIsLoadingMore(true); }
    const { data, error } = await fetchFacturasResumenPorNegocio({
      search: searchValue || undefined,
      orderBy: orderByValue,
      offset: nextOffset,
      limit: FACTURAS_PAGE_SIZE,
    });
    if (error) {
      toast.error('No se pudo cargar la facturación', { description: error });
    } else {
      const page = data ?? [];
      setResumenes((prev) => (reset ? page : [...prev, ...page]));
      setOffset(nextOffset + page.length);
      setHasMore(page.length === FACTURAS_PAGE_SIZE);
    }
    setIsLoading(false);
    setIsLoadingMore(false);
  }, [offset]);

  // Carga inicial
  useEffect(() => {
    loadPage(true, '', 'organization_name');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Búsqueda con debounce — resetea la página cada vez que cambia
  useEffect(() => {
    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      loadPage(true, search, orderBy);
    }, 300);
    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search]);

  const handleTogglePendienteSort = useCallback(() => {
    const next = orderBy === 'total_pendiente' ? 'organization_name' : 'total_pendiente';
    setOrderBy(next);
    loadPage(true, search, next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderBy, search]);

  const handleExpand = useCallback(async (organizationId: string) => {
    if (expandedOrgId === organizationId) {
      setExpandedOrgId(null);
      return;
    }
    setExpandedOrgId(organizationId);
    if (detalleCache.has(organizationId)) return;
    setLoadingDetalleId(organizationId);
    const { data, error } = await fetchFacturasLedgerByOrganization(organizationId);
    if (error) {
      toast.error('No se pudo cargar el detalle', { description: error });
    } else {
      setDetalleCache((prev) => new Map(prev).set(organizationId, data ?? []));
    }
    setLoadingDetalleId(null);
  }, [expandedOrgId, detalleCache]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Facturación del Ecosistema</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Cuenta de cobro automatizada: CPL por leads entregados + Success Fee por ventas consolidadas
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: 'Total CPL acumulado', value: formatCOP(totales.totalCpl), icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10', onClick: undefined },
          { label: 'Total Success Fee', value: formatCOP(totales.totalSuccessFee), icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10', onClick: undefined },
          { label: 'Facturado', value: formatCOP(totales.totalFacturado), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10', onClick: undefined },
          { label: 'Pendiente conciliación', value: formatCOP(totales.totalPendiente), icon: Receipt, color: 'text-amber-400', bg: 'bg-amber-500/10', onClick: handleTogglePendienteSort },
        ].map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={stat.onClick}
            className={cn(
              'text-left rounded-xl border p-4 transition-colors',
              stat.onClick ? 'cursor-pointer hover:border-border/70' : 'cursor-default',
              orderBy === 'total_pendiente' && stat.label === 'Pendiente conciliación'
                ? 'border-amber-500/50 bg-amber-500/10'
                : 'border-border/40 bg-card/50',
            )}
          >
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg mb-2', stat.bg)}>
              <stat.icon className={cn('h-4 w-4', stat.color)} />
            </div>
            <div className="text-2xl font-bold text-foreground font-mono">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
              {stat.label}{stat.onClick && (orderBy === 'total_pendiente' ? ' · ordenado ✓' : ' · clic para ordenar')}
            </div>
          </button>
        ))}
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por nombre de negocio..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card/60 border-border/40 text-sm"
        />
      </div>

      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/40 bg-card/60">
                <th className="w-8 px-2 py-3"></th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Negocio</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Sector</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground"># Cargos</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pendiente</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Facturado</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pagado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {isLoading ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">Cargando...</td></tr>
              ) : resumenes.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-10 text-center text-xs text-muted-foreground">
                  {search ? 'No se encontraron negocios con ese nombre.' : 'Todavía no hay cargos registrados.'}
                </td></tr>
              ) : (
                resumenes.map((r) => {
                  const isExpanded = expandedOrgId === r.organizationId;
                  const detalle = detalleCache.get(r.organizationId);
                  return (
                    <Fragment key={r.organizationId}>
                      <tr className="group transition-colors hover:bg-card/60 cursor-pointer" onClick={() => handleExpand(r.organizationId)}>
                        <td className="px-2 py-3">
                          <span className="text-muted-foreground">
                            {isExpanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </span>
                        </td>
                        <td className="px-4 py-3"><span className="text-xs font-medium text-foreground">{r.organizationName}</span></td>
                        <td className="px-4 py-3">
                          <Badge variant="outline" className="text-[10px] border-border/40 bg-secondary/40">
                            {{ banco: 'Banco', constructora: 'Constructora', comercio: 'Comercio' }[r.organizationType]}
                          </Badge>
                        </td>
                        <td className="px-4 py-3 text-center"><span className="font-mono text-xs text-muted-foreground">{r.cantidadCargos}</span></td>
                        <td className="px-4 py-3 text-right"><span className="font-mono text-xs font-semibold text-amber-400">{formatCOP(r.totalPendiente)}</span></td>
                        <td className="px-4 py-3 text-right"><span className="font-mono text-xs text-emerald-400">{formatCOP(r.totalFacturado)}</span></td>
                        <td className="px-4 py-3 text-right"><span className="font-mono text-xs text-blue-400">{formatCOP(r.totalPagado)}</span></td>
                      </tr>
                      {isExpanded && (
                        <tr className="bg-card/20">
                          <td colSpan={7} className="border-t border-border/30 p-4">
                            {loadingDetalleId === r.organizationId ? (
                              <p className="text-xs text-muted-foreground">Cargando detalle...</p>
                            ) : !detalle || detalle.length === 0 ? (
                              <p className="text-xs text-muted-foreground">Sin cargos individuales.</p>
                            ) : (
                              <table className="w-full text-xs">
                                <thead>
                                  <tr className="text-left text-muted-foreground">
                                    <th className="pb-2 font-medium">Concepto</th>
                                    <th className="pb-2 font-medium text-right">Monto</th>
                                    <th className="pb-2 font-medium">Fecha</th>
                                    <th className="pb-2 font-medium text-center">Estado</th>
                                  </tr>
                                </thead>
                                <tbody className="divide-y divide-border/20">
                                  {detalle.map((d) => (
                                    <tr key={d.id}>
                                      <td className="py-2">
                                        <Badge variant="outline" className={cn('text-[10px] font-medium', d.concepto === 'CPL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20')}>
                                          {d.concepto}
                                        </Badge>
                                      </td>
                                      <td className="py-2 text-right font-mono text-foreground">{formatCOP(Number(d.monto))}</td>
                                      <td className="py-2 text-muted-foreground">{new Date(d.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                                      <td className="py-2 text-center"><EstadoPagoBadge estado={d.estado_pago} /></td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            )}
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
        {!isLoading && hasMore && (
          <div className="p-3 border-t border-border/30 flex justify-center">
            <Button variant="outline" size="sm" onClick={() => loadPage(false, search, orderBy)} disabled={isLoadingMore}>
              {isLoadingMore ? 'Cargando...' : 'Cargar más'}
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
