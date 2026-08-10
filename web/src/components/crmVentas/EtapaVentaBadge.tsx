import { cn } from '@/lib/utils';
import type { CrmVentasEtapa } from '@/core/db/repositories';
import { ETAPA_VENTA_CONFIG } from './etapaVentaConfig';

/** Badge de Etapa para CRM Ventas — mismo patrón visual que PipelineStatusBadge (crm/), pero
 * mostrando el texto completo (`fullLabel`) para que la etapa post-envío quede clarísima de
 * un vistazo (sección 4 del spec: "En seguimiento — esperando respuesta"). */
export default function EtapaVentaBadge({ etapa, compact = false }: { etapa: CrmVentasEtapa; compact?: boolean }) {
  const cfg = ETAPA_VENTA_CONFIG[etapa];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium whitespace-nowrap', cfg.bg, cfg.text, cfg.border)}>
      <span className={cn('h-1.5 w-1.5 shrink-0 rounded-full', cfg.text.replace('text-', 'bg-'))} />
      {compact ? cfg.label : cfg.fullLabel}
    </span>
  );
}
