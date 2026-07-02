import { BarChart3, Loader2, AlertTriangle } from 'lucide-react';
import { isDbConfigured } from '@/core/db/dbClient';

export default function AnalyticsTab({ bankName }: { bankName: string }) {
  // ───── DB not configured empty state ─────
  if (!isDbConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Base de datos no configurada</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Configura las variables de entorno de Supabase para ver analíticas en tiempo real.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-border/40 bg-card/40 animate-fade-in">
      <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-5">
        <BarChart3 className="h-8 w-8 text-blue-400" />
      </div>
      <h3 className="text-base font-semibold text-foreground mb-2">Analítica en construcción</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        {bankName
          ? `El panel de analíticas para ${bankName} se habilitará cuando haya suficientes datos de solicitudes y campañas.`
          : 'El panel de analíticas se habilitará cuando haya suficientes datos de solicitudes y campañas.'}
      </p>
      <p className="text-xs text-muted-foreground mt-3">
        Las métricas se calculan automáticamente desde la base de datos de producción.
      </p>
    </div>
  );
}
