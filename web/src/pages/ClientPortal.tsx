import { lazy, Suspense } from 'react';
import { Sparkles, Loader2, LayoutDashboard, TrendingUp, BarChart3, Gift, Home, Target, Receipt, Landmark, MessageSquareText } from 'lucide-react';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';
import type { SidebarNavItem } from '@/components/WorkspaceSidebar';
import PortalNavigation from '@/features/portal/components/PortalNavigation';
import AntiPhishingBanner from '@/features/portal/components/AntiPhishingBanner';
import { usePortalStore } from '@/features/portal/store/usePortalStore';
import type { PortalTab } from '@/features/portal/store/usePortalStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useClienteProfile } from '@/hooks/useClienteProfile';

// ───── Lazy-loaded tab views ─────

const FinanzasView = lazy(() => import('@/features/portal/components/FinanzasView'));
const ControlFinancieroView = lazy(() => import('@/features/portal/components/ControlFinancieroView'));
const OfertasView = lazy(() => import('@/features/portal/components/OfertasView'));
const OportunidadesInmobiliariasView = lazy(() => import('@/features/portal/components/OportunidadesInmobiliariasView'));
const MetasView = lazy(() => import('@/features/portal/components/MetasView'));
const FacturasView = lazy(() => import('@/features/portal/components/FacturasView'));
const MeInteresaView = lazy(() => import('@/features/portal/components/MeInteresaView'));
const FeedbackView = lazy(() => import('@/features/portal/components/FeedbackView'));

// ───── Tab labels ─────

const TAB_LABELS: Record<PortalTab, string> = {
  finanzas: 'Finanzas',
  'control-financiero': 'Control Financiero',
  ofertas: 'Ofertas',
  'oportunidades-inmobiliarias': 'Oportunidades Inmobiliarias',
  metas: 'Metas',
  facturas: 'Facturas',
  solicitudes: 'Me Interesa',
  feedback: 'Soporte y Feedback',
};

// ───── Sidebar nav items ─────

const PORTAL_SECTIONS: SidebarNavItem[] = [
  { key: 'resumen', label: 'Resumen', icon: LayoutDashboard },
  { key: 'finanzas', label: 'Finanzas', icon: TrendingUp },
  { key: 'control-financiero', label: 'Control Financiero', icon: BarChart3 },
  { key: 'ofertas', label: 'Ofertas', icon: Gift },
  { key: 'oportunidades-inmobiliarias', label: 'Oportunidades Inmobiliarias', icon: Home },
  { key: 'metas', label: 'Metas', icon: Target },
  { key: 'facturas', label: 'Facturas', icon: Receipt },
  { key: 'solicitudes', label: 'Me Interesa', icon: Landmark },
  { key: 'feedback', label: 'Soporte y Feedback', icon: MessageSquareText },
];

// ───── Loading fallback ─────

function TabLoading() {
  return (
    <div className="flex items-center justify-center py-24">
      <Loader2 className="h-6 w-6 text-blue-400 animate-spin" />
    </div>
  );
}

// ───── Active tab renderer ─────

function ActiveTabContent({ tab }: { tab: PortalTab }) {
  switch (tab) {
    case 'finanzas':
      return <FinanzasView />;
    case 'control-financiero':
      return <ControlFinancieroView />;
    case 'ofertas':
      return <OfertasView />;
    case 'oportunidades-inmobiliarias':
      return <OportunidadesInmobiliariasView />;
    case 'metas':
      return <MetasView />;
    case 'facturas':
      return <FacturasView />;
    case 'solicitudes':
      return <MeInteresaView />;
    case 'feedback':
      return <FeedbackView />;
    default:
      return <FinanzasView />;
  }
}

// ───── Main Page ─────

export default function ClientPortal() {
  const { activeTab, setActiveTab } = usePortalStore();
  const session = useAuthStore((s) => s.session);
  const { name: clienteNombre, status: clienteNombreStatus } = useClienteProfile();
  const clientDisplayName =
    clienteNombreStatus === 'ready' && clienteNombre ? clienteNombre : session?.email ?? null;

  return (
    <div className="min-h-screen bg-background flex">
      {/* ─── Isolated Portal Sidebar ─── */}
      <WorkspaceSidebar
        brand={{
          initials: clienteNombreStatus === 'ready' && clienteNombre ? clienteNombre.slice(0, 2).toUpperCase() : 'NP',
          name:
            clienteNombreStatus === 'ready' && clienteNombre
              ? clienteNombre
              : clienteNombreStatus === 'error'
                ? 'Error al cargar perfil'
                : 'Cargando...',
          subtitle: 'Portal Cliente',
          icon: LayoutDashboard,
        }}
        navItems={PORTAL_SECTIONS}
        activeKey={activeTab}
        onNavigate={(key) => {
          // "resumen" defaults to finanzas
          setActiveTab(key === 'resumen' ? 'finanzas' : (key as PortalTab));
        }}
        footer={
          clientDisplayName
            ? { initials: clientDisplayName.slice(0, 2).toUpperCase(), name: clientDisplayName, role: session?.role ?? 'Cliente' }
            : { initials: '··', name: 'Cargando sesión...', role: session?.role ?? 'Cliente' }
        }
        accent="cyan"
      />

      {/* ─── Main Content ─── */}
      <div className="flex-1 min-w-0 overflow-y-auto lg:pl-64">
        {/* ── Navigation Bar ── */}
        <div className="border-b border-border/40">
          <div className="mx-auto max-w-[1440px] px-4 py-3 lg:px-6">
            <PortalNavigation />
          </div>
        </div>

        {/* ── Main Content ── */}
        <div className="mx-auto max-w-[1440px] px-4 py-6 lg:px-6 space-y-6">
          {/* Welcome Header */}
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
            <div className="space-y-1">
              <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-[10px] font-medium text-cyan-400">
                <Sparkles className="h-3 w-3" />
                Portal de Clientes
              </div>
              <h1 className="text-2xl lg:text-3xl font-bold text-foreground tracking-tight">
                Bienvenido de vuelta,{' '}
                <span className="text-cyan-400">{clientDisplayName ?? 'Cargando...'}</span>
              </h1>
            </div>
          </div>

          {/* ── Anti-Phishing Security Banner ── */}
          <AntiPhishingBanner />

          {/* ── Active Tab Content ── */}
          <div className="min-h-[400px]">
            <Suspense fallback={<TabLoading />}>
              <ActiveTabContent tab={activeTab} />
            </Suspense>
          </div>
        </div>

        {/* ── Footer ── */}
        <footer className="border-t border-border/40 mt-8">
          <div className="mx-auto max-w-[1440px] px-4 lg:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10">
                <span className="text-xs font-bold text-cyan-400 font-mono">N</span>
              </div>
              <p className="text-xs text-muted-foreground">
                Neggo — Portal de Clientes
              </p>
            </div>
            <p className="text-[11px] text-muted-foreground">
              &copy; {new Date().getFullYear()} Neggo. Todos los derechos reservados.
            </p>
          </div>
        </footer>
      </div>
    </div>
  );
}
