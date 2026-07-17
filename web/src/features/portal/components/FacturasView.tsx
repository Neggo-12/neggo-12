import { useState, useEffect, useCallback } from 'react';
import { FileText, Loader2, AlertTriangle, FileArchive, ExternalLink } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { fetchFacturasCliente, getFacturaSignedUrl, type FacturaClienteConOferta } from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';
import { useAuthStore } from '@/store/useAuthStore';
import { formatCOP } from '@/lib/utils';

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
