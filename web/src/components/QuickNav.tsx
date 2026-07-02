import { Link, useLocation } from 'react-router-dom';
import { Building2, Home, LayoutGrid, ShoppingBag, ShieldCheck, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';

/**
 * Global environment switcher — appears in every workspace header.
 * Allows fast navigation between all 5 operational workspaces.
 */
export default function QuickNav() {
  const location = useLocation();

  const navItems = [
    { path: '/banca', label: 'Banca', icon: Building2 },
    { path: '/constructoras', label: 'Constructoras', icon: Home },
    { path: '/portal', label: 'Portal Clientes', icon: LayoutGrid },
    { path: '/comercios', label: 'Comercios', icon: ShoppingBag },
    { path: '/admin', label: 'Admin Neggo', icon: ShieldCheck },
  ];

  return (
    <div className="flex items-center gap-3">
      {/* Back to Landing */}
      <Link
        to="/"
        className={cn(
          'group flex items-center gap-1.5 rounded-lg border border-border/40 bg-card/40 px-3 py-2 text-xs font-medium',
          'text-muted-foreground transition-all hover:border-border/60 hover:bg-card hover:text-foreground',
        )}
      >
        <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
        <span className="hidden sm:inline">Cambiar Entorno</span>
      </Link>

      {/* Divider */}
      <div className="h-5 w-px bg-border/50" />

      {/* Environment pills */}
      <div className="flex items-center gap-1 rounded-lg border border-border/40 bg-card/40 p-0.5 overflow-x-auto scrollbar-thin">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                'flex items-center gap-1.5 rounded-md px-2.5 py-1.5 text-xs font-medium transition-all whitespace-nowrap',
                isActive
                  ? 'bg-primary/10 text-primary border border-primary/20 shadow-sm'
                  : 'text-muted-foreground hover:text-foreground hover:bg-card/60 border border-transparent',
              )}
            >
              <item.icon className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
