import { useState, useEffect, useCallback } from 'react';
import { useComercioStore } from '@/features/comercios/store/useComercioStore';
import ComercioOnboarding from '@/features/comercios/components/ComercioOnboarding';
import OportunidadesFeed from '@/features/comercios/components/OportunidadesFeed';
import MisPropuestasTab from '@/features/comercios/components/MisPropuestasTab';
import SolicitudesClientesTab from '@/features/comercios/components/SolicitudesClientesTab';
import ComercioSolicitudesTab from '@/components/comercio/SolicitudesTab';
import ComercioSuscripcionTab from '@/components/comercio/SuscripcionTab';
import MiFacturacionTab from '@/components/facturacion/MiFacturacionTab';
import SeguridadTab from '@/features/shared/components/SeguridadTab';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';
import CrossSectorFeedbackPanel from '@/components/feedback/CrossSectorFeedbackPanel';
import RejectionMetricsPanel from '@/components/rejection/RejectionMetricsPanel';
import type { SidebarNavItem } from '@/components/WorkspaceSidebar';
import KPICard from '@/components/KPICard';
import { ShieldCheck, Send, TrendingUp, Zap, Store, Radio, CreditCard, MessageSquareText, TrendingDown, AlertTriangle, Loader2, Inbox, MessageCircle, Receipt, Lock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { fetchOfertasComercios, type OfertaComercioRow } from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';
import { useAuthStore } from '@/store/useAuthStore';
import { useOrganizationName } from '@/hooks/useOrganizationName';
import { useOfertaComercioRealtime } from '@/hooks/useOfertaComercioRealtime';
import { MFA_ENFORCEMENT_ENABLED } from '@/core/config/mfaConfig';

type ComercioSection = 'dashboard' | 'oportunidades' | 'mis-propuestas' | 'suscripcion' | 'solicitudes' | 'solicitudes-clientes' | 'mi-facturacion' | 'feedback' | 'metricas-rechazo' | 'seguridad';

const COMERCIO_SECTIONS: SidebarNavItem[] = [
  { key: 'dashboard', label: 'Dashboard', icon: Store },
  { key: 'oportunidades', label: 'Oportunidades IFC', icon: Radio },
  { key: 'mis-propuestas', label: 'Mis Propuestas', icon: Send },
  { key: 'suscripcion', label: 'Suscripción', icon: CreditCard },
  { key: 'solicitudes', label: 'Solicitudes (Me Interesa)', icon: Inbox },
  { key: 'solicitudes-clientes', label: 'Solicitudes de Clientes', icon: MessageCircle },
  { key: 'mi-facturacion', label: 'Mi Facturación', icon: Receipt },
  { key: 'feedback', label: 'Feedback Clientes', icon: MessageSquareText },
  { key: 'metricas-rechazo', label: 'Metricas Rechazo', icon: TrendingDown },
  ...(MFA_ENFORCEMENT_ENABLED ? [{ key: 'seguridad', label: 'Seguridad', icon: Lock }] : []),
];

export default function ComerciosDashboard() {
  const [activeSection, setActiveSection] = useState<ComercioSection>('dashboard');
  const {
    isOnboardingComplete,
    isOnboardingChecking,
    isOnboardingHydrated,
    hydrateOnboardingStatus,
    hasTrustSeal,
    currentComercio,
    propuestas,
    setComercio,
  } = useComercioStore();

  const session = useAuthStore((s) => s.session);
  const { name: orgName, status: orgNameStatus } = useOrganizationName();

  const [ofertasReales, setOfertasReales] = useState<OfertaComercioRow[]>([]);

  // Verifica el estado REAL de onboarding en organizations.metadata antes de
  // decidir si mostrar el formulario — nunca confía solo en el estado en memoria.
  useEffect(() => {
    void hydrateOnboardingStatus();
  }, [hydrateOnboardingStatus]);

  // Sincroniza la identidad del comercio con el userId real de la sesión —
  // nunca con un placeholder hardcodeado como el viejo 'COM-001'.
  useEffect(() => {
    if (session?.userId && currentComercio.id !== session.userId) {
      setComercio({ id: session.userId });
    }
  }, [session?.userId, currentComercio.id, setComercio]);

  const loadOfertas = useCallback(async () => {
    if (!isDbConfigured || !session?.userId) return;
    const { data } = await fetchOfertasComercios(session.userId);
    setOfertasReales(data ?? []);
  }, [session?.userId]);

  useEffect(() => {
    if (isOnboardingComplete) { void loadOfertas(); }
  }, [isOnboardingComplete, loadOfertas]);

  // Notifica al comercio en tiempo real cuando un cliente responde una oferta
  // (aceptada/rechazada) y refresca la lista, sin recargar la página.
  useOfertaComercioRealtime(isOnboardingComplete ? session?.userId ?? null : null, loadOfertas);

  if (!isOnboardingHydrated || isOnboardingChecking) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

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
          initials: orgNameStatus === 'ready' && orgName ? orgName.slice(0, 2).toUpperCase() : 'NC',
          name:
            orgNameStatus === 'ready' && orgName
              ? orgName
              : orgNameStatus === 'error'
                ? 'Error al cargar organización'
                : 'Cargando organización...',
          subtitle: 'Portal Aliado B2B',
          icon: Store,
        }}
        navItems={COMERCIO_SECTIONS}
        activeKey={activeSection}
        onNavigate={(key) => setActiveSection(key as ComercioSection)}
        footer={{ initials: currentComercio.nombre.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase(), name: currentComercio.nombre, role: currentComercio.plan === 'premium' ? 'Plan Premium' : 'Plan Básico' }}
        accent="emerald"
      />

      {/* ─── Main Content ─── */}
      <div className="flex-1 min-w-0 overflow-y-auto lg:pl-64">
        <div className="space-y-6 p-4 sm:p-6 lg:p-8 animate-fade-in">
          {activeSection === 'dashboard' && (
            <>
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
              <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                <span className="font-medium text-foreground/70">Organización registrada:</span>
                {orgNameStatus === 'ready' && orgName ? (
                  <span>{orgName}</span>
                ) : orgNameStatus === 'error' ? (
                  <span className="text-red-400 flex items-center gap-1">
                    <AlertTriangle className="h-3 w-3" /> No se pudo cargar
                  </span>
                ) : (
                  <span className="flex items-center gap-1">
                    <Loader2 className="h-3 w-3 animate-spin" /> Cargando...
                  </span>
                )}
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

            </>
          )}

          {activeSection === 'oportunidades' && (
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
          )}

          {activeSection === 'suscripcion' && <ComercioSuscripcionTab />}

          {activeSection === 'mis-propuestas' && (
            <MisPropuestasTab comercioId={currentComercio.id} />
          )}

          {activeSection === 'solicitudes' && (
            <ComercioSolicitudesTab
              comercioNombre={currentComercio.nombre}
              comercioId={currentComercio.id}
              comercioCiudad={currentComercio.ciudad}
              organizationId={session?.organizationId ?? null}
            />
          )}

          {activeSection === 'solicitudes-clientes' && (
            <SolicitudesClientesTab comercioId={currentComercio.id} />
          )}

          {activeSection === 'mi-facturacion' && (
            <MiFacturacionTab organizationId={session?.organizationId ?? null} />
          )}

          {activeSection === 'feedback' && (
            <div className="space-y-4">
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
              <CrossSectorFeedbackPanel entityType="comercio" organizationId={session?.organizationId ?? null} />
            </div>
          )}

          {activeSection === 'metricas-rechazo' && (
            <div className="space-y-4">
              {orgNameStatus === 'ready' && orgName ? (
                <RejectionMetricsPanel entityType="establecimientos" entityName={orgName} />
              ) : orgNameStatus === 'error' ? (
                <div className="flex flex-col items-center justify-center py-20 text-center">
                  <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
                  <p className="text-sm text-muted-foreground">No se pudo cargar el nombre de tu organización.</p>
                </div>
              ) : (
                <div className="flex items-center justify-center py-20">
                  <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
                </div>
              )}
            </div>
          )}

          {activeSection === 'seguridad' && <SeguridadTab />}
        </div>
      </div>
    </div>
  );
}
