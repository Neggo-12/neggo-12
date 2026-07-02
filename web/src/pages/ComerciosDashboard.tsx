import { useState, useEffect, useCallback } from 'react';
import { useComercioStore } from '@/features/comercios/store/useComercioStore';
import ComercioOnboarding from '@/features/comercios/components/ComercioOnboarding';
import OportunidadesFeed from '@/features/comercios/components/OportunidadesFeed';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';
import CrossSectorFeedbackPanel from '@/components/feedback/CrossSectorFeedbackPanel';
import RejectionMetricsPanel from '@/components/rejection/RejectionMetricsPanel';
import type { SidebarNavItem } from '@/components/WorkspaceSidebar';
import KPICard from '@/components/KPICard';
import { ShieldCheck, Send, TrendingUp, Zap, Store, Radio, CreditCard, MessageSquareText, TrendingDown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchOfertasComercios, type OfertaComercioRow } from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';
import { useAuthStore } from '@/store/useAuthStore';

type ComercioSection = 'dashboard' | 'oportunidades' | 'suscripcion' | 'feedback' | 'metricas-rechazo';

const COMERCIO_SECTIONS: SidebarNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Store },
  { key: 'oportunidades', label: 'Oportunidades IFC', icon: Radio, badge: 3 },
  { key: 'suscripcion', label: 'Suscripción', icon: CreditCard },
  { key: 'feedback', label: 'Feedback Clientes', icon: MessageSquareText, badge: 5 },
  { key: 'metricas-rechazo', label: 'Metricas Rechazo', icon: TrendingDown },
];

export default function ComerciosDashboard() {
  const {
    isOnboardingComplete,
    hasTrustSeal,
    currentComercio,
    propuestas,
  } = useComercioStore();

  // Resolve org ID from session for multi-tenant isolation
  const getOrganizationId = useAuthStore((s) => s.getOrganizationId);
  const organizationId = getOrganizationId();

  const [ofertasReales, setOfertasReales] = useState<OfertaComercioRow[]>([]);

  const loadOfertas = useCallback(async () => {
    if (!isDbConfigured) return;
    const { data } = await fetchOfertasComercios(organizationId);
    setOfertasReales(data ?? []);
  }, [organizationId]);

  useEffect(() => {
    if (isOnboardingComplete) { void loadOfertas(); }
  }, [isOnboardingComplete, loadOfertas]);

  if (!isOnboardingComplete) {
    return <ComercioOnboarding />;
  }

  const opsRecibidas = ofertasReales.length;
  const propsEnviadas = propuestas.length;
  const tasaConversion =
    opsRecibidas > 0 ? Math.round((propsEnviadas / opsRecibidas) * 100) : 0;

  return (
    <div className="min-h-screen bg-background flex">
      {/* ─── Isolated Comercios Sidebar ─── */}
      <WorkspaceSidebar
        brand={{
          initials: 'NC',
          name: 'Neggo Comercios',
          subtitle: 'Portal Aliado B2B',
          icon: Store,
        }}
        navItems={COMERCIO_SECTIONS}
        activeKey="dashboard"
        onNavigate={() => {}}
        footer={{ initials: currentComercio.nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(), name: currentComercio.nombre, role: currentComercio.plan === 'premium' ? 'Plan Premium' : 'Plan Básico' }}
        accent="emerald"
        backToHubLabel="Cambiar Entorno"
      />

      {/* ─── Main Content ─── */}
      <div className="flex-1 min-w-0 overflow-y-auto lg:pl-64">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">
          {/* Header */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-foreground">
                  {currentComercio.nombre}
                </h1>
                {hasTrustSeal && (
                  <span
                    className={cn(
                      'inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-semibold',
                      'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    )}
                  >
                    <ShieldCheck className="h-3 w-3" />
                    Sello de Confianza Activo
                  </span>
                )}
              </div>
              <p className="text-sm text-muted-foreground">
                {currentComercio.categoria} · {currentComercio.ciudad} · NIT {currentComercio.nit}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold',
                  currentComercio.plan === 'premium'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-muted text-muted-foreground border border-border/40'
                )}
              >
                <Zap className="h-3 w-3" />
                {currentComercio.plan === 'premium' ? 'Plan Premium' : 'Plan Básico'}
              </span>
            </div>
          </div>

          {/* KPIs */}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
              title="Oportunidades Recibidas"
              value={opsRecibidas}
              icon={Store}
              gradient="emerald"
            />
            <KPICard
              title="Propuestas Enviadas"
              value={propsEnviadas}
              icon={Send}
              gradient="blue"
            />
            <KPICard
              title="Tasa de Conversión"
              value={tasaConversion}
              suffix="%"
              icon={TrendingUp}
              gradient="cyan"
            />
            <KPICard
              title="Suscripción"
              value={currentComercio.plan === 'premium' ? 'Premium' : 'Básico'}
              icon={Zap}
              gradient={currentComercio.plan === 'premium' ? 'amber' : 'green'}
            />
          </div>

          {/* Trust Seal Banner */}
          {hasTrustSeal && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 sm:p-5 flex items-start gap-4">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <ShieldCheck className="h-5 w-5 text-emerald-400" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-semibold text-emerald-400">
                  Sello de Confianza Neggo — Verificado
                </h3>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  Tu comercio cuenta con el Sello de Confianza Neggo. Esto significa que tu origen legal
                  ha sido validado, garantizas cero mercancía robada o ilegal, y tus clientes verán esta
                  insignia como garantía de transacción segura. Además, apareces con máxima prioridad en
                  el algoritmo de equidad (40-30-20-10).
                </p>
              </div>
            </div>
          )}

          {/* Oportunidades Feed */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Intenciones Financieras Certificadas (IFC)
                </h2>
                <p className="text-xs text-muted-foreground">
                  Oportunidades que hacen match con tu categoría y ciudad
                </p>
              </div>
              {ofertasReales.length > 0 && (
                <span className="text-xs font-mono text-muted-foreground">
                  {ofertasReales.length} ofertas registradas
                </span>
              )}
            </div>
            <OportunidadesFeed />
          </div>

          {/* Feedback de Clientes */}
          <div className="space-y-4 pt-4 border-t border-border/40">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-base font-semibold text-foreground">
                  Feedback de Clientes
                </h2>
                <p className="text-xs text-muted-foreground">
                  Mensajes de clientes sobre tus productos y servicios
                </p>
              </div>
            </div>
            <CrossSectorFeedbackPanel entityType="comercio" organizationId={organizationId} />
          </div>

          {/* Métricas de Rechazo */}
          <div className="space-y-4 pt-4 border-t border-border/40">
            <RejectionMetricsPanel entityType="establecimientos" organizationId={organizationId} />
          </div>
        </div>
      </div>
    </div>
  );
}
