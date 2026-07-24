import { useState, useEffect, useCallback } from 'react';
import {
  FileText, Loader2, AlertTriangle, FileArchive, ExternalLink,
  Sparkles, Gift, ArrowUpRight, ArrowDownRight, Clock3,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { toast } from 'sonner';
import { cn, formatCOP } from '@/lib/utils';
import {
  fetchFacturasCliente,
  getFacturaSignedUrl,
  saldoPuntosCliente,
  fetchPuntosMovimientosCliente,
  fetchComerciosYConstructorasParaCanje,
  canjearPuntos,
  type FacturaClienteConOferta,
  type PuntosMovimientoRow,
  type ComercioParaCanjeRow,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';
import { useAuthStore } from '@/store/useAuthStore';

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ───── Invoice Row ─────

function FacturaRow({ factura }: { factura: FacturaClienteConOferta }) {
  const [isOpening, setIsOpening] = useState(false);

  const handleVerDocumento = useCallback(async () => {
    if (!factura.documento_url) return;
    setIsOpening(true);
    const { url } = await getFacturaSignedUrl(factura.documento_url);
    setIsOpening(false);
    if (url) window.open(url, '_blank', 'noopener,noreferrer');
  }, [factura.documento_url]);

  return (
    <TableRow className="border-border/30 hover:bg-card/40 transition-colors">
      <TableCell>
        <div className="flex items-center gap-2">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg border bg-secondary/60 border-border/40 text-[10px] font-bold text-muted-foreground">
            {(factura.ofertas_comercios?.comercio_nombre ?? '?').charAt(0)}
          </div>
          <p className="text-sm font-medium text-foreground">
            {factura.ofertas_comercios?.comercio_nombre ?? 'Comercio'}
          </p>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm font-semibold text-foreground">
        {formatCOP(factura.monto)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDate(factura.fecha_compra)}</TableCell>
      <TableCell>
        {factura.documento_url ? (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleVerDocumento}
            disabled={isOpening}
            className="h-7 text-xs gap-1.5"
          >
            <ExternalLink className="h-3 w-3" />
            {isOpening ? 'Abriendo...' : 'Ver documento'}
          </Button>
        ) : (
          <span className="text-[11px] text-muted-foreground/50 italic">Sin documento</span>
        )}
      </TableCell>
    </TableRow>
  );
}

// ───── Canjear Puntos Dialog ─────

function CanjearPuntosDialog({
  open,
  onOpenChange,
  saldoActual,
  onSuccess,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  saldoActual: number;
  onSuccess: () => void;
}) {
  const [comercios, setComercios] = useState<ComercioParaCanjeRow[]>([]);
  const [comercioId, setComercioId] = useState<string | null>(null);
  const [puntos, setPuntos] = useState('');
  const [step, setStep] = useState<'form' | 'confirm' | 'done'>('form');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      fetchComerciosYConstructorasParaCanje().then(({ data }) => setComercios(data ?? []));
    }
  }, [open]);

  const resetAndClose = useCallback(() => {
    setComercioId(null);
    setPuntos('');
    setStep('form');
    setError(null);
    onOpenChange(false);
  }, [onOpenChange]);

  const puntosNum = Number(puntos);
  const comercioSeleccionado = comercios.find((c) => c.id === comercioId) ?? null;
  const canContinuar =
    !!comercioId && puntos.trim() !== '' && !isNaN(puntosNum) && puntosNum > 0 && puntosNum <= saldoActual;

  const handleCanjear = useCallback(async () => {
    if (!comercioId || !canContinuar) return;
    setIsSubmitting(true);
    setError(null);
    const { error: canjeError } = await canjearPuntos(comercioId, puntosNum);
    setIsSubmitting(false);
    if (canjeError) {
      setError(canjeError);
      return;
    }
    setStep('done');
    onSuccess();
    setTimeout(resetAndClose, 1800);
  }, [comercioId, canContinuar, puntosNum, onSuccess, resetAndClose]);

  return (
    <Dialog open={open} onOpenChange={(o) => !o && resetAndClose()}>
      <DialogContent className="max-w-sm border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Gift className="h-5 w-5 text-amber-400" />
            Canjear puntos
          </DialogTitle>
          <DialogDescription className="text-sm">
            Tienes <span className="font-mono font-semibold text-foreground">{saldoActual}</span> puntos disponibles.
          </DialogDescription>
        </DialogHeader>

        {step === 'done' ? (
          <div className="flex flex-col items-center justify-center py-6 text-center animate-fade-in">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
              <Gift className="h-7 w-7 text-emerald-400" />
            </div>
            <p className="text-sm font-semibold text-foreground">Puntos canjeados</p>
            <p className="text-xs text-muted-foreground max-w-xs mt-1">
              {comercioSeleccionado?.name} recibió tu canje.
            </p>
          </div>
        ) : step === 'confirm' ? (
          <div className="space-y-4">
            <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <p className="text-sm text-foreground">
                ¿Confirmas canjear <span className="font-mono font-semibold">{puntosNum}</span> puntos en{' '}
                <span className="font-semibold">{comercioSeleccionado?.name}</span>?
              </p>
              <p className="text-xs text-muted-foreground mt-1.5">
                Se descuentan de tu saldo de inmediato. No se puede deshacer.
              </p>
            </div>
            {error && <p className="text-xs text-red-400">{error}</p>}
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={() => setStep('form')} disabled={isSubmitting}>
                Atrás
              </Button>
              <Button
                size="sm"
                className="flex-1 bg-amber-500 hover:bg-amber-400 text-background gap-1.5"
                onClick={handleCanjear}
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Gift className="h-3.5 w-3.5" />}
                Confirmar canje
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comercio o constructora</Label>
              <Select value={comercioId ?? ''} onValueChange={setComercioId}>
                <SelectTrigger className="h-10 text-sm">
                  <SelectValue placeholder="Selecciona dónde canjear..." />
                </SelectTrigger>
                <SelectContent>
                  {comercios.map((c) => (
                    <SelectItem key={c.id} value={c.id} className="text-sm">{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Puntos a canjear</Label>
              <Input
                type="number"
                value={puntos}
                onChange={(e) => setPuntos(e.target.value)}
                placeholder={`Máximo ${saldoActual}`}
                className="h-10 text-sm font-mono"
              />
              {puntos.trim() !== '' && puntosNum > saldoActual && (
                <p className="text-[11px] text-red-400">No tienes suficientes puntos.</p>
              )}
            </div>
            <Button
              disabled={!canContinuar}
              onClick={() => setStep('confirm')}
              className={cn(
                'w-full h-10 gap-2 text-sm font-semibold rounded-lg',
                canContinuar ? 'bg-amber-500 hover:bg-amber-400 text-background' : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              Continuar
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ───── Movimiento Row ─────

function MovimientoRow({ movimiento }: { movimiento: PuntosMovimientoRow }) {
  const esGanado = movimiento.tipo === 'ganado';
  const esVencido = movimiento.tipo === 'vencido';
  return (
    <div className="flex items-center justify-between gap-3 py-2.5 border-b border-border/20 last:border-0">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className={cn(
          'flex h-7 w-7 shrink-0 items-center justify-center rounded-lg',
          esGanado ? 'bg-emerald-500/10' : esVencido ? 'bg-muted' : 'bg-amber-500/10',
        )}>
          {esGanado ? (
            <ArrowUpRight className="h-3.5 w-3.5 text-emerald-400" />
          ) : esVencido ? (
            <Clock3 className="h-3.5 w-3.5 text-muted-foreground" />
          ) : (
            <ArrowDownRight className="h-3.5 w-3.5 text-amber-400" />
          )}
        </div>
        <div className="min-w-0">
          <p className="text-xs font-medium text-foreground truncate">
            {esGanado
              ? `Ganaste ${movimiento.puntos} puntos en ${movimiento.comercioNombre ?? 'un comercio'}`
              : esVencido
                ? `${Math.abs(movimiento.puntos)} puntos vencieron`
                : `Canjeaste ${Math.abs(movimiento.puntos)} puntos en ${movimiento.comercioNombre ?? 'un comercio'}`}
          </p>
          <p className="text-[10px] text-muted-foreground">{formatDate(movimiento.createdAt)}</p>
        </div>
      </div>
      <span className={cn(
        'font-mono text-xs font-semibold shrink-0',
        esGanado ? 'text-emerald-400' : esVencido ? 'text-muted-foreground' : 'text-amber-400',
      )}>
        {movimiento.puntos > 0 ? '+' : ''}{movimiento.puntos}
      </span>
    </div>
  );
}

// ───── Mis Puntos Section ─────

function MisPuntosSection({ clienteId }: { clienteId: string }) {
  const [saldo, setSaldo] = useState<number | null>(null);
  const [movimientos, setMovimientos] = useState<PuntosMovimientoRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [canjeOpen, setCanjeOpen] = useState(false);

  const loadPuntos = useCallback(async () => {
    setIsLoading(true);
    const [{ data: saldoData }, { data: movData }] = await Promise.all([
      saldoPuntosCliente(clienteId),
      fetchPuntosMovimientosCliente(clienteId),
    ]);
    setSaldo(saldoData ?? 0);
    setMovimientos(movData ?? []);
    setIsLoading(false);
  }, [clienteId]);

  useEffect(() => { void loadPuntos(); }, [loadPuntos]);

  return (
    <div className="rounded-2xl border border-amber-500/20 bg-card/60 overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-5 py-4 border-b border-border/40">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Sparkles className="h-4 w-4 text-amber-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground">Mis Puntos</h3>
            <p className="text-[11px] text-muted-foreground">Ganas puntos en cualquier aliado, los canjeas en cualquier otro</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="text-right">
            <p className="text-lg font-bold font-mono text-amber-400">{isLoading ? '—' : saldo ?? 0}</p>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Disponibles</p>
          </div>
          <Button
            size="sm"
            onClick={() => setCanjeOpen(true)}
            disabled={isLoading || !saldo}
            className="h-8 gap-1.5 bg-amber-500 hover:bg-amber-400 text-background text-xs font-semibold"
          >
            <Gift className="h-3.5 w-3.5" />
            Canjear puntos
          </Button>
        </div>
      </div>

      <div className="px-5 py-3">
        {isLoading ? (
          <div className="flex items-center gap-2 text-xs text-muted-foreground py-3">
            <Loader2 className="h-3.5 w-3.5 animate-spin" /> Cargando tu historial de puntos...
          </div>
        ) : movimientos.length === 0 ? (
          <p className="text-xs text-muted-foreground py-3">
            Aún no tienes movimientos de puntos — gánalos comprando con comercios aliados.
          </p>
        ) : (
          <div>
            {movimientos.map((m) => (
              <MovimientoRow key={m.id} movimiento={m} />
            ))}
          </div>
        )}
      </div>

      <CanjearPuntosDialog
        open={canjeOpen}
        onOpenChange={setCanjeOpen}
        saldoActual={saldo ?? 0}
        onSuccess={loadPuntos}
      />
    </div>
  );
}

// ───── Main Facturas View ─────

export default function FacturasView() {
  const session = useAuthStore((s) => s.session);
  const [facturas, setFacturas] = useState<FacturaClienteConOferta[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadFacturas = useCallback(async () => {
    if (!isDbConfigured || !session?.userId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchFacturasCliente(session.userId);
    if (fetchError) { setError(fetchError); setFacturas([]); } else { setFacturas(data ?? []); }
    setIsLoading(false);
  }, [session?.userId]);

  useEffect(() => { loadFacturas(); }, [loadFacturas]);

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
        <p className="text-sm font-medium text-muted-foreground">Cargando tu Bóveda...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar tu Bóveda</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={loadFacturas}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <FileText className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <div>
          <h2 className="text-base font-semibold text-foreground">Bóveda Digital de Facturas</h2>
          <p className="text-xs text-muted-foreground">
            Facturas reales registradas por comercios aliados cuando confirman tu compra
          </p>
        </div>
      </div>

      {session?.userId && <MisPuntosSection clienteId={session.userId} />}

      {facturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <FileArchive className="h-6 w-6 text-blue-400" />
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Aún no tienes facturas</h4>
          <p className="text-xs text-muted-foreground max-w-sm">
            Cuando aceptes una oferta y confirmes tu compra con el comercio, la factura aparecerá aquí automáticamente.
          </p>
        </div>
      ) : (
        <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
            <div className="flex items-center gap-2">
              <FileArchive className="h-4 w-4 text-muted-foreground" />
              <h3 className="text-sm font-semibold text-foreground">Historial de Facturas</h3>
            </div>
            <Badge className="bg-card/60 text-muted-foreground border-border/40 text-[10px] px-2 py-0.5">
              {facturas.length} documento{facturas.length === 1 ? '' : 's'}
            </Badge>
          </div>

          <div className="overflow-x-auto scrollbar-thin">
            <Table>
              <TableHeader>
                <TableRow className="border-border/30 hover:bg-transparent">
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Establecimiento
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Monto COP
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Fecha de compra
                  </TableHead>
                  <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                    Documento
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {facturas.map((f) => (
                  <FacturaRow key={f.id} factura={f} />
                ))}
              </TableBody>
            </Table>
          </div>
        </div>
      )}
    </div>
  );
}
