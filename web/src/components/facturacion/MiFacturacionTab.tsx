import { useState, useEffect, useCallback } from 'react';
import { ChevronRight, ChevronDown, Receipt, Loader2, AlertTriangle, Clock, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn, formatCOP } from '@/lib/utils';
import { toast } from 'sonner';
import {
  fetchFacturasMensualesByOrganization,
  fetchFacturasLedgerByFacturaMensual,
  reportarPagoFactura,
  type FacturaMensualRow,
  type FacturaLedgerRow,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';
import { PRODUCT_LABELS, TIPO_VIVIENDA_LABELS } from '@/components/crm/leadLabels';

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

function formatPeriodo(periodo: string): string {
  const [year, month] = periodo.split('-');
  return `${MESES[Number(month) - 1] ?? month} ${year}`;
}

function formatDetalleProducto(detalle: unknown): string {
  if (!detalle || typeof detalle !== 'object' || Array.isArray(detalle)) return '—';
  const d = detalle as Record<string, unknown>;
  if (typeof d.productoBancario === 'string') return PRODUCT_LABELS[d.productoBancario] ?? d.productoBancario;
  if (typeof d.tipoVivienda === 'string') {
    const tipo = TIPO_VIVIENDA_LABELS[d.tipoVivienda] ?? d.tipoVivienda;
    return typeof d.ciudad === 'string' ? `${tipo} — ${d.ciudad}` : tipo;
  }
  if (typeof d.categoria === 'string') {
    return typeof d.subcategoria === 'string' ? `${d.categoria} / ${d.subcategoria}` : d.categoria;
  }
  return '—';
}

const ESTADO_CONFIG: Record<string, { label: string; bg: string; text: string; border: string }> = {
  pendiente_pago: { label: 'Pendiente de pago', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  reportado_por_negocio: { label: 'Reportado — esperando confirmación', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  confirmado_pagado: { label: 'Pagado', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
};

export default function MiFacturacionTab({ organizationId, title = 'Mi Facturación' }: { organizationId: string | null; title?: string }) {
  const [facturas, setFacturas] = useState<FacturaMensualRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [detalleCache, setDetalleCache] = useState<Map<string, FacturaLedgerRow[]>>(new Map());
  const [loadingDetalleId, setLoadingDetalleId] = useState<string | null>(null);
  const [reportingId, setReportingId] = useState<string | null>(null);

  const loadFacturas = useCallback(async () => {
    if (!isDbConfigured || !organizationId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchFacturasMensualesByOrganization(organizationId);
    if (fetchError) { setError(fetchError); setFacturas([]); } else { setFacturas(data ?? []); }
    setIsLoading(false);
  }, [organizationId]);

  useEffect(() => { loadFacturas(); }, [loadFacturas]);

  const handleExpand = useCallback(async (facturaId: string) => {
    if (expandedId === facturaId) { setExpandedId(null); return; }
    setExpandedId(facturaId);
    if (detalleCache.has(facturaId)) return;
    setLoadingDetalleId(facturaId);
    const { data, error: fetchError } = await fetchFacturasLedgerByFacturaMensual(facturaId);
    if (fetchError) { toast.error('No se pudo cargar el detalle', { description: fetchError }); }
    else { setDetalleCache((prev) => new Map(prev).set(facturaId, data ?? [])); }
    setLoadingDetalleId(null);
  }, [expandedId, detalleCache]);

  const handleReportarPago = useCallback(async (facturaId: string) => {
    setReportingId(facturaId);
    const { error: reportError } = await reportarPagoFactura(facturaId);
    if (reportError) {
      toast.error('No se pudo reportar el pago', { description: reportError });
    } else {
      setFacturas((prev) => prev.map((f) => (f.id === facturaId ? { ...f, estado: 'reportado_por_negocio', reportadoAt: new Date().toISOString() } : f)));
      toast.success('Pago reportado', { description: 'Neggo confirmará la recepción pronto.' });
    }
    setReportingId(null);
  }, []);

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
        <p className="text-sm font-medium text-muted-foreground">Cargando facturación...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar facturación</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={loadFacturas}>Reintentar</Button>
      </div>
    );
  }

  const pendientes = facturas.filter((f) => f.estado !== 'confirmado_pagado');
  const historico = facturas.filter((f) => f.estado === 'confirmado_pagado');

  const renderFactura = (f: FacturaMensualRow) => {
    const isExpanded = expandedId === f.id;
    const detalle = detalleCache.get(f.id);
    const cfg = ESTADO_CONFIG[f.estado];
    return (
      <div key={f.id} className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
        <button
          type="button"
          onClick={() => handleExpand(f.id)}
          className="w-full flex items-center justify-between gap-3 px-4 py-3 hover:bg-card/60 transition-colors text-left"
        >
          <div className="flex items-center gap-3">
            {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground" /> : <ChevronRight className="h-4 w-4 text-muted-foreground" />}
            <div>
              <div className="text-sm font-semibold text-foreground">{formatPeriodo(f.periodo)}</div>
              <div className="text-[10px] text-muted-foreground">Vence {new Date(f.fechaLimitePago).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="font-mono text-sm font-semibold text-foreground">{formatCOP(f.montoTotal)}</span>
            <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', cfg.bg, cfg.text, cfg.border)}>
              {f.estado === 'confirmado_pagado' ? <CheckCircle2 className="h-2.5 w-2.5" /> : <Clock className="h-2.5 w-2.5" />}
              {cfg.label}
            </span>
          </div>
        </button>

        {isExpanded && (
          <div className="border-t border-border/30 p-4 space-y-3">
            {f.estado === 'pendiente_pago' && (
              <Button
                size="sm"
                onClick={() => handleReportarPago(f.id)}
                disabled={reportingId === f.id}
                className="bg-emerald-600 hover:bg-emerald-500"
              >
                {reportingId === f.id ? 'Reportando...' : 'Marcar como Pagado a Neggo'}
              </Button>
            )}

            {loadingDetalleId === f.id ? (
              <p className="text-xs text-muted-foreground">Cargando cargos...</p>
            ) : !detalle || detalle.length === 0 ? (
              <p className="text-xs text-muted-foreground">Sin cargos individuales.</p>
            ) : (
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground">
                    <th className="pb-2 font-medium">Concepto</th>
                    <th className="pb-2 font-medium">Producto / Servicio</th>
                    <th className="pb-2 font-medium text-right">Monto</th>
                    <th className="pb-2 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {detalle.map((d) => (
                    <tr key={d.id}>
                      <td className="py-2 text-foreground">{d.concepto}</td>
                      <td className="py-2 text-muted-foreground">{formatDetalleProducto(d.detalle)}</td>
                      <td className="py-2 text-right font-mono text-foreground">{formatCOP(Number(d.monto))}</td>
                      <td className="py-2 text-muted-foreground">{new Date(d.fecha).toLocaleDateString('es-CO', { day: 'numeric', month: 'short' })}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">{title}</h2>
        <p className="text-xs text-muted-foreground mt-0.5">Facturas mensuales generadas por tus cargos de CPL y Success Fee/comisión</p>
      </div>

      {facturas.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
            <Receipt className="h-6 w-6 text-blue-400" />
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-1">Sin facturas todavía</h4>
          <p className="text-xs text-muted-foreground max-w-sm">Tu primera factura se genera automáticamente el día 1 del mes siguiente a tus primeros cargos.</p>
        </div>
      ) : (
        <>
          {pendientes.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pendientes</h3>
              {pendientes.map(renderFactura)}
            </div>
          )}
          {historico.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Histórico</h3>
              {historico.map(renderFactura)}
            </div>
          )}
        </>
      )}
    </div>
  );
}
