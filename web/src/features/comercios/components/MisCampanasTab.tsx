import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import CrearCampanaComercioDialog from '@/features/comercios/components/CrearCampanaComercioDialog';
import CampanasListPanel from '@/features/shared/components/CampanasListPanel';
import { isDbConfigured } from '@/core/db/dbClient';

export default function MisCampanasTab({
  organizationId,
  creadoPor,
  comercioNombre,
}: {
  organizationId: string | null;
  creadoPor: string | null;
  comercioNombre: string;
}) {
  const [refreshKey, setRefreshKey] = useState(0);

  if (!isDbConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Base de datos no configurada</h3>
      </div>
    );
  }

  return (
    <div className="space-y-5 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold tracking-tight text-foreground">Mis Campañas</h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            Promociones y campañas segmentadas para clientes del ecosistema Neggo
          </p>
        </div>
        <CrearCampanaComercioDialog
          organizationId={organizationId}
          creadoPor={creadoPor}
          comercioNombre={comercioNombre}
          onCampanaCreated={() => setRefreshKey((k) => k + 1)}
        />
      </div>

      <CampanasListPanel organizationId={organizationId} refreshKey={refreshKey} />
    </div>
  );
}
