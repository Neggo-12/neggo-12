import { useState } from 'react';
import { AlertTriangle, Megaphone } from 'lucide-react';
import CrearCampanaDialog from '@/components/bank/CrearCampanaDialog';
import SolicitudesTab from '@/components/bank/SolicitudesTab';
import CampanasListPanel from '@/features/shared/components/CampanasListPanel';
import { isDbConfigured } from '@/core/db/dbClient';
import type { CampanaAdminRow } from '@/core/db/repositories';

export default function CampanasTab({ bankName, organizationId }: { bankName: string; organizationId: string | null }) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [selectedCampana, setSelectedCampana] = useState<CampanaAdminRow | null>(null);

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
        <CrearCampanaDialog onCampanaCreated={() => setRefreshKey((k) => k + 1)} />
      </div>

      <CampanasListPanel
        organizationId={organizationId}
        refreshKey={refreshKey}
        selectedCampanaId={selectedCampana?.id ?? null}
        onSelectCampana={(campana) => setSelectedCampana((prev) => (prev?.id === campana.id ? null : campana))}
      />

      {selectedCampana ? (
        <SolicitudesTab
          organizationName={bankName}
          organizationId={organizationId}
          campanaIdFilter={selectedCampana.id}
          campanaNombre={selectedCampana.titulo}
        />
      ) : (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-dashed border-border/50 bg-card/30">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <Megaphone className="h-6 w-6 text-blue-400" />
          </div>
          <p className="text-sm font-semibold text-foreground mb-1">Selecciona una campaña para ver sus leads</p>
          <p className="text-xs text-muted-foreground max-w-sm">
            Haz clic en una campaña arriba para ver su mini-CRM: leads, código de verificación y gestión de pipeline.
          </p>
        </div>
      )}
    </div>
  );
}
