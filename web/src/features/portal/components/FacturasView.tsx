import { useState, useCallback } from 'react';
import {
  FileText, Upload, Shield, CheckCircle2, Clock,
  AlertCircle, Download, ExternalLink, Zap,
  Building2, FileArchive, Sparkles,
} from 'lucide-react';
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
import { usePortalStore } from '@/features/portal/store/usePortalStore';
import { MOCK_INVOICES } from '@/features/portal/data/mock';
import { cn } from '@/lib/utils';
import type { Invoice } from '@/types';

// ───── Status badge config ─────

const STATUS_CONFIG: Record<string, { icon: React.ReactNode; className: string }> = {
  'Procesado ✓': {
    icon: <CheckCircle2 className="h-3 w-3" />,
    className: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  },
  'Pendiente': {
    icon: <Clock className="h-3 w-3" />,
    className: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
  },
  'Rechazado': {
    icon: <AlertCircle className="h-3 w-3" />,
    className: 'bg-red-500/10 text-red-400 border-red-500/20',
  },
};

function formatCOP(value: number): string {
  return `$${value.toLocaleString('es-CO')} COP`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

// ───── Invoice Row ─────

function InvoiceRow({ invoice }: { invoice: Invoice }) {
  const statusCfg = STATUS_CONFIG[invoice.status] ?? STATUS_CONFIG['Pendiente'];

  return (
    <TableRow className="border-border/30 hover:bg-card/40 transition-colors">
      <TableCell className="font-mono text-xs text-muted-foreground">{invoice.document}</TableCell>
      <TableCell>
        <div className="flex items-center gap-2">
          <div className={cn(
            'flex h-7 w-7 items-center justify-center rounded-lg border text-[10px] font-bold',
            invoice.trustSeal
              ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              : 'bg-secondary/60 border-border/40 text-muted-foreground',
          )}>
            {invoice.commerce.charAt(0)}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{invoice.commerce}</p>
            {invoice.trustSeal && (
              <span className="flex items-center gap-1 text-[10px] text-emerald-400/70">
                <Shield className="h-2.5 w-2.5" />
                Sello de Confianza
              </span>
            )}
          </div>
        </div>
      </TableCell>
      <TableCell className="font-mono text-sm font-semibold text-foreground">
        {formatCOP(invoice.amount)}
      </TableCell>
      <TableCell className="text-xs text-muted-foreground">{formatDate(invoice.date)}</TableCell>
      <TableCell>
        <Badge className={cn('text-[10px] font-medium gap-1 px-2 py-0.5 rounded-full', statusCfg.className)}>
          {statusCfg.icon}
          {invoice.status}
        </Badge>
      </TableCell>
    </TableRow>
  );
}

// ───── Upload Dropzone ─────

function UploadDropzone() {
  const [isDragging, setIsDragging] = useState(false);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  return (
    <button
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={cn(
        'w-full rounded-2xl border-2 border-dashed p-8 text-center transition-all duration-300 cursor-pointer',
        isDragging
          ? 'border-cyan-400/60 bg-cyan-500/10 scale-[1.01]'
          : 'border-border/50 bg-card/40 hover:border-border/70 hover:bg-card/60',
      )}
    >
      <div className="flex flex-col items-center gap-3">
        <div
          className={cn(
            'flex h-14 w-14 items-center justify-center rounded-2xl border transition-colors',
            isDragging
              ? 'bg-cyan-500/20 border-cyan-500/30'
              : 'bg-card/60 border-border/40',
          )}
        >
          <Upload className={cn('h-6 w-6', isDragging ? 'text-cyan-400' : 'text-muted-foreground')} />
        </div>
        <div>
          <p className="text-sm font-semibold text-foreground mb-1">
            Arrastra tus comprobantes aquí
          </p>
          <p className="text-xs text-muted-foreground">
            O haz clic para seleccionar archivos. Formatos aceptados: PDF, PNG, JPG.
          </p>
        </div>
      </div>
    </button>
  );
}

// ───── Main Facturas View ─────

export default function FacturasView() {
  const { currentClient } = usePortalStore();
  const processedCount = MOCK_INVOICES.filter((i) => i.status === 'Procesado ✓').length;
  const pendingCount = MOCK_INVOICES.filter((i) => i.status === 'Pendiente').length;

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
              <FileText className="h-3.5 w-3.5 text-emerald-400" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Bóveda Digital de Facturas
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Todos tus comprobantes, sincronizados automáticamente con los comercios aliados
          </p>
        </div>

        <Button
          variant="outline"
          size="sm"
          className="h-9 gap-2 rounded-xl text-xs border-border/50 bg-card/60 text-muted-foreground hover:text-foreground hover:bg-card/90"
        >
          <Download className="h-3.5 w-3.5" />
          Exportar historial
        </Button>
      </div>

      {/* Auto-Sync Banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Zap className="h-4 w-4 text-blue-400" />
        </div>
        <div className="space-y-1.5">
          <p className="text-sm font-semibold text-blue-400">
            ⚡ Conexión Automática Activa
          </p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Los comercios aliados con Sello de Confianza Neggo depositan tus facturas de forma
            automática en esta bóveda usando tu ID Único de Cliente:{' '}
            <span className="font-mono font-bold text-blue-300">
              IFC-{currentClient.id}
            </span>
          </p>
        </div>
      </div>

      {/* Stats + Upload Row */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Stats */}
        <div className="md:col-span-2 grid grid-cols-2 gap-3">
          <div className="rounded-xl border border-border/40 bg-card/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-emerald-500/10 border border-emerald-500/20">
                <CheckCircle2 className="h-3 w-3 text-emerald-400" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Procesadas
              </p>
            </div>
            <p className="text-2xl font-bold text-emerald-400 font-mono">{processedCount}</p>
            <p className="text-[10px] text-emerald-400/70 mt-0.5">
              Facturas con sello de confianza
            </p>
          </div>
          <div className="rounded-xl border border-border/40 bg-card/60 p-4">
            <div className="flex items-center gap-2 mb-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/20">
                <Clock className="h-3 w-3 text-amber-400" />
              </div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                Pendientes
              </p>
            </div>
            <p className="text-2xl font-bold text-amber-400 font-mono">{pendingCount}</p>
            <p className="text-[10px] text-amber-400/70 mt-0.5">
              Requieren validación manual
            </p>
          </div>
        </div>

        {/* Trust Seal badge */}
        <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 flex flex-col items-center justify-center text-center gap-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Shield className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <p className="text-xs font-semibold text-emerald-400">Sello de Confianza</p>
            <p className="text-[10px] text-emerald-400/60 mt-0.5">
              {processedCount} comercios validados por Neggo
            </p>
          </div>
        </div>
      </div>

      {/* Upload Dropzone */}
      <UploadDropzone />

      {/* Invoice History Table */}
      <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/40">
          <div className="flex items-center gap-2">
            <FileArchive className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Historial de Facturas</h3>
          </div>
          <Badge className="bg-card/60 text-muted-foreground border-border/40 text-[10px] px-2 py-0.5">
            {MOCK_INVOICES.length} documentos
          </Badge>
        </div>

        <div className="overflow-x-auto scrollbar-thin">
          <Table>
            <TableHeader>
              <TableRow className="border-border/30 hover:bg-transparent">
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Documento
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Establecimiento
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Monto COP
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Fecha
                </TableHead>
                <TableHead className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Estado
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {MOCK_INVOICES.map((invoice) => (
                <InvoiceRow key={invoice.id} invoice={invoice} />
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
