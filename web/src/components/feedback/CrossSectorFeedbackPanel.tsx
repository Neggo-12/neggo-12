import { MessageSquare } from 'lucide-react';
import type { FeedbackDestinatario } from '@/types';

interface CrossSectorFeedbackPanelProps {
  /** Filters feedback for this specific entity type */
  entityType: FeedbackDestinatario;
  /** Optional: further filter by specific entity name */
  entityName?: string;
  /** Organization ID for multi-tenant isolation — reserved for future DB-backed feedback */
  organizationId?: string | null;
}

/**
 * Sin backend real de feedback todavía (no existe tabla ni endpoint) — muestra
 * un estado vacío honesto en vez de datos de ejemplo, para no aparentar
 * actividad de clientes que nunca existió.
 */
export default function CrossSectorFeedbackPanel({ entityName }: CrossSectorFeedbackPanelProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-border/40 bg-card/40">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted mb-5">
        <MessageSquare className="h-8 w-8 text-muted-foreground/50" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">Aún no hay feedback registrado</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {entityName ? `Para ${entityName}. ` : ''}
        Cuando un cliente deje una calificación o comentario, aparecerá aquí automáticamente.
      </p>
    </div>
  );
}
