import { Link, useLocation } from 'react-router-dom';
import { Menu, X, ArrowLeft } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';
import type { LucideIcon } from 'lucide-react';

// ───── Types ─────

export interface SidebarNavItem {
  key: string;
  label: string;
  icon: LucideIcon;
  badge?: number | null;
}

export interface SidebarBrand {
  initials: string;
  name: string;
  subtitle: string;
  icon: LucideIcon;
}

export interface SidebarFooter {
  initials: string;
  name: string;
  role: string;
}

interface WorkspaceSidebarProps {
  /** Brand identity shown at the top */
  brand: SidebarBrand;
  /** Navigation sections with items */
  navItems: SidebarNavItem[];
  /** Currently active item key */
  activeKey: string;
  /** Called when a nav item is clicked */
  onNavigate: (key: string) => void;
  /** Footer identity */
  footer: SidebarFooter;
  /** Accent color for active states */
  accent: 'emerald' | 'blue' | 'cyan' | 'red' | 'amber' | 'purple';
  /** URL for the "back to hub" link */
  backToHubUrl?: string;
  /** Label for the back-to-hub button */
  backToHubLabel?: string;
}

// ───── Accent color map ─────

const accentClasses: Record<WorkspaceSidebarProps['accent'], {
  active: string;
  icon: string;
  badge: string;
  footer: string;
}> = {
  emerald: {
    active: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    icon: 'text-emerald-400',
    badge: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    footer: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  },
  blue: {
    active: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
    icon: 'text-blue-400',
    badge: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    footer: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
  },
  cyan: {
    active: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/20',
    icon: 'text-cyan-400',
    badge: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    footer: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20',
  },
  red: {
    active: 'bg-red-500/10 text-red-400 border-red-500/20',
    icon: 'text-red-400',
    badge: 'bg-red-500/20 text-red-400 border-red-500/30',
    footer: 'text-red-400 bg-red-500/10 border-red-500/20',
  },
  amber: {
    active: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    icon: 'text-amber-400',
    badge: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    footer: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
  },
  purple: {
    active: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
    icon: 'text-purple-400',
    badge: 'bg-purple-500/20 text-purple-400 border-purple-500/30',
    footer: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
  },
};

// ───── Component ─────

export default function WorkspaceSidebar({
  brand,
  navItems,
  activeKey,
  onNavigate,
  footer,
  accent,
  backToHubUrl = '/',
  backToHubLabel = 'Volver al Hub Central',
}: WorkspaceSidebarProps) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const colors = accentClasses[accent];
  const BrandIcon = brand.icon;

  return (
    <>
      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="fixed top-4 left-4 z-50 flex h-9 w-9 items-center justify-center rounded-lg bg-card border border-border/40 lg:hidden"
      >
        {mobileOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 flex h-screen w-64 flex-col border-r border-border/40 bg-card/90 backdrop-blur-xl transition-transform lg:translate-x-0',
          mobileOpen ? 'translate-x-0' : '-translate-x-full',
        )}
      >
        {/* Brand header */}
        <div className="flex h-16 items-center gap-3 border-b border-border/40 px-5">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border', colors.footer)}>
            <BrandIcon className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight text-foreground">{brand.name}</h1>
            <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium">
              {brand.subtitle}
            </p>
          </div>
        </div>

        {/* Back to hub */}
        <Link
          to={backToHubUrl}
          className="mx-3 mt-3 flex items-center gap-2 rounded-lg border border-border/40 bg-card/40 px-3 py-2 text-xs font-medium text-muted-foreground transition-all hover:border-border/60 hover:bg-card hover:text-foreground"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          {backToHubLabel}
        </Link>

        {/* Navigation */}
        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {navItems.map((item) => {
            const isActive = activeKey === item.key;
            const Icon = item.icon;
            return (
              <button
                key={item.key}
                onClick={() => {
                  onNavigate(item.key);
                  setMobileOpen(false);
                }}
                className={cn(
                  'w-full flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-all text-left',
                  isActive
                    ? colors.active
                    : 'text-muted-foreground hover:bg-card hover:text-foreground border border-transparent',
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? colors.icon : 'text-muted-foreground')} />
                <span className="truncate">{item.label}</span>
                {item.badge !== null && item.badge !== undefined && item.badge > 0 && (
                  <span className={cn('ml-auto flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-bold border', colors.badge)}>
                    {item.badge}
                  </span>
                )}
                {isActive && (item.badge === null || item.badge === undefined || item.badge === 0) && (
                  <div className={cn('ml-auto h-1.5 w-1.5 rounded-full animate-pulse', colors.icon)} />
                )}
              </button>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="border-t border-border/40 p-4">
          <div className="flex items-center gap-3">
            <div className={cn('flex h-8 w-8 items-center justify-center rounded-full border text-xs font-bold', colors.footer)}>
              {footer.initials}
            </div>
            <div>
              <p className="text-xs font-medium text-foreground">{footer.name}</p>
              <p className="text-[10px] text-muted-foreground">{footer.role}</p>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}
