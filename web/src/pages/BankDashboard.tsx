import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HeaderOperativo from '@/components/HeaderOperativo';
import WorkspaceSidebar from '@/components/WorkspaceSidebar';
import type { SidebarNavItem } from '@/components/WorkspaceSidebar';
import SolicitudesTab from '@/components/bank/SolicitudesTab';
import CampanasTab from '@/components/bank/CampanasTab';
import AnalyticsTab from '@/components/bank/AnalyticsTab';
import FeedbackTab from '@/components/bank/FeedbackTab';
import CrossSectorFeedbackPanel from '@/components/feedback/CrossSectorFeedbackPanel';
import RejectionMetricsPanel from '@/components/rejection/RejectionMetricsPanel';
import { Building2, BarChart3, Megaphone, MessageSquareText, FileText, TrendingDown } from 'lucide-react';

type BankTab = 'solicitudes' | 'campanas' | 'analytics' | 'feedback' | 'metricas-rechazo';

const BANK_SECTIONS: SidebarNavItem[] = [
  { key: 'solicitudes', label: 'Solicitudes', icon: FileText, badge: 1247 },
  { key: 'campanas', label: 'Campañas', icon: Megaphone, badge: 6 },
  { key: 'analytics', label: 'Analítica', icon: BarChart3 },
  { key: 'feedback', label: 'Feedback', icon: MessageSquareText, badge: 6 },
  { key: 'metricas-rechazo', label: 'Metricas Rechazo', icon: TrendingDown },
];

export default function BankDashboard() {
  const [activeTab, setActiveTab] = useState<BankTab>('solicitudes');

  return (
    <div className="min-h-screen bg-background flex">
      {/* ─── Isolated Bank Sidebar ─── */}
      <WorkspaceSidebar
        brand={{
          initials: 'NB',
          name: 'Neggo Banca',
          subtitle: 'Pipeline Bancario',
          icon: Building2,
        }}
        navItems={BANK_SECTIONS}
        activeKey={activeTab}
        onNavigate={(key) => setActiveTab(key as BankTab)}
        footer={{ initials: 'OE', name: 'Operador Banca', role: 'Ejecutivo Senior' }}
        accent="emerald"
        backToHubLabel="Cambiar Entorno"
      />

      {/* ─── Main Content ─── */}
      <div className="flex-1 min-w-0 overflow-y-auto lg:pl-64">
        <div className="mx-auto max-w-[1440px] space-y-6 p-4 lg:p-6">
          <HeaderOperativo />

          <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as BankTab)} className="space-y-6">
            <TabsList className="h-12 w-full justify-start gap-1 bg-transparent p-0">
              {[
                { id: 'solicitudes', label: 'Solicitudes', icon: FileText, count: 1247 },
                { id: 'campanas', label: 'Campañas', icon: Megaphone, count: 6 },
                { id: 'analytics', label: 'Analítica', icon: BarChart3 },
                { id: 'feedback', label: 'Feedback', icon: MessageSquareText, count: 6 },
              ].map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="relative flex items-center gap-2 rounded-lg border border-transparent px-4 py-2.5 text-sm font-medium text-muted-foreground transition-all data-[state=active]:border-border/60 data-[state=active]:bg-card/80 data-[state=active]:text-foreground data-[state=active]:shadow-sm hover:bg-card/40 hover:text-foreground"
                >
                  <tab.icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                  {tab.count !== undefined && (
                    <span className="flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary/10 px-1.5 text-[10px] font-bold text-primary">
                      {tab.count}
                    </span>
                  )}
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="solicitudes" className="mt-0 animate-slide-up">
              <SolicitudesTab />
            </TabsContent>
            <TabsContent value="campanas" className="mt-0 animate-slide-up">
              <CampanasTab />
            </TabsContent>
            <TabsContent value="analytics" className="mt-0 animate-slide-up">
              <AnalyticsTab />
            </TabsContent>
            <TabsContent value="feedback" className="mt-0 animate-slide-up">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-bold tracking-tight text-foreground">Feedback de Clientes</h2>
                    <p className="text-xs text-muted-foreground mt-0.5">Mensajes de clientes, respuesta y seguimiento en tiempo real</p>
                  </div>
                </div>
                <CrossSectorFeedbackPanel entityType="banco" />
              </div>
            </TabsContent>
            <TabsContent value="metricas-rechazo" className="mt-0 animate-slide-up">
              <RejectionMetricsPanel entityType="banca" />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
