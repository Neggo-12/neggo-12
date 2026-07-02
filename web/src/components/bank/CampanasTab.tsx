import { Megaphone, Loader2, AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import CrearCampanaDialog from '@/components/bank/CrearCampanaDialog';
import { isDbConfigured } from '@/core/db/dbClient';

export default function CampanasTab({ bankName }: { bankName: string }) {
  // ───── DB not configured empty state ─────
  if (!isDbConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Base de datos no configurada</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Configura <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> y{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> para gestionar campañas reales.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Header with CTA */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold text-foreground">Centro de Campañas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {bankName ? `Campañas de ${bankName}` : 'Gestiona tus campañas bancarias'}
          </p>
        </div>
        <CrearCampanaDialog />
      </div>

      {/* Empty State — real data not yet available */}
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-border/40 bg-card/40 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
          <Megaphone className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">No hay campañas activas en este momento</h3>
        <p className="text-sm text-muted-foreground max-w-md mb-6">
          Crea tu primera campaña para empezar a recibir leads calificados de clientes que buscan productos financieros.
        </p>
        <CrearCampanaDialog />
      </div>
    </div>
  );
}
