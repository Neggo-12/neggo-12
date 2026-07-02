import { ArrowDownRight, ArrowUpRight, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KPICardProps {
  title: string;
  value: string | number;
  delta?: number;
  icon: LucideIcon;
  gradient?: 'green' | 'blue' | 'amber' | 'red' | 'purple' | 'emerald' | 'cyan';
  suffix?: string;
  prefix?: string;
  className?: string;
}

const gradients = {
  green: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
  blue: 'from-blue-500/20 to-blue-600/5 border-blue-500/20',
  amber: 'from-amber-500/20 to-amber-600/5 border-amber-500/20',
  red: 'from-red-500/20 to-red-600/5 border-red-500/20',
  purple: 'from-purple-500/20 to-purple-600/5 border-purple-500/20',
  emerald: 'from-emerald-500/20 to-emerald-600/5 border-emerald-500/20',
  cyan: 'from-cyan-500/20 to-cyan-600/5 border-cyan-500/20',
};

const iconColors = {
  green: 'text-emerald-400 bg-emerald-500/10',
  blue: 'text-blue-400 bg-blue-500/10',
  amber: 'text-amber-400 bg-amber-500/10',
  red: 'text-red-400 bg-red-500/10',
  purple: 'text-purple-400 bg-purple-500/10',
  emerald: 'text-emerald-400 bg-emerald-500/10',
  cyan: 'text-cyan-400 bg-cyan-500/10',
};

export default function KPICard({ title, value, delta, icon: Icon, gradient = 'green', suffix, prefix, className }: KPICardProps) {
  const isPositive = (delta ?? 0) >= 0;

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-xl border bg-gradient-to-br p-4 transition-all duration-300 hover:scale-[1.01]',
        gradients[gradient],
        className
      )}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      
      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            {title}
          </p>
          <div className="flex items-baseline gap-1">
            {prefix && <span className="text-sm font-medium text-muted-foreground">{prefix}</span>}
            <span className="text-2xl font-bold tracking-tight text-foreground font-mono">
              {value}
            </span>
            {suffix && <span className="text-sm font-medium text-muted-foreground">{suffix}</span>}
          </div>
          {delta !== undefined && (
            <div className="flex items-center gap-1">
              {isPositive ? (
                <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
              ) : (
                <ArrowDownRight className="h-3.5 w-3.5 text-red-400" />
              )}
              <span
                className={cn(
                  'text-xs font-semibold font-mono',
                  isPositive ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {isPositive ? '+' : ''}{delta}%
              </span>
              <span className="text-[10px] text-muted-foreground">vs semana pasada</span>
            </div>
          )}
        </div>
        <div className={cn('flex h-9 w-9 items-center justify-center rounded-lg', iconColors[gradient])}>
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>
    </div>
  );
}
