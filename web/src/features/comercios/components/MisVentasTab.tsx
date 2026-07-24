import { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangle, ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { formatCOP } from '@/lib/utils';
import { fetchVentasComercio, type VentaComercioRow } from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function VentaRow({ venta }: { venta: VentaComercioRow }) {
  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4 flex items-center justify-between gap-3">
      <div className="flex items-center gap-3 min-w-0">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <ShoppingBag className="h-4 w-4 text-emerald-400" />
        </div>
        <div className="min-w-0">
          <p className="text-sm font-medium text-foreground truncate">{venta.clienteNombre ?? 'Cliente'}</p>
          <p className="text-[11px] text-muted-foreground truncate">
            {venta.categoria}{venta.subcategoria ? ` — ${venta.subcategoria}` : ''} · {formatFecha(venta.fechaCompra)}
          </p>
        </div>
      </div>
      <span className="font-mono text-sm font-semibold text-emerald-400 shrink-0">{formatCOP(venta.monto)}</span>
    </div>
  );
}

export default function MisVentasTab({ comercioId }: { comercioId: string | null }) {
  const [ventas, setVentas] = useState<VentaComercioRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadVentas = useCallback(async () => {
    if (!isDbConfigured || !comercioId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchVentasComercio(comercioId);
    if (fetchError) {
      setError(fetchError);
      setVentas([]);
    } else {
      setVentas(data ?? []);
    }
    setIsLoading(false);
  }, [comercioId]);

  useEffect(() => { void loadVentas(); }, [loadVentas]);

  if (!isDbConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <AlertTriangle className="h-8 w-8 text-amber-400 mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-2">Base de datos no configurada</h3>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar Mis Ventas</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={loadVentas}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Mis Ventas</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Compras que tus clientes confirmaron en la Bóveda — historial completo, sin acción de pago aquí
        </p>
      </div>

      {ventas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
            <ShoppingBag className="h-6 w-6 text-emerald-400" />
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Aún no tienes ventas registradas</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            Cuando confirmes una compra sobre una oferta aceptada, aparecerá aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ventas.map((v) => (
            <VentaRow key={v.id} venta={v} />
          ))}
        </div>
      )}
    </div>
  );
}
