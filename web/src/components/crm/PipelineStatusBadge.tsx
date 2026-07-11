import { cn } from '@/lib/utils';
import type { MeInteresaPipelineEstado } from '@/core/db/repositories';
import { PIPELINE_CONFIG } from './pipelineConfig';

export default function PipelineStatusBadge({ estado }: { estado: MeInteresaPipelineEstado }) {
  const cfg = PIPELINE_CONFIG[estado];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium', cfg.bg, cfg.text, cfg.border)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.text.replace('text-', 'bg-'))} />
      {cfg.label}
    </span>
  );
}
