import { useState, useEffect, useCallback, useMemo } from 'react';
import { Handshake, Loader2, AlertTriangle, ShieldCheck, Store, History } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { toast } from 'sonner';
import { cn, formatCOP } from '@/lib/utils';
import { useAuthStore } from '@/store/useAuthStore';
import {
  fetchComerciosConSelloActivo,
  resolverCplComercio,
  fetchTarifasNegociadasComercio,
  insertTarifaComercioNegociada,
  fetchOrganizationPlanNegociacion,
  fetchPlanesComercio,
  type ComercioSelloRow,
  type TarifaComercioNegociadaRow,
  type PlanComercioRow,
} from '@/core/db/repositories';

function currentPeriodo(): string {
  return new Date().toISOString().slice(0, 7); // 'YYYY-MM'
}

function formatPeriodo(periodo: string): string {
  const [year, month] = periodo.split('-');
  const fecha = new Date(Number(year), Number(month) - 1, 1);
  return fecha.toLocaleDateString('es-CO', { month: 'long', year: 'numeric' });
}

function formatFechaHora(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

interface VigenteInfo {
  cpl: number;
  comisionPct: number;
  esNegociada: boolean;
}

export default function TarifasComercioNegociadasPanel() {
  const session = useAuthStore((s) => s.session);
  const [comercios, setComercios] = useState<ComercioSelloRow[]>([]);
  const [isLoadingComercios, setIsLoadingComercios] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const [historial, setHistorial] = useState<TarifaComercioNegociadaRow[]>([]);
  const [vigente, setVigente] = useState<VigenteInfo | null>(null);
  const [isLoadingVigente, setIsLoadingVigente] = useState(false);

  const [cpl, setCpl] = useState('');
  const [comisionPct, setComisionPct] = useState('');
  const [periodo, setPeriodo] = useState(currentPeriodo());
  const [motivo, setMotivo] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchComerciosConSelloActivo().then(({ data }) => {
      setComercios(data ?? []);
      setIsLoadingComercios(false);
    });
  }, []);

  const loadComercioData = useCallback(async (comercioId: string) => {
    setIsLoadingVigente(true);
    const [{ data: cplResuelto }, { data: hist }] = await Promise.all([
      resolverCplComercio(comercioId),
      fetchTarifasNegociadasComercio(comercioId),
    ]);
    setHistorial(hist ?? []);

    const periodoActual = currentPeriodo();
    const vigenteNegociada = (hist ?? [])
      .filter((t) => t.periodoVigenteDesde <= periodoActual)
      .sort((a, b) => b.periodoVigenteDesde.localeCompare(a.periodoVigenteDesde))[0];

    if (vigenteNegociada) {
      setVigente({ cpl: cplResuelto ?? vigenteNegociada.cpl, comisionPct: vigenteNegociada.comisionPct, esNegociada: true });
    } else {
      const { data: planClave } = await fetchOrganizationPlanNegociacion(comercioId);
      const { data: planes } = await fetchPlanesComercio();
      const plan = (planes ?? []).find((p: PlanComercioRow) => p.clave === (planClave ?? 'balanceado'));
      setVigente({ cpl: cplResuelto ?? plan?.cpl ?? 0, comisionPct: plan?.comisionPct ?? 0, esNegociada: false });
    }
    setIsLoadingVigente(false);
  }, []);

  useEffect(() => {
    if (selectedId) void loadComercioData(selectedId);
  }, [selectedId, loadComercioData]);

  const comercioSeleccionado = useMemo(() => comercios.find((c) => c.id === selectedId) ?? null, [comercios, selectedId]);

  const cplNum = Number(cpl);
  const comisionNum = Number(comisionPct);
  const canSubmit =
    !!selectedId && cpl.trim() !== '' && !isNaN(cplNum) && cplNum >= 0 &&
    comisionPct.trim() !== '' && !isNaN(comisionNum) && comisionNum >= 0 && comisionNum <= 100 &&
    periodo.trim() !== '' && !isSubmitting;

  const handleConfirmar = useCallback(async () => {
    if (!canSubmit || !selectedId || !session?.userId) return;
    setIsSubmitting(true);
    const { error } = await insertTarifaComercioNegociada({
      comercioOrganizationId: selectedId,
      cpl: cplNum,
      comisionPct: comisionNum,
      periodoVigenteDesde: periodo,
      creadoPor: session.userId,
      motivo: motivo.trim() || null,
    });
    setIsSubmitting(false);
    if (error) {
      toast.error('No se pudo asignar la tarifa', { description: error });
      return;
    }
    toast.success('Tarifa negociada asignada', { description: `Vigente desde ${formatPeriodo(periodo)}.` });
    setConfirmOpen(false);
    setCpl('');
    setComisionPct('');
    setMotivo('');
    setPeriodo(currentPeriodo());
    await loadComercioData(selectedId);
  }, [canSubmit, selectedId, session?.userId, cplNum, comisionNum, periodo, motivo, loadComercioData]);

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 bg-card/60 flex items-center gap-2">
        <Handshake className="h-4 w-4 text-purple-400" />
        <h3 className="text-sm font-semibold text-foreground">Tarifas Negociadas por Comercio</h3>
      </div>

      <div className="p-4 space-y-5">
        <p className="text-xs text-muted-foreground">
          Cada comercio puede tener una tarifa CPL/comisión negociada aparte del plan global. Este historial es
          append-only — nada se edita, cada cambio queda registrado como una fila nueva.
        </p>

        <div className="space-y-1.5 max-w-sm">
          <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Comercio</Label>
          <Select value={selectedId ?? ''} onValueChange={setSelectedId} disabled={isLoadingComercios}>
            <SelectTrigger className="h-9 text-sm">
              <SelectValue placeholder={isLoadingComercios ? 'Cargando comercios...' : 'Selecciona un comercio con Sello activo'} />
            </SelectTrigger>
            <SelectContent>
              {comercios.map((c) => (
                <SelectItem key={c.id} value={c.id} className="text-sm">{c.name}</SelectItem>
              ))}
              {comercios.length === 0 && !isLoadingComercios && (
                <div className="px-3 py-2 text-xs text-muted-foreground">No hay comercios con Sello activo.</div>
              )}
            </SelectContent>
          </Select>
        </div>

        {selectedId && (
          <>
            {isLoadingVigente ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Resolviendo tarifa vigente...
              </div>
            ) : vigente && (
              <div className="rounded-lg border border-border/40 bg-secondary/30 p-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Tarifa vigente:</span>
                </div>
                <span className="font-mono text-sm font-semibold text-foreground">{formatCOP(vigente.cpl)} CPL</span>
                <span className="font-mono text-sm font-semibold text-foreground">{vigente.comisionPct}% comisión</span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                    vigente.esNegociada
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-secondary/60 text-muted-foreground border-border/40',
                  )}
                >
                  {vigente.esNegociada ? <ShieldCheck className="h-3 w-3" /> : null}
                  {vigente.esNegociada ? 'Negociada' : 'Plan global por defecto'}
                </span>
              </div>
            )}

            {/* ── Nueva tarifa ── */}
            <div className="rounded-lg border border-border/40 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asignar nueva tarifa negociada</h4>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">CPL (COP)</Label>
                  <Input type="number" value={cpl} onChange={(e) => setCpl(e.target.value)} className="h-9 text-sm font-mono" placeholder="10000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Comisión (%)</Label>
                  <Input type="number" value={comisionPct} onChange={(e) => setComisionPct(e.target.value)} className="h-9 text-sm font-mono" placeholder="2.25" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Vigente desde</Label>
                  <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Motivo <span className="normal-case font-normal text-muted-foreground/70">(opcional)</span></Label>
                <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} className="min-h-[60px] text-sm" placeholder="Ej: renegociación por volumen, acuerdo comercial especial..." maxLength={500} />
              </div>
              <Button
                disabled={!canSubmit}
                onClick={() => setConfirmOpen(true)}
                className={cn(
                  'h-9 gap-2 text-sm font-semibold rounded-lg',
                  canSubmit ? 'bg-purple-600 hover:bg-purple-500 text-white' : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
              >
                <Handshake className="h-4 w-4" />
                Asignar nueva tarifa
              </Button>
            </div>

            {/* ── Historial ── */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Historial de tarifas negociadas
              </h4>
              {historial.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3">Este comercio no tiene ninguna tarifa negociada — usa el plan global.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border/40">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 bg-card/60">
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vigente desde</th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">CPL</th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Comisión</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Creado por</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Motivo</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Registrado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {historial.map((t) => (
                        <tr key={t.id}>
                          <td className="px-3 py-2 text-xs font-medium text-foreground capitalize">{formatPeriodo(t.periodoVigenteDesde)}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs text-foreground">{formatCOP(t.cpl)}</td>
                          <td className="px-3 py-2 text-right font-mono text-xs text-foreground">{t.comisionPct}%</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground">{t.creadoPorNombre ?? t.creadoPor}</td>
                          <td className="px-3 py-2 text-xs text-muted-foreground max-w-[240px] truncate" title={t.motivo ?? undefined}>{t.motivo ?? '—'}</td>
                          <td className="px-3 py-2 text-[11px] text-muted-foreground">{formatFechaHora(t.createdAt)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md border-border/60 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-base font-semibold flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-amber-400" />
              Confirmar nueva tarifa
            </DialogTitle>
            <DialogDescription className="text-sm pt-2 text-foreground">
              ¿Confirmas asignar CPL de <span className="font-mono font-semibold">{formatCOP(cplNum || 0)}</span> y
              comisión de <span className="font-mono font-semibold">{comisionPct || 0}%</span> a{' '}
              <span className="font-semibold">{comercioSeleccionado?.name}</span>, vigente desde{' '}
              <span className="font-semibold capitalize">{formatPeriodo(periodo)}</span>?
              <br />
              <span className="text-xs text-muted-foreground">Esta acción no se puede deshacer con una edición — quedará registrada en el historial permanentemente.</span>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button variant="outline" size="sm" onClick={() => setConfirmOpen(false)} disabled={isSubmitting}>Cancelar</Button>
            <Button
              size="sm"
              onClick={handleConfirmar}
              disabled={isSubmitting}
              className="bg-purple-600 hover:bg-purple-500 text-white gap-1.5"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Handshake className="h-3.5 w-3.5" />}
              Confirmar y asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
