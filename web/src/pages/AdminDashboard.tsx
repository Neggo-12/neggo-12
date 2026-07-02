import { useAdminStore } from '@/features/admin/store/useAdminStore';
import AuthorizationCenter from '@/features/admin/components/AuthorizationCenter';
import AlgorithmMonitor from '@/features/admin/components/AlgorithmMonitor';
import KPICard from '@/components/KPICard';
import ProfileSwitcher from '@/components/ProfileSwitcher';
import { cn } from '@/lib/utils';
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
  ArrowLeft,
  Receipt,
  Percent,
  DollarSign,
  CheckCircle2,
  XCircle,
  FlaskConical,
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { useState, useCallback, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { isDbConfigured } from '@/core/db/dbClient';
import type { OnboardingRequest, EcosistemaMetrics, ComercioAdmin } from '@/types';

// ───── Sidebar sections ─────

const adminSections = [
  { key: 'resumen' as const, label: 'Resumen Global', icon: LayoutDashboard },
  { key: 'autorizaciones' as const, label: 'Autorizaciones', icon: ShieldCheck },
  { key: 'bancos' as const, label: 'Bancos', icon: Building2 },
  { key: 'constructoras' as const, label: 'Constructoras', icon: Home },
  { key: 'comercios' as const, label: 'Comercios', icon: ShoppingBag },
  { key: 'analitica' as const, label: 'Analítica IFC', icon: BarChart3 },
  { key: 'facturacion' as const, label: 'Facturación Ecosistema', icon: Receipt },
] as const;

// ───── helpers ─────

function formatCOP(value: number): string {
  return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value);
}

// ───── Main component ─────

export default function AdminDashboard() {
  const {
    activeSection,
    setActiveSection,
    ecosistemaMetrics,
    onboardingRequests,
    isOnboardingLoading,
    hydrateOnboarding,
  } = useAdminStore();

  useEffect(() => {
    void hydrateOnboarding();
  }, [hydrateOnboarding]);

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
      {/* ─── Internal Admin Sidebar ─── */}
      <aside className="hidden lg:flex flex-col w-64 border-r border-border/40 bg-card/50 shrink-0">
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

        {/* Back to hub */}
        <Link
          to="/"
          className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-border/40 bg-card/40 px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-border/60 hover:bg-card hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          Cambiar Entorno
        </Link>

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
                onClick={() => setActiveSection(section.key)}
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
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/10 border border-red-500/20">
            <ShieldCheck className="h-3.5 w-3.5 text-red-400" />
          </div>
          <span className="text-sm font-bold text-foreground">Admin Neggo</span>
        </div>
        <Link to="/" className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1">
          <ArrowLeft className="h-3 w-3" />
          Salir
        </Link>
      </div>

      {/* ─── Main content ─── */}
      <div className="flex-1 min-w-0 overflow-y-auto">
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
              {/* Fase 3 placeholder */}
              <div className="rounded-xl border border-border/40 bg-card/50 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-purple-500/10 border border-purple-500/20">
                    <Home className="h-5 w-5 text-purple-400" />
                  </div>
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-foreground">
                      Módulo Fiduciario & Matriz de Átomos
                    </h3>
                    <p className="text-xs text-muted-foreground leading-relaxed">
                      Listo para vinculación de desglose inmobiliario en la <span className="font-semibold text-purple-400">Fase 3</span>.
                      Este módulo permitirá la trazabilidad de cada unidad vendida, la auditoría de fiducia en tiempo real
                      y la matriz de átomos para desagregar proyectos en unidades financiables individuales.
                    </p>
                    <span className="inline-flex items-center gap-1.5 text-[10px] font-semibold text-purple-400 bg-purple-500/10 px-2.5 py-1 rounded-full border border-purple-500/20">
                      <Radio className="h-3 w-3" />
                      Próximamente
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeSection === 'comercios' && <ComerciosAdminPanel />}

          {activeSection === 'facturacion' && <FacturacionLedger />}

          {activeSection === 'analitica' && <AlgorithmMonitor />}

          {/* ─── Módulo de Pruebas y Simulación — Modo Demo ─── */}
          {activeSection === 'resumen' && (
            <section className="mt-10 pt-8 border-t border-border/30">
              <div className="flex items-center gap-2 mb-4">
                <FlaskConical className="h-4 w-4 text-amber-400" />
                <h2 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                  Módulo de Pruebas y Simulación — Modo Demo
                </h2>
                <div className="h-px flex-1 bg-gradient-to-r from-border/50 to-transparent" />
              </div>
              <div className="max-w-md">
                <ProfileSwitcher />
              </div>
            </section>
          )}
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
  const comercios: ComercioAdmin[] = onboardingRequests
    .filter((r) => r.entityType === 'comercio')
    .map((r) => ({
      id: r.id,
      nombre: r.name,
      nit: r.nit ?? '',
      ciudad: r.city,
      categoria: 'General' as ComercioAdmin['categoria'],
      plan: 'basico' as const,
      hasTrustSeal: r.status === 'autorizado',
      tasaComisionB2B: 2.0,
      estado: r.status === 'autorizado' ? 'autorizado' as const : r.status === 'rechazado' ? 'rechazado' as const : 'pendiente' as const,
      fechaRegistro: r.submittedAt,
      leadsRecibidos: 0,
      propuestasEnviadas: 0,
    }));
  const [editingRate, setEditingRate] = useState<string | null>(null);
  const [rateValue, setRateValue] = useState('');

  const handleEmitirSello = useCallback(async (id: string) => {
    const { updateUserStatus } = await import('@/core/db/repositories');
    const { error } = await updateUserStatus(id, 'approved');
    if (error) {
      toast.error('Error al emitir sello', { description: error });
    } else {
      toast.success('Sello de Confianza emitido', { description: 'Comercio autorizado en el ecosistema.' });
    }
  }, []);

  const handleSaveRate = useCallback((id: string) => {
    const rate = Number(rateValue);
    if (isNaN(rate) || rate < 0 || rate > 100) return;
    setEditingRate(null);
    setRateValue('');
    toast.success(`Tasa de comisión actualizada a ${rate}%`, { description: 'El cambio se reflejará en la próxima facturación.' });
  }, [rateValue]);

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
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Comisión B2B</th>
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
                    {editingRate === c.id ? (
                      <div className="flex items-center gap-1 justify-center">
                        <Input
                          type="number"
                          value={rateValue}
                          onChange={(e) => setRateValue(e.target.value)}
                          className="w-16 h-7 text-xs text-center font-mono"
                          autoFocus
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRate(c.id);
                            if (e.key === 'Escape') setEditingRate(null);
                          }}
                        />
                        <span className="text-[10px] text-muted-foreground">%</span>
                        <button onClick={() => handleSaveRate(c.id)} className="text-emerald-400 hover:text-emerald-300">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => { setEditingRate(c.id); setRateValue(String(c.tasaComisionB2B)); }}
                        className="flex items-center gap-1 font-mono text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                      >
                        <Percent className="h-3 w-3" />
                        {c.tasaComisionB2B}%
                      </button>
                    )}
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

// ───── Facturación / Ledger de Cobros ─────

function FacturacionLedger() {
  const { facturas, hydrateFacturas } = useAdminStore();

  // Hidrata el ledger desde la base de datos real al abrir la sección
  useEffect(() => {
    void hydrateFacturas();
  }, [hydrateFacturas]);

  const totalCPL = facturas.filter((f) => f.concepto === 'CPL').reduce((s, f) => s + f.totalAcumulado, 0);
  const totalSuccess = facturas.filter((f) => f.concepto === 'Success Fee').reduce((s, f) => s + f.totalAcumulado, 0);
  const totalFacturado = facturas.filter((f) => f.estado === 'Facturado').reduce((s, f) => s + f.totalAcumulado, 0);
  const totalPendiente = facturas.filter((f) => f.estado === 'Pendiente de conciliación').reduce((s, f) => s + f.totalAcumulado, 0);

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
          { label: 'Total CPL acumulado', value: formatCOP(totalCPL), icon: DollarSign, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Total Success Fee', value: formatCOP(totalSuccess), icon: TrendingUp, color: 'text-purple-400', bg: 'bg-purple-500/10' },
          { label: 'Facturado', value: formatCOP(totalFacturado), icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Pendiente conciliación', value: formatCOP(totalPendiente), icon: Receipt, color: 'text-amber-400', bg: 'bg-amber-500/10' },
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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Constructora</th>
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Concepto</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Monto Unitario</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Cantidad</th>
                <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Total Acumulado</th>
                <th className="px-4 py-3 text-center text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {facturas.map((f) => (
                <tr key={f.id} className="group transition-colors hover:bg-card/60">
                  <td className="px-4 py-3"><span className="text-xs font-medium text-foreground">{f.constructoraName}</span></td>
                  <td className="px-4 py-3">
                    <Badge variant="outline" className={cn('text-[10px] font-medium', f.concepto === 'CPL' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20')}>
                      {f.concepto}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-right"><span className="font-mono text-xs text-foreground">{formatCOP(f.montoUnitario)}</span></td>
                  <td className="px-4 py-3 text-center"><span className="font-mono text-xs text-muted-foreground">{f.cantidad}</span></td>
                  <td className="px-4 py-3 text-right"><span className="font-mono text-xs font-semibold text-foreground">{formatCOP(f.totalAcumulado)}</span></td>
                  <td className="px-4 py-3 text-center">
                    <span className={cn('inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border',
                      f.estado === 'Facturado' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' : f.estado === 'Pagado' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20' : 'text-amber-400 bg-amber-500/10 border-amber-500/20')}>
                      {f.estado}
                    </span>
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
