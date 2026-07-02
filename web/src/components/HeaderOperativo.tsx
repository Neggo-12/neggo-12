import { Activity, Gauge, Wifi, Zap } from 'lucide-react';
import { pipelineStatus, systemStatus } from '@/data/mock';
import { cn } from '@/lib/utils';

const statusConfig = {
  operativo: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', dot: 'bg-emerald-400', glow: 'shadow-emerald-500/20' },
  degradado: { bg: 'bg-amber-500/10', text: 'text-amber-400', dot: 'bg-amber-400', glow: 'shadow-amber-500/20' },
  critico: { bg: 'bg-red-500/10', text: 'text-red-400', dot: 'bg-red-400', glow: 'shadow-red-500/20' },
  mantenimiento: { bg: 'bg-blue-500/10', text: 'text-blue-400', dot: 'bg-blue-400', glow: 'shadow-blue-500/20' },
};

export default function HeaderOperativo() {
  const totalLeads = pipelineStatus.reduce((s, p) => s + p.value, 0);
  const activePipeline = pipelineStatus.filter(p => p.value > 0);

  return (
    <div className="space-y-3">
      {/* Main Status Bar */}
      <div className="relative overflow-hidden rounded-xl border border-border/60 bg-card/80 backdrop-blur-sm">
        <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-emerald-500/30 to-transparent" />
        
        <div className="flex flex-wrap items-center justify-between gap-4 px-5 py-4">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-500/10 glow-green">
              <Activity className="h-5 w-5 text-emerald-400" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-foreground">Estado del Embudo de Leads</h2>
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Activo y comprometido
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {activePipeline.map((pipe) => (
              <div key={pipe.label} className="text-center">
                <div className="text-lg font-bold text-foreground font-mono">
                  {pipe.value.toLocaleString()}
                </div>
                <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                  {pipe.label}
                </div>
              </div>
            ))}
            <div className="h-8 w-px bg-border/60" />
            <div className="text-center">
              <div className="text-lg font-bold text-emerald-400 font-mono">
                {totalLeads.toLocaleString()}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">
                Total Pipeline
              </div>
            </div>
          </div>
        </div>

        {/* Pipeline Progress */}
        <div className="flex h-1">
          {pipelineStatus.map((pipe) => (
            <div
              key={pipe.label}
              className={cn(
                'transition-all duration-500',
                pipe.color === 'emerald' && 'bg-emerald-500',
                pipe.color === 'blue' && 'bg-blue-500',
                pipe.color === 'amber' && 'bg-amber-500',
                pipe.color === 'green' && 'bg-green-500'
              )}
              style={{ width: `${(pipe.value / totalLeads) * 100}%` }}
            />
          ))}
        </div>
      </div>

      {/* System Status Grid */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {systemStatus.map((sys) => {
          const cfg = statusConfig[sys.status];
          return (
            <div
              key={sys.label}
              className={cn(
                'relative flex items-center gap-3 rounded-lg border border-border/40 px-3 py-2.5 transition-all hover:border-border/80',
                'bg-card/60 backdrop-blur-sm'
              )}
            >
              <div className={cn('flex h-8 w-8 items-center justify-center rounded-md', cfg.bg)}>
                {sys.label === 'API Core' && <Zap className={cn('h-4 w-4', cfg.text)} />}
                {sys.label === 'Datacrédito' && <Gauge className={cn('h-4 w-4', cfg.text)} />}
                {sys.label === 'Notificaciones' && <Wifi className={cn('h-4 w-4', cfg.text)} />}
                {sys.label === 'Campañas' && <Activity className={cn('h-4 w-4', cfg.text)} />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn('h-1.5 w-1.5 rounded-full', cfg.dot, sys.status === 'operativo' && 'animate-pulse')} />
                  <span className="text-xs font-medium text-foreground truncate">{sys.label}</span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[10px] font-mono text-muted-foreground">{sys.latency}</span>
                  <span className="text-[10px] font-mono text-muted-foreground">{sys.uptime}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
