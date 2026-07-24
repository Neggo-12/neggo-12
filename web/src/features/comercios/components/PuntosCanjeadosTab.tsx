import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, Gift, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { fetchPuntosCanjesComercio, type PuntosCanjeRow } from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function CanjeRow({ canje }: { canje: PuntosCanjeRow }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
          <Gift className="h-4 w-4 text-amber-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{canje.clienteNombre ?? 'Cliente'}</p>
          <p className="text-[11px] text-muted-foreground">{formatFecha(canje.createdAt)}</p>
        </div>
      </div>
      <div className="flex items-center gap-4 shrink-0">
        <span className="font-mono text-sm font-semibold text-amber-400">{canje.puntos} pts</span>
        {canje.pagado ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[10px] font-semibold text-emerald-400">
            <CheckCircle2 className="h-3 w-3" /> Pagado
          </span>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 text-[10px] font-semibold text-amber-400">
            <Clock className="h-3 w-3" /> Pendiente de pago por Neggo
          </span>
        )}
      </div>
    </div>
  );
}

export default function PuntosCanjeadosTab({ organizationId }: { organizationId: string | null }) {
  const [canjes, setCanjes] = useState<PuntosCanjeRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadCanjes = useCallback(async () => {
    if (!isDbConfigured || !organizationId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchPuntosCanjesComercio(organizationId);
    if (fetchError) {
      setError(fetchError);
      setCanjes([]);
    } else {
      setCanjes(data ?? []);
    }
    setIsLoading(false);
  }, [organizationId]);

  useEffect(() => { loadCanjes(); }, [loadCanjes]);

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

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Cargando canjes de puntos...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar canjes</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={loadCanjes}>Reintentar</Button>
      </div>
    );
  }

  const pendientes = canjes.filter((c) => !c.pagado);
  const pagados = canjes.filter((c) => c.pagado);

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Puntos Canjeados</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Clientes que canjearon puntos del ecosistema en tu negocio — Neggo te paga el valor de cada canje
        </p>
      </div>

      {canjes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-4">
            <Gift className="h-6 w-6 text-amber-400" />
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Aún no has recibido canjes de puntos</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            Cuando un cliente del ecosistema canjee puntos en tu negocio, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-6">
          {pendientes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5" />
                Pendientes de pago ({pendientes.length})
              </h3>
              {pendientes.map((c) => (
                <CanjeRow key={c.id} canje={c} />
              ))}
            </div>
          )}

          {pagados.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5" />
                Pagados ({pagados.length})
              </h3>
              {pagados.map((c) => (
                <CanjeRow key={c.id} canje={c} />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
