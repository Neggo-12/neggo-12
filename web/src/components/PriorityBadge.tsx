import { cn } from '@/lib/utils';
import type { Priority } from '@/types';

const priorityConfig: Record<Priority, { label: string; bg: string; text: string; border: string; glow: string }> = {
  baja: { label: 'Baja', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', glow: '' },
  media: { label: 'Media', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', glow: '' },
  alta: { label: 'Alta', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/20' },
  maxima: { label: 'Máxima', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', glow: 'shadow-red-500/20' },
};

export default function PriorityBadge({ priority }: { priority: Priority }) {
  const cfg = priorityConfig[priority];
  return (
    <span className={cn('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold', cfg.bg, cfg.text, cfg.border, cfg.glow)}>
      {cfg.label}
    </span>
  );
}
