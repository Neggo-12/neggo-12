import { useState, useMemo } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HeaderOperativo from '@/components/HeaderOperativo';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';
import type { SidebarNavItem } from '@/components/WorkspaceSidebar';
import SolicitudesTab from '@/components/bank/SolicitudesTab';
import CampanasTab from '@/components/bank/CampanasTab';
import AnalyticsTab from '@/components/bank/AnalyticsTab';
import FeedbackTab from '@/components/bank/FeedbackTab';
import MiFacturacionTab from '@/components/facturacion/MiFacturacionTab';
import CrossSectorFeedbackPanel from '@/components/feedback/CrossSectorFeedbackPanel';
import RejectionMetricsPanel from '@/components/rejection/RejectionMetricsPanel';
import SeguridadTab from '@/features/shared/components/SeguridadTab';
import { useAuthStore } from '@/store/useAuthStore';
import { Building2, BarChart3, Megaphone, MessageSquareText, FileText, TrendingDown, AlertTriangle, Loader2, Receipt, Lock } from 'lucide-react';
import { useOrganizationName } from '@/hooks/useOrganizationName';
import { MFA_ENFORCEMENT_ENABLED } from '@/core/config/mfaConfig';

type BankTab = 'solicitudes' | 'campanas' | 'mi-facturacion' | 'analytics' | 'feedback' | 'metricas-rechazo' | 'seguridad';

export default function BankDashboard() {
  const [activeTab, setActiveTab] = useState<BankTab>('solicitudes');
  const session = useAuthStore((s) => s.session);
  const getOrganizationId = useAuthStore((s) => s.getOrganizationId);
  const organizationId = getOrganizationId();
  const { name: orgName, status: orgNameStatus } = useOrganizationName();

  const bankNameForDisplay = orgNameStatus === 'ready' && orgName ? orgName : '';

  const sidebarBrand = useMemo(() => {
    const orgDisplayName =
      orgNameStatus === 'ready' && orgName
        ? orgName
        : orgNameStatus === 'error'
          ? 'Error al cargar organización'
          : 'Cargando organización...';
    return {
      initials: orgNameStatus === 'ready' && orgName ? orgName.slice(0, 2).toUpperCase() : 'NB',
      name: orgDisplayName,
      subtitle: 'Pipeline Bancario',
      icon: Building2,
    };
  }, [orgName, orgNameStatus]);

  const sidebarFooter = useMemo(() => {
    if (!session) return { initials: 'OE', name: 'Operador Banca', role: 'Ejecutivo Senior' };
    return {
      initials: session.email.slice(0, 2).toUpperCase(),
      name: session.email.length > 25 ? session.email.slice(0, 25) + '...' : session.email,
      role: session.role,
    };
  }, [session]);

  const BANK_SECTIONS: SidebarNavItem[] = [
    { key: 'solicitudes', label: 'Solicitudes', icon: FileText },
    { key: 'campanas', label: 'Campañas', icon: Megaphone },
    { key: 'mi-facturacion', label: 'Mi Facturación', icon: Receipt },
    { key: 'analytics', label: 'Analítica', icon: BarChart3 },
    { key: 'feedback', label: 'Feedback', icon: MessageSquareText },
    { key: 'metricas-rechazo', label: 'Metricas Rechazo', icon: TrendingDown },
    ...(MFA_ENFORCEMENT_ENABLED ? [{ key: 'seguridad', label: 'Seguridad', icon: Lock }] : []),
  ];

  return (
    <div className="min-h-screen bg-background flex">
      <WorkspaceSidebar
        brand={sidebarBrand}
        navItems={BANK_SECTIONS}
        activeKey={activeTab}
        onNavigate={(key) => setActiveTab(key as BankTab)}
        footer={sidebarFooter}
        accent="emerald"
      />

      <div className="flex-1 min-w-0 overflow-y-auto lg:pl-64">
        <div className="mx-auto max-w-[1440px] space-y-6 p-4 lg:p-6">
          <HeaderOperativo />

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BankTab)} className="space-y-6">
            <TabsList className="h-12 w-full justify-start gap-1 bg-transparent p-0">
              {[
                { id: 'solicitudes', label: 'Solicitudes', icon: FileText },
                { id: 'campanas', label: 'Campañas', icon: Megaphone },
                { id: 'mi-facturacion', label: 'Mi Facturación', icon: Receipt },
                { id: 'analytics', label: 'Analítica', icon: BarChart3 },
                { id: 'feedback', label: 'Feedback', icon: MessageSquareText },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="relative flex items-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all data-[state=active]:border-border/60 data-[state=active]:bg-card/80 data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-card/40 hover:text-foreground"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="solicitudes" className="mt-0 animate-slide-up">
              <SolicitudesTab
                organizationName={orgNameStatus === 'ready' ? orgName : null}
                organizationId={organizationId}
              />
            </TabsContent>
            <TabsContent value="campanas" className="mt-0 animate-slide-up">
              <CampanasTab bankName={bankNameForDisplay} />
            </TabsContent>
            <TabsContent value="mi-facturacion" className="mt-0 animate-slide-up">
              <MiFacturacionTab organizationId={organizationId} />
            </TabsContent>
            <TabsContent value="analytics" className="mt-0 animate-slide-up">
              <AnalyticsTab bankName={bankNameForDisplay} />
            </TabsContent>
            <TabsContent value="feedback" className="mt-0 animate-slide-up">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-foreground">Feedback de Clientes</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Mensajes de clientes, respuesta y seguimiento en tiempo real</p>
                  </div>
                </div>
                <CrossSectorFeedbackPanel entityType="banco" organizationId={organizationId} />
              </div>
            </TabsContent>
            <TabsContent value="metricas-rechazo" className="mt-0 animate-slide-up">
              {orgNameStatus === 'ready' && orgName ? (
                <RejectionMetricsPanel entityType="banca" entityName={orgName} />
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
            </TabsContent>
            <TabsContent value="seguridad" className="mt-0 animate-slide-up">
              <SeguridadTab />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
