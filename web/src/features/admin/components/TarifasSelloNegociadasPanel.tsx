import { useState, useEffect, useCallback, useMemo } from 'react';
import { ShieldCheck, Loader2, AlertTriangle, Store, History, Gift, Pencil } from 'lucide-react';
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
import { useAdminStore } from '@/features/admin/store/useAdminStore';
import {
  fetchComerciosConSelloActivo,
  resolverSelloComercio,
  fetchTarifasSelloNegociadasComercio,
  insertTarifaSelloNegociada,
  fetchIngresoDeclaradoComercio,
  declararIngresosComercio,
  type ComercioSelloRow,
  type TarifaSelloNegociadaRow,
} from '@/core/db/repositories';

const FRANJA_PERSONALIZADO = 'personalizado';
const FRANJAS_ESTANDAR = [
  { clave: 'menos_300k', label: 'Menos de $300.000/mes', valor: 5000 },
  { clave: '300k_10m', label: '$300.000 – $10.000.000/mes', valor: 20000 },
  { clave: '10m_20m', label: '$10.000.001 – $20.000.000/mes', valor: 28000 },
  { clave: 'mas_20m', label: 'Más de $20.000.000/mes', valor: 40000 },
];

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

export default function TarifasSelloNegociadasPanel() {
  const session = useAuthStore((s) => s.session);
  const { selloPreseleccionComercioId, setSelloPreseleccionComercioId } = useAdminStore();
  const [comercios, setComercios] = useState<ComercioSelloRow[]>([]);
  const [isLoadingComercios, setIsLoadingComercios] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(selloPreseleccionComercioId);

  // Llegada desde el botón "Sello" en Comercios — preselecciona una sola vez y limpia
  // el puente, mismo patrón que tarifasPreseleccionComercioId en el panel de CPL.
  useEffect(() => {
    if (selloPreseleccionComercioId) {
      setSelectedId(selloPreseleccionComercioId);
      setSelloPreseleccionComercioId(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [historial, setHistorial] = useState<TarifaSelloNegociadaRow[]>([]);
  const [vigenteId, setVigenteId] = useState<string | null>(null);
  const [valorResuelto, setValorResuelto] = useState<number | null>(null);
  const [ingresoDeclarado, setIngresoDeclarado] = useState<number | null>(null);
  const [isLoadingVigente, setIsLoadingVigente] = useState(false);

  const [valorMensual, setValorMensual] = useState('');
  const [periodo, setPeriodo] = useState(currentPeriodo());
  const [motivo, setMotivo] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Franja estándar seleccionada — único punto donde se aplica: prellena el valor, pero
  // sigue siendo editable a mano (en cuyo caso queda como "Personalizado").
  const [franjaSeleccionada, setFranjaSeleccionada] = useState<string>(FRANJA_PERSONALIZADO);

  const handleSeleccionarFranja = useCallback((clave: string) => {
    setFranjaSeleccionada(clave);
    if (clave === FRANJA_PERSONALIZADO) return;
    const franja = FRANJAS_ESTANDAR.find((f) => f.clave === clave);
    if (franja) setValorMensual(String(franja.valor));
  }, []);

  const handleValorMensualChange = useCallback((value: string) => {
    setValorMensual(value);
    setFranjaSeleccionada(FRANJA_PERSONALIZADO);
  }, []);

  const [ingresoEditando, setIngresoEditando] = useState(false);
  const [ingresoInput, setIngresoInput] = useState('');
  const [isSavingIngreso, setIsSavingIngreso] = useState(false);

  useEffect(() => {
    fetchComerciosConSelloActivo().then(({ data }) => {
      setComercios(data ?? []);
      setIsLoadingComercios(false);
    });
  }, []);

  const loadComercioData = useCallback(async (comercioId: string) => {
    setIsLoadingVigente(true);
    const [{ data: valor }, { data: hist }, { data: ingreso }] = await Promise.all([
      resolverSelloComercio(comercioId),
      fetchTarifasSelloNegociadasComercio(comercioId),
      fetchIngresoDeclaradoComercio(comercioId),
    ]);
    setHistorial(hist ?? []);
    setValorResuelto(valor);
    setIngresoDeclarado(ingreso?.ingresosMensualesDeclarados ?? null);
    setIngresoInput(ingreso?.ingresosMensualesDeclarados != null ? String(ingreso.ingresosMensualesDeclarados) : '');

    const periodoActual = currentPeriodo();
    const vigenteNegociada = (hist ?? []).find((t) => t.periodoVigenteDesde <= periodoActual);
    setVigenteId(vigenteNegociada?.id ?? null);
    setIsLoadingVigente(false);
  }, []);

  useEffect(() => {
    if (selectedId) void loadComercioData(selectedId);
  }, [selectedId, loadComercioData]);

  const comercioSeleccionado = useMemo(() => comercios.find((c) => c.id === selectedId) ?? null, [comercios, selectedId]);
  const esNegociada = vigenteId !== null;

  const valorNum = Number(valorMensual);
  const canSubmit =
    !!selectedId && valorMensual.trim() !== '' && !isNaN(valorNum) && valorNum >= 0 &&
    periodo.trim() !== '' && !isSubmitting;

  const handleConfirmar = useCallback(async () => {
    if (!canSubmit || !selectedId || !session?.userId) return;
    setIsSubmitting(true);
    const { error } = await insertTarifaSelloNegociada({
      comercioOrganizationId: selectedId,
      valorMensual: valorNum,
      periodoVigenteDesde: periodo,
      creadoPor: session.userId,
      motivo: motivo.trim() || null,
    });
    setIsSubmitting(false);
    if (error) {
      toast.error('No se pudo asignar la tarifa del Sello', { description: error });
      return;
    }
    toast.success('Tarifa del Sello asignada', { description: `Vigente desde ${formatPeriodo(periodo)}.` });
    setConfirmOpen(false);
    setValorMensual('');
    setMotivo('');
    setPeriodo(currentPeriodo());
    setFranjaSeleccionada(FRANJA_PERSONALIZADO);
    await loadComercioData(selectedId);
  }, [canSubmit, selectedId, session?.userId, valorNum, periodo, motivo, loadComercioData]);

  const handleGuardarIngreso = useCallback(async () => {
    if (!selectedId) return;
    const valor = Number(ingresoInput.replace(/\D/g, ''));
    if (!ingresoInput || isNaN(valor) || valor < 0) {
      toast.error('Ingresa un valor numérico válido');
      return;
    }
    setIsSavingIngreso(true);
    const { error } = await declararIngresosComercio(selectedId, valor);
    setIsSavingIngreso(false);
    if (error) {
      toast.error('No se pudo guardar el ingreso', { description: error });
      return;
    }
    toast.success('Ingreso mensual corroborado');
    setIngresoEditando(false);
    await loadComercioData(selectedId);
  }, [selectedId, ingresoInput, loadComercioData]);

  return (
    <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-border/40 bg-card/60 flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-blue-400" />
        <h3 className="text-sm font-semibold text-foreground">Sello de Confianza — Suscripción Mensual</h3>
      </div>

      <div className="p-4 space-y-5">
        <p className="text-xs text-muted-foreground">
          Cobro mensual por franja de ingresos declarados (menos de $300.000 → $5.000 · $300.000–$10.000.000 → $20.000 ·
          $10.000.001–$20.000.000 → $28.000 · más de $20.000.000 → $40.000). Podés pisar el valor automático por comercio,
          incluido dejarlo en $0 para regalar el Sello. Historial append-only, igual que las tarifas de CPL/comisión.
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
            ) : (
              <div className="rounded-lg border border-border/40 bg-secondary/30 p-3 flex flex-wrap items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <Store className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-xs text-muted-foreground">Cobro vigente:</span>
                </div>
                <span className={cn('font-mono text-sm font-semibold', valorResuelto && valorResuelto > 0 ? 'text-foreground' : 'text-emerald-400')}>
                  {valorResuelto === null ? 'Sin ingreso declarado — no se cobra todavía' : valorResuelto > 0 ? `${formatCOP(valorResuelto)}/mes` : 'Gratis'}
                </span>
                <span
                  className={cn(
                    'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-semibold',
                    esNegociada
                      ? 'bg-purple-500/10 text-purple-400 border-purple-500/20'
                      : 'bg-secondary/60 text-muted-foreground border-border/40',
                  )}
                >
                  {esNegociada ? <ShieldCheck className="h-3 w-3" /> : null}
                  {esNegociada ? 'Negociada' : 'Franja automática'}
                </span>
              </div>
            )}

            {/* ── Ingreso declarado ── */}
            <div className="rounded-lg border border-border/40 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Ingreso mensual declarado</h4>
              {!ingresoEditando ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="font-mono text-sm text-foreground">
                    {ingresoDeclarado === null ? 'Aún no declarado (por el comercio ni por Admin)' : formatCOP(ingresoDeclarado)}
                  </span>
                  <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setIngresoEditando(true)}>
                    <Pencil className="h-3.5 w-3.5" />
                    {ingresoDeclarado === null ? 'Corroborar / asignar' : 'Corregir'}
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <Input
                    value={ingresoInput}
                    onChange={(e) => setIngresoInput(e.target.value)}
                    placeholder="Ej: 3.000.000"
                    inputMode="numeric"
                    className="h-9 w-56 text-sm font-mono"
                  />
                  <Button size="sm" onClick={handleGuardarIngreso} disabled={isSavingIngreso} className="bg-blue-600 hover:bg-blue-500 text-white">
                    {isSavingIngreso ? 'Guardando...' : 'Guardar'}
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => setIngresoEditando(false)} disabled={isSavingIngreso}>Cancelar</Button>
                </div>
              )}
              <p className="text-[11px] text-muted-foreground">
                Si el comercio ya lo declaró desde su panel, no hace falta tocarlo — esto es solo para corroborar o asignarlo vos mismo antes de que el comercio entre.
              </p>
            </div>

            {/* ── Nueva tarifa negociada ── */}
            <div className="rounded-lg border border-border/40 p-4 space-y-3">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Asignar nueva tarifa negociada</h4>
              <div className="space-y-1.5 max-w-xs">
                <Label className="text-xs text-muted-foreground">Aplicar franja estándar <span className="normal-case font-normal text-muted-foreground/70">(opcional — prellena el valor, seguís pudiendo editarlo o poner $0 para regalar)</span></Label>
                <Select value={franjaSeleccionada} onValueChange={handleSeleccionarFranja}>
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={FRANJA_PERSONALIZADO} className="text-sm">Personalizado</SelectItem>
                    {FRANJAS_ESTANDAR.map((f) => (
                      <SelectItem key={f.clave} value={f.clave} className="text-sm">
                        {f.label} — {formatCOP(f.valor)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Valor mensual (COP) — 0 = gratis</Label>
                  <Input type="number" value={valorMensual} onChange={(e) => handleValorMensualChange(e.target.value)} className="h-9 text-sm font-mono" placeholder="20000" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs text-muted-foreground">Vigente desde</Label>
                  <Input type="month" value={periodo} onChange={(e) => setPeriodo(e.target.value)} className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Motivo <span className="normal-case font-normal text-muted-foreground/70">(opcional)</span></Label>
                <Textarea value={motivo} onChange={(e) => setMotivo(e.target.value)} className="min-h-[60px] text-sm" placeholder="Ej: primeros 50 comercios, cortesía de lanzamiento..." maxLength={500} />
              </div>
              <Button
                disabled={!canSubmit}
                onClick={() => setConfirmOpen(true)}
                className={cn(
                  'h-9 gap-2 text-sm font-semibold rounded-lg',
                  canSubmit ? 'bg-blue-600 hover:bg-blue-500 text-white' : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
              >
                {valorNum === 0 ? <Gift className="h-4 w-4" /> : <ShieldCheck className="h-4 w-4" />}
                Asignar nueva tarifa
              </Button>
            </div>

            {/* ── Historial ── */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 flex items-center gap-1.5">
                <History className="h-3.5 w-3.5" />
                Historial de tarifas del Sello negociadas
              </h4>
              {historial.length === 0 ? (
                <p className="text-xs text-muted-foreground py-3">Este comercio no tiene tarifa negociada — usa la franja automática según su ingreso declarado.</p>
              ) : (
                <div className="overflow-x-auto rounded-lg border border-border/40">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b border-border/40 bg-card/60">
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Vigente desde</th>
                        <th className="px-3 py-2 text-right text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Valor mensual</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Creado por</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Motivo</th>
                        <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Registrado</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/30">
                      {historial.map((t) => (
                        <tr key={t.id} className={cn(t.id === vigenteId && 'bg-emerald-500/[0.04]')}>
                          <td className="px-3 py-2 text-xs font-medium text-foreground capitalize">
                            <div className="flex items-center gap-2">
                              {formatPeriodo(t.periodoVigenteDesde)}
                              {t.id === vigenteId && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 text-[9px] font-semibold text-emerald-400 normal-case">
                                  <ShieldCheck className="h-2.5 w-2.5" />
                                  Vigente ahora
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="px-3 py-2 text-right font-mono text-xs text-foreground">
                            {t.valorMensual > 0 ? formatCOP(t.valorMensual) : 'Gratis'}
                          </td>
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
              Confirmar nueva tarifa del Sello
            </DialogTitle>
            <DialogDescription className="text-sm pt-2 text-foreground">
              ¿Confirmas asignar {valorNum === 0 ? <span className="font-semibold">Sello gratis</span> : (
                <><span className="font-mono font-semibold">{formatCOP(valorNum || 0)}/mes</span></>
              )} a{' '}
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
              className="bg-blue-600 hover:bg-blue-500 text-white gap-1.5"
            >
              {isSubmitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ShieldCheck className="h-3.5 w-3.5" />}
              Confirmar y asignar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
