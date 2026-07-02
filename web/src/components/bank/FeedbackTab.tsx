import { MessageSquare, AlertTriangle } from 'lucide-react';
import { isDbConfigured } from '@/core/db/dbClient';

export default function FeedbackTab({ bankName }: { bankName: string }) {
  // ───── DB not configured empty state ─────
  if (!isDbConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Base de datos no configurada</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Configura Supabase para recibir feedback real de tus clientes.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-border/40 bg-card/40 animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
        <MessageSquare className="h-8 w-8 text-emerald-400" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">Sin feedback de clientes aún</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {bankName
          ? `Cuando los clientes envíen feedback dirigido a ${bankName}, aparecerá aquí automáticamente.`
          : 'Cuando los clientes envíen feedback, aparecerá aquí automáticamente.'}
      </p>
    </div>
  );
}
