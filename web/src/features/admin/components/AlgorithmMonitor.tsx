import { useAdminStore } from '@/features/admin/store/useAdminStore';
import { Progress } from '@/components/ui/progress';
import { cn, formatCOP } from '@/lib/utils';
import {
  BarChart3,
  FileText,
  Hash,
  Target,
  TrendingUp,
} from 'lucide-react';
import type { IFCTransaction, AlgorithmEquity } from '@/types';

// ───── Equity bar config ─────

const equityBars: { key: keyof AlgorithmEquity; label: string; color: string }[] = [
  { key: 'calidad', label: 'Calidad del Comercio', color: 'bg-emerald-500' },
  { key: 'respuesta', label: 'Tasa de Respuesta', color: 'bg-blue-500' },
  { key: 'rotacion', label: 'Rotación Equitativa', color: 'bg-amber-500' },
  { key: 'sorteo', label: 'Sorteo Aleatorio', color: 'bg-purple-500' },
];

// ───── Format helpers ─────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `Hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `Hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `Hace ${days} d`;
}

// ───── Component ─────

export default function AlgorithmMonitor() {
  const { algorithmEquity, ifcTransactions } = useAdminStore();

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">
          Monitor de Matching e Inteligencia IFC
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Auditoría del comportamiento del algoritmo de distribución de oportunidades
        </p>
      </div>

      {/* Algorithm equity panel */}
      <div className="rounded-xl border border-border/40 bg-card/50 p-5 space-y-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Distribución del Algoritmo de Equidad
          </h3>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
            40-30-20-10
          </span>
        </div>

        <div className="space-y-3">
          {equityBars.map((bar) => (
            <div key={bar.key} className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs text-muted-foreground">{bar.label}</span>
                <span className="text-xs font-mono font-semibold text-foreground">
                  {algorithmEquity[bar.key]}%
                </span>
              </div>
              <Progress
                value={algorithmEquity[bar.key]}
                className="h-2 bg-muted"
                // Override indicator color via inline style on the indicator
                style={
                  {
                    '--progress-color': bar.color,
                  } as React.CSSProperties
                }
              />
              {/* Custom-colored indicator */}
              <div className="relative h-2 overflow-hidden rounded-full bg-muted -mt-2 pointer-events-none">
                <div
                  className={cn('h-full rounded-full transition-all', bar.color)}
                  style={{ width: `${algorithmEquity[bar.key]}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <p className="text-[11px] text-muted-foreground leading-relaxed pt-2 border-t border-border/30">
          Este algoritmo garantiza que ningún comercio monopolice las oportunidades IFC. La distribución pondera
          la calidad del comercio (40%), su tasa de respuesta (30%), la rotación equitativa entre aliados (20%)
          y un componente de sorteo aleatorio para nuevos participantes (10%).
        </p>
      </div>

      {/* IFC transaction list */}
      <div className="rounded-xl border border-border/40 bg-card/50 overflow-hidden">
        <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/30">
          <FileText className="h-4 w-4 text-primary" />
          <h3 className="text-sm font-semibold text-foreground">
            Últimas IFC Generadas
          </h3>
          <span className="ml-auto text-[10px] font-mono text-muted-foreground">
            {ifcTransactions.length} transacciones
          </span>
        </div>

        <div className="divide-y divide-border/20">
          {ifcTransactions.map((tx) => (
            <IFCRow key={tx.id} tx={tx} />
          ))}
        </div>
      </div>
    </div>
  );
}

// ───── IFC row ─────

function IFCRow({ tx }: { tx: IFCTransaction }) {
  return (
    <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center hover:bg-white/[0.01] transition-colors">
      {/* Left: IFC ID + metadata */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-semibold text-foreground">{tx.id}</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary font-medium">
            {tx.categoria}
          </span>
        </div>
        <p className="text-xs text-muted-foreground">
          Presupuesto validado:{' '}
          <span className="font-mono font-semibold text-foreground">{formatCOP(tx.presupuesto)}</span>
        </p>
      </div>

      {/* Middle: distribution stats */}
      <div className="flex items-center gap-4 sm:gap-6">
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-xs">
            <Hash className="h-3 w-3 text-blue-400" />
            <span className="font-mono font-semibold text-foreground">{tx.comerciosNotificados}</span>
          </div>
          <span className="text-[9px] text-muted-foreground">notificados</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-xs">
            <Target className="h-3 w-3 text-emerald-400" />
            <span className="font-mono font-semibold text-foreground">{tx.propuestasRecibidas}</span>
          </div>
          <span className="text-[9px] text-muted-foreground">propuestas</span>
        </div>
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-1 text-xs">
            <TrendingUp className="h-3 w-3 text-amber-400" />
            <span className="font-mono font-semibold text-foreground">
              {tx.comerciosNotificados > 0
                ? Math.round((tx.propuestasRecibidas / tx.comerciosNotificados) * 100)
                : 0}%
            </span>
          </div>
          <span className="text-[9px] text-muted-foreground">respuesta</span>
        </div>
      </div>

      {/* Right: time */}
      <div className="sm:text-right">
        <span className="text-[10px] text-muted-foreground whitespace-nowrap">
          {timeAgo(tx.fechaGeneracion)}
        </span>
      </div>
    </div>
  );
}
