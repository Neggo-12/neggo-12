import { cn } from '@/lib/utils';
import { usePortalStore } from '@/features/portal/store/usePortalStore';
import type { PortalTab } from '@/features/portal/store/usePortalStore';

// ───── Tab config ─────

const TABS: { id: PortalTab; label: string }[] = [
  { id: 'finanzas', label: 'Finanzas' },
  { id: 'control-financiero', label: 'Control Financiero' },
  { id: 'ofertas', label: 'Ofertas' },
  { id: 'oportunidades-inmobiliarias', label: 'Oportunidades Inmobiliarias' },
  { id: 'metas', label: 'Metas' },
  { id: 'facturas', label: 'Facturas' },
  { id: 'solicitudes', label: 'Banca Privada' },
  { id: 'feedback', label: 'Soporte y Feedback' },
];

// ───── Main PortalNavigation ─────

export default function PortalNavigation() {
  const { activeTab, setActiveTab } = usePortalStore();

  return (
    <div className="flex items-center justify-end gap-4">
      {/* Right — Navigation Tabs */}
      <nav className="flex items-center gap-1 overflow-x-auto scrollbar-thin">
        {TABS.map((tab) => {
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                'relative shrink-0 rounded-lg px-3.5 py-2 text-sm font-medium whitespace-nowrap transition-all duration-200',
                isActive
                  ? 'bg-card/80 text-foreground border border-border/60 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/40 border border-transparent',
              )}
            >
              {tab.label}
              {isActive && (
                <span className="absolute bottom-0 left-1/2 -translate-x-1/2 h-0.5 w-6 rounded-full bg-blue-500 shadow-[0_0_8px_hsl(217_91%_60%/0.5)]" />
              )}
            </button>
          );
        })}
      </nav>
    </div>
  );
}
