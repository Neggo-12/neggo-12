import { cn } from '@/lib/utils';

interface ScoreBadgeProps {
  score: number;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

function getScoreConfig(score: number) {
  if (score <= 550) {
    return {
      label: 'Riesgo Alto',
      priority: 'Baja',
      bg: 'bg-red-500/10',
      text: 'text-red-400',
      border: 'border-red-500/20',
      bar: 'bg-red-500',
      glow: 'shadow-red-500/20',
    };
  }
  if (score <= 700) {
    return {
      label: 'Riesgo Medio',
      priority: 'Media',
      bg: 'bg-amber-500/10',
      text: 'text-amber-400',
      border: 'border-amber-500/20',
      bar: 'bg-amber-500',
      glow: 'shadow-amber-500/20',
    };
  }
  if (score <= 850) {
    return {
      label: 'Cliente Viable',
      priority: 'Alta',
      bg: 'bg-emerald-500/10',
      text: 'text-emerald-400',
      border: 'border-emerald-500/20',
      bar: 'bg-emerald-500',
      glow: 'shadow-emerald-500/20',
    };
  }
  return {
    label: 'Perfil Premium',
    priority: 'Máxima',
    bg: 'bg-blue-500/10',
    text: 'text-blue-400',
    border: 'border-blue-500/20',
    bar: 'bg-blue-500',
    glow: 'shadow-blue-500/20',
  };
}

export default function ScoreBadge({ score, showLabel = true, size = 'md', className }: ScoreBadgeProps) {
  const config = getScoreConfig(score);
  const pct = ((score - 300) / 650) * 100;

  const sizes = {
    sm: { container: 'px-2 py-0.5', score: 'text-xs', label: 'text-[10px]' },
    md: { container: 'px-2.5 py-1', score: 'text-sm', label: 'text-xs' },
    lg: { container: 'px-3 py-1.5', score: 'text-base', label: 'text-sm' },
  };

  return (
    <div className={cn('flex flex-col gap-1', className)}>
      <div className="flex items-center gap-2">
        <div
          className={cn(
            'relative flex items-center justify-center rounded-lg border font-bold font-mono',
            config.bg,
            config.border,
            config.glow,
            sizes[size].container,
            sizes[size].score,
            config.text
          )}
        >
          {score}
        </div>
        {showLabel && (
          <div className="flex flex-col">
            <span className={cn('font-medium text-foreground', sizes[size].label)}>{config.label}</span>
            <span className={cn('text-muted-foreground', sizes[size].label)}>Prioridad: {config.priority}</span>
          </div>
        )}
      </div>
      {showLabel && (
        <div className="h-1 w-full overflow-hidden rounded-full bg-muted">
          <div
            className={cn('h-full rounded-full transition-all duration-500', config.bar)}
            style={{ width: `${pct}%` }}
          />
        </div>
      )}
    </div>
  );
}
