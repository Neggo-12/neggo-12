import { useState, useEffect, useCallback } from 'react';
import { Send, Loader2, AlertTriangle, Clock, CheckCircle2, XCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { fetchOfertasComercios, type OfertaComercioRow } from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';

const ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: typeof Clock }> = {
  pendiente: { label: 'Pendiente de respuesta', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Clock },
  aceptada: { label: 'Aceptada', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: CheckCircle2 },
  rechazada: { label: 'Rechazada', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: XCircle },
};

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

export default function MisPropuestasTab({ comercioId }: { comercioId: string | null }) {
  const [ofertas, setOfertas] = useState<OfertaComercioRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOfertas = useCallback(async () => {
    if (!isDbConfigured || !comercioId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchOfertasComercios(comercioId);
    if (fetchError) { setError(fetchError); setOfertas([]); } else { setOfertas(data ?? []); }
    setIsLoading(false);
  }, [comercioId]);

  useEffect(() => { loadOfertas(); }, [loadOfertas]);

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
        <p className="text-sm font-medium text-muted-foreground">Cargando tus propuestas...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar tus propuestas</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={loadOfertas}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Mis Propuestas</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Propuestas que has enviado a metas de clientes y su estado real
        </p>
      </div>

      {ofertas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <Send className="h-6 w-6 text-blue-400" />
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Aún no has enviado propuestas</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            Ve a "Oportunidades IFC" para enviar tu primera propuesta a una meta de un cliente.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {ofertas.map((oferta) => {
            const cfg = ESTADO_CONFIG[oferta.estado] ?? ESTADO_CONFIG.pendiente;
            const Icon = cfg.icon;
            return (
              <div key={oferta.id} className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-2">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-foreground">{oferta.beneficio}</p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      Meta {oferta.meta_id} · Enviada {formatFecha(oferta.created_at)}
                    </p>
                  </div>
                  <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium shrink-0', cfg.bg, cfg.text, cfg.border)}>
                    <Icon className="h-2.5 w-2.5" />
                    {cfg.label}
                  </span>
                </div>

                {oferta.descripcion && (
                  <p className="text-xs text-muted-foreground">{oferta.descripcion}</p>
                )}

                {oferta.estado === 'rechazada' && oferta.respondida_at && (
                  <p className="text-[10px] text-muted-foreground">
                    Respondida {formatFecha(oferta.respondida_at)}
                    {oferta.motivo_rechazo && ` — "${oferta.motivo_rechazo}"`}
                  </p>
                )}
                {oferta.estado === 'aceptada' && oferta.respondida_at && (
                  <p className="text-[10px] text-emerald-400/80">
                    Aceptada {formatFecha(oferta.respondida_at)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
