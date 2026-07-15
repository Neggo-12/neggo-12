import { useState, useEffect, useCallback } from 'react';
import { HeartPulse, Loader2, AlertTriangle, AlertOctagon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { fetchFallosApp, type FalloAppRow } from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function SaludSistemaPanel() {
  const [fallos, setFallos] = useState<FalloAppRow[]>([]);
  const [count24h, setCount24h] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isDbConfigured) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const { data, count24h: count, error: fetchError } = await fetchFallosApp();
    if (fetchError) { setError(fetchError); } else { setFallos(data ?? []); setCount24h(count); }
    setIsLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

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
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar Salud del Sistema</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
            <HeartPulse className="h-5 w-5 text-red-400" />
            Salud del Sistema
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Fallos de escrituras críticas (RPCs de dinero/registro, solicitudes) — últimos 50
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-xl border border-border/40 bg-card/60 px-4 py-2">
          <AlertOctagon className={count24h > 0 ? 'h-4 w-4 text-red-400' : 'h-4 w-4 text-muted-foreground'} />
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Últimas 24h</p>
            <p className="text-lg font-bold font-mono text-foreground">{count24h}</p>
          </div>
        </div>
      </div>

      {fallos.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
          <HeartPulse className="h-8 w-8 text-emerald-400 mb-3" />
          <h4 className="text-sm font-semibold text-foreground mb-1">Sin fallos registrados</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            Ningún fallo de escritura crítica se ha registrado todavía.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden">
          <div className="overflow-x-auto scrollbar-thin">
            <table className="w-full text-xs">
              <thead>
                <tr className="text-left text-muted-foreground border-b border-border/40">
                  <th className="px-4 py-3 font-medium">Contexto</th>
                  <th className="px-4 py-3 font-medium">Mensaje</th>
                  <th className="px-4 py-3 font-medium">Usuario</th>
                  <th className="px-4 py-3 font-medium">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20">
                {fallos.map((f) => (
                  <tr key={f.id}>
                    <td className="px-4 py-3">
                      <Badge className="bg-red-500/10 text-red-400 border-red-500/20 text-[10px] font-mono">
                        {f.contexto}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-foreground max-w-md">{f.mensaje}</td>
                    <td className="px-4 py-3 text-muted-foreground font-mono">{f.user_id ?? '—'}</td>
                    <td className="px-4 py-3 text-muted-foreground">{formatFecha(f.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
