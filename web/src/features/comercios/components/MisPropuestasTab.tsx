import { useState, useEffect, useCallback } from 'react';
import { Send, Loader2, AlertTriangle, Clock, CheckCircle2, XCircle, Receipt } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { cn, formatCOP } from '@/lib/utils';
import { toast } from 'sonner';
import {
  fetchOfertasComercios,
  fetchFacturasPorOfertas,
  registrarCompraOferta,
  type OfertaComercioRow,
  type FacturaClienteRow,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';

const ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string; border: string; icon: typeof Clock }> = {
  pendiente: { label: 'Pendiente de respuesta', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', icon: Clock },
  aceptada: { label: 'Aceptada', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', icon: CheckCircle2 },
  rechazada: { label: 'Rechazada', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', icon: XCircle },
};

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function PropuestaRow({
  oferta,
  comercioId,
  factura,
  onRegistrarVenta,
}: {
  oferta: OfertaComercioRow;
  comercioId: string;
  factura?: FacturaClienteRow;
  onRegistrarVenta: (ofertaId: string, monto: number, fechaCompra: string, file?: File) => Promise<void>;
}) {
  const cfg = ESTADO_CONFIG[oferta.estado] ?? ESTADO_CONFIG.pendiente;
  const Icon = cfg.icon;
  const [isRegistering, setIsRegistering] = useState(false);
  const [monto, setMonto] = useState('');
  const [fechaCompra, setFechaCompra] = useState('');
  const [file, setFile] = useState<File | undefined>(undefined);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = useCallback(async () => {
    const montoNum = Number(monto);
    if (!montoNum || montoNum <= 0 || !fechaCompra) return;
    setIsSubmitting(true);
    await onRegistrarVenta(oferta.id, montoNum, fechaCompra, file);
    setIsSubmitting(false);
    setIsRegistering(false);
    setMonto('');
    setFechaCompra('');
    setFile(undefined);
  }, [oferta.id, monto, fechaCompra, file, onRegistrarVenta]);

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-2">
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

      {factura ? (
        <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-2">
          <p className="text-[11px] text-emerald-400 font-medium">
            Venta registrada: {formatCOP(factura.monto)} el {formatFecha(factura.fecha_compra)}
          </p>
        </div>
      ) : oferta.estado === 'aceptada' && (
        !isRegistering ? (
          <button
            onClick={() => setIsRegistering(true)}
            className="mt-2 flex items-center gap-1.5 rounded-lg border border-emerald-500/20 bg-emerald-500/5 px-3 py-1.5 text-[11px] font-medium text-emerald-400 hover:bg-emerald-500/10 transition-all cursor-pointer"
          >
            <Receipt className="h-3.5 w-3.5" />
            Registrar venta y factura
          </button>
        ) : (
          <div className="mt-2 space-y-2 rounded-lg border border-border/30 bg-card/60 p-3">
            <div className="grid grid-cols-2 gap-2">
              <Input
                type="number"
                placeholder="Monto COP"
                value={monto}
                onChange={(e) => setMonto(e.target.value)}
                className="h-8 text-xs"
              />
              <Input
                type="date"
                value={fechaCompra}
                onChange={(e) => setFechaCompra(e.target.value)}
                className="h-8 text-xs"
              />
            </div>
            <Input
              type="file"
              accept="application/pdf,image/*"
              onChange={(e) => setFile(e.target.files?.[0])}
              className="h-8 text-xs"
            />
            <div className="flex items-center gap-2">
              <Button
                size="sm"
                onClick={handleSubmit}
                disabled={isSubmitting || !monto || !fechaCompra}
                className="flex-1 h-8 text-xs bg-emerald-600 hover:bg-emerald-500"
              >
                {isSubmitting ? 'Guardando...' : 'Confirmar'}
              </Button>
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setIsRegistering(false)}
                className="flex-1 h-8 text-xs"
              >
                Cancelar
              </Button>
            </div>
          </div>
        )
      )}
    </div>
  );
}

export default function MisPropuestasTab({ comercioId }: { comercioId: string | null }) {
  const [ofertas, setOfertas] = useState<OfertaComercioRow[]>([]);
  const [facturas, setFacturas] = useState<FacturaClienteRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadOfertas = useCallback(async () => {
    if (!isDbConfigured || !comercioId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchOfertasComercios(comercioId);
    if (fetchError) {
      setError(fetchError);
      setOfertas([]);
      setIsLoading(false);
      return;
    }
    const ofertasData = data ?? [];
    setOfertas(ofertasData);

    const { data: facturasData, error: facturasError } = await fetchFacturasPorOfertas(
      ofertasData.map((o) => o.id),
    );
    if (facturasError) {
      toast.error('No se pudieron cargar las ventas registradas', { description: facturasError });
    } else {
      setFacturas(facturasData ?? []);
    }
    setIsLoading(false);
  }, [comercioId]);

  useEffect(() => { loadOfertas(); }, [loadOfertas]);

  const handleRegistrarVenta = useCallback(async (ofertaId: string, monto: number, fechaCompra: string, file?: File) => {
    if (!comercioId) return;
    const { error } = await registrarCompraOferta(ofertaId, comercioId, monto, fechaCompra, file);
    if (error) {
      toast.error('No se pudo registrar la venta', { description: error });
    } else {
      toast.success('Venta registrada', { description: 'La meta del cliente fue marcada como completada.' });
      await loadOfertas();
    }
  }, [comercioId, loadOfertas]);

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

  const facturaByOfertaId = new Map(facturas.map((f) => [f.oferta_id, f]));
  const pendientesGestion = ofertas.filter(
    (o) => (o.estado === 'pendiente' || o.estado === 'aceptada') && !facturaByOfertaId.has(o.id),
  );
  const ventasExitosas = ofertas.filter((o) => facturaByOfertaId.has(o.id));
  const rechazadas = ofertas.filter((o) => o.estado === 'rechazada');

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
        <div className="space-y-6">
          {pendientesGestion.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Pendientes de gestión ({pendientesGestion.length})
              </h3>
              {pendientesGestion.map((oferta) => (
                <PropuestaRow
                  key={oferta.id}
                  oferta={oferta}
                  comercioId={comercioId ?? ''}
                  onRegistrarVenta={handleRegistrarVenta}
                />
              ))}
            </div>
          )}

          {ventasExitosas.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                Ventas Exitosas ({ventasExitosas.length})
              </h3>
              {ventasExitosas.map((oferta) => (
                <PropuestaRow
                  key={oferta.id}
                  oferta={oferta}
                  comercioId={comercioId ?? ''}
                  factura={facturaByOfertaId.get(oferta.id)}
                  onRegistrarVenta={handleRegistrarVenta}
                />
              ))}
            </div>
          )}

          {rechazadas.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
                Rechazadas ({rechazadas.length})
              </h3>
              {rechazadas.map((oferta) => (
                <PropuestaRow
                  key={oferta.id}
                  oferta={oferta}
                  comercioId={comercioId ?? ''}
                  onRegistrarVenta={handleRegistrarVenta}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
