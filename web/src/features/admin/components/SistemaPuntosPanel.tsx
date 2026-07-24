import { useState, useEffect, useCallback, useMemo } from 'react';
import { Coins, TrendingUp, TrendingDown, Clock, Gift, Loader2, AlertTriangle, CheckCircle2, Percent } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { cn, formatCOP } from '@/lib/utils';
import KPICard from '@/components/KPICard';
import { useAuthStore } from '@/store/useAuthStore';
import {
  fetchPuntosMovimientosAdmin,
  fetchPuntosCanjesAdmin,
  fetchPuntosTasasVigentesAdmin,
  insertPuntosLiquidacion,
  type PuntosCanjeAdminRow,
  type PuntosTasaComercioAdminRow,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatPeriodo(periodo: string): string {
  const [year, month] = periodo.split('-');
  const fecha = new Date(Number(year), Number(month) - 1, 1);
  return fecha.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

export default function SistemaPuntosPanel() {
  const session = useAuthStore((s) => s.session);

  const [totalEmitido, setTotalEmitido] = useState(0);
  const [totalCanjeado, setTotalCanjeado] = useState(0);
  const [enCirculacion, setEnCirculacion] = useState(0);
  const [canjes, setCanjes] = useState<PuntosCanjeAdminRow[]>([]);
  const [tasas, setTasas] = useState<PuntosTasaComercioAdminRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [pagandoCanje, setPagandoCanje] = useState<PuntosCanjeAdminRow | null>(null);
  const [monto, setMonto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const load = useCallback(async () => {
    if (!isDbConfigured) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const [movimientosRes, canjesRes, tasasRes] = await Promise.all([
      fetchPuntosMovimientosAdmin(),
      fetchPuntosCanjesAdmin(),
      fetchPuntosTasasVigentesAdmin(),
    ]);
    if (movimientosRes.error || canjesRes.error || tasasRes.error) {
      setError(movimientosRes.error ?? canjesRes.error ?? tasasRes.error);
      setIsLoading(false);
      return;
    }
    const movimientos = movimientosRes.data ?? [];
    let emitido = 0;
    let canjeado = 0;
    let circulacion = 0;
    for (const m of movimientos) {
      circulacion += m.puntos;
      if (m.tipo === 'ganado') emitido += m.puntos;
      if (m.tipo === 'canjeado') canjeado += Math.abs(m.puntos);
    }
    setTotalEmitido(emitido);
    setTotalCanjeado(canjeado);
    setEnCirculacion(circulacion);
    setCanjes(canjesRes.data ?? []);
    setTasas(tasasRes.data ?? []);
    setIsLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const pendientes = useMemo(() => canjes.filter((c) => !c.pagado), [canjes]);
  const totalPendientePuntos = useMemo(() => pendientes.reduce((sum, c) => sum + c.puntos, 0), [pendientes]);

  const montoNum = Number(monto);
  const canSubmit = !!pagandoCanje && monto.trim() !== '' && !isNaN(montoNum) && montoNum > 0 && !isSubmitting;

  const handleConfirmarPago = useCallback(async () => {
    if (!canSubmit || !pagandoCanje || !session?.userId) return;
    setIsSubmitting(true);
    const { error: insertError } = await insertPuntosLiquidacion({
      comercioOrganizationId: pagandoCanje.comercioOrganizationId,
      puntosMovimientoId: pagandoCanje.id,
      montoPagado: montoNum,
      pagadoPor: session.userId,
    });
    setIsSubmitting(false);
    if (insertError) {
      toast.error('No se pudo registrar el pago', { description: insertError });
      return;
    }
    toast.success('Canje marcado como pagado');
    setPagandoCanje(null);
    setMonto('');
    await load();
  }, [canSubmit, pagandoCanje, session?.userId, montoNum, load]);

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
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar Sistema de Puntos</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Sistema de Puntos</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Moneda interoperable del ecosistema — emisión, canje y liquidación a comercios/constructoras
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KPICard title="Puntos en Circulación" value={enCirculacion.toLocaleString('es-CO')} icon={Coins} gradient="amber" />
        <KPICard title="Emitido Histórico" value={totalEmitido.toLocaleString('es-CO')} icon={TrendingUp} gradient="emerald" />
        <KPICard title="Canjeado Histórico" value={totalCanjeado.toLocaleString('es-CO')} icon={TrendingDown} gradient="blue" />
        <KPICard title="Pendiente de Liquidar" value={totalPendientePuntos.toLocaleString('es-CO')} icon={Clock} gradient="red" />
      </div>

      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 bg-card/60 flex items-center gap-2">
          <Gift className="h-4 w-4 text-amber-400" />
          <h3 className="text-sm font-semibold text-foreground">Canjes pendientes de pago ({pendientes.length})</h3>
        </div>
        {pendientes.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No hay canjes pendientes de liquidar.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-card/60">
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Comercio</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Cliente</th>
                  <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Puntos</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                  <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {pendientes.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-2.5 text-xs font-medium text-foreground truncate max-w-[200px]" title={c.comercioNombre ?? undefined}>{c.comercioNombre ?? '—'}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground truncate max-w-[200px]" title={c.clienteNombre ?? undefined}>{c.clienteNombre ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs font-semibold text-amber-400">{c.puntos.toLocaleString('es-CO')}</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground">{formatFecha(c.createdAt)}</td>
                    <td className="px-4 py-2.5 text-right">
                      <Button
                        size="sm"
                        onClick={() => { setPagandoCanje(c); setMonto(''); }}
                        className="h-7 text-[10px] gap-1 bg-emerald-600 hover:bg-emerald-500"
                      >
                        Marcar como pagado
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <div className="px-4 py-3 border-b border-border/40 bg-card/60 flex items-center gap-2">
          <Percent className="h-4 w-4 text-purple-400" />
          <h3 className="text-sm font-semibold text-foreground">Tasas configuradas por comercio</h3>
        </div>
        {tasas.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">Ningún comercio tiene una tasa configurada — todos usan el default (1pt/$1.000).</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-card/60">
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Comercio</th>
                  <th className="px-4 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Tasa</th>
                  <th className="px-4 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vigente desde</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {tasas.map((t) => (
                  <tr key={t.comercioOrganizationId}>
                    <td className="px-4 py-2.5 text-xs font-medium text-foreground truncate max-w-[240px]" title={t.comercioNombre ?? undefined}>{t.comercioNombre ?? '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-xs text-foreground">{t.puntosPor1000} pt/$1.000</td>
                    <td className="px-4 py-2.5 text-xs text-muted-foreground capitalize">{formatPeriodo(t.periodoVigenteDesde)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={!!pagandoCanje} onOpenChange={(open) => { if (!open) setPagandoCanje(null); }}>
        <DialogContent className="max-w-md border-border/60 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
              Marcar canje como pagado
            </DialogTitle>
            <DialogDescription className="text-sm pt-2 text-foreground">
              {pagandoCanje && (
                <>
                  Canje de <span className="font-mono font-semibold">{pagandoCanje.puntos.toLocaleString('es-CO')} pts</span> a{' '}
                  <span className="font-semibold">{pagandoCanje.comercioNombre ?? 'este comercio'}</span>.
                  <br />
                  <span className="text-xs text-muted-foreground">
                    El valor de conversión punto→peso aún no está definido (docs/sistema-puntos-neggo.md) — ingresa el monto pagado manualmente.
                  </span>
                </>
              )}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Monto pagado (COP)</Label>
            <Input type="number" value={monto} onChange={(e) => setMonto(e.target.value)} className="h-9 text-sm font-mono" placeholder="50000" />
            {monto.trim() !== '' && !isNaN(montoNum) && montoNum > 0 && (
              <p className="text-[11px] text-muted-foreground">{formatCOP(montoNum)}</p>
            )}
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setPagandoCanje(null)} disabled={isSubmitting}>Cancelar</Button>
            <Button
              size="sm"
              onClick={handleConfirmarPago}
              disabled={!canSubmit}
              className="bg-emerald-600 hover:bg-emerald-500 text-white gap-1.5"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
              Confirmar pago
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
