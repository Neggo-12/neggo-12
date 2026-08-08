import { useState, useMemo, useEffect, useCallback, useRef, type ChangeEvent } from 'react';
import {
  Wallet,
  PieChart,
  TrendingUp,
  Plus,
  Lightbulb,
  ArrowRight,
  Home,
  Utensils,
  Bus,
  Zap,
  Gamepad2,
  MoreHorizontal,
  Loader2,
  Trash2,
  CircleDollarSign,
  Camera,
  Receipt,
  X,
} from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import KPICard from '@/components/KPICard';
import { cn } from '@/lib/utils';
import { MOCK_FINANCIAL_TIPS } from '@/features/portal/data/mock';
import type { BudgetCategory } from '@/features/portal/data/mock';
import { usePortalStore } from '@/features/portal/store/usePortalStore';
import type { MovimientoOcr } from '@/core/db/repositories';

// ───── Helpers ─────

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-CO', {
    style: 'currency',
    currency: 'COP',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(value);
}

function getProgressColor(pct: number): string {
  if (pct < 60) return 'bg-emerald-500';
  if (pct < 80) return 'bg-amber-500';
  if (pct < 95) return 'bg-orange-500';
  return 'bg-red-500';
}

function getProgressGlow(pct: number): string {
  if (pct < 60) return 'shadow-[0_0_12px_hsl(160_84%_39%/0.3)]';
  if (pct < 80) return 'shadow-[0_0_12px_hsl(38_92%_50%/0.3)]';
  if (pct < 95) return 'shadow-[0_0_12px_hsl(25_95%_53%/0.3)]';
  return 'shadow-[0_0_12px_hsl(0_72%_51%/0.3)]';
}

// ───── Category icon map ─────

const CATEGORY_ICONS: Record<string, React.ReactNode> = {
  Home: <Home className="h-4 w-4" />,
  Utensils: <Utensils className="h-4 w-4" />,
  Bus: <Bus className="h-4 w-4" />,
  Zap: <Zap className="h-4 w-4" />,
  Gamepad2: <Gamepad2 className="h-4 w-4" />,
  MoreHorizontal: <MoreHorizontal className="h-4 w-4" />,
};

// ───── Category Row ─────

function CategoryRow({ item }: { item: BudgetCategory }) {
  const registrarGastoCategoria = usePortalStore((s) => s.registrarGastoCategoria);
  const eliminarPresupuestoCategoria = usePortalStore((s) => s.eliminarPresupuestoCategoria);
  const [isAddingGasto, setIsAddingGasto] = useState(false);
  const [montoGasto, setMontoGasto] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const pct = item.budget > 0 ? Math.min(Math.round((item.spent / item.budget) * 100), 100) : 0;
  const isOverBudget = item.spent > item.budget;

  const handleRegistrarGasto = useCallback(async () => {
    const monto = Number(montoGasto);
    if (!monto || monto <= 0) return;
    setIsSubmitting(true);
    await registrarGastoCategoria(item.id, monto);
    setIsSubmitting(false);
    setMontoGasto('');
    setIsAddingGasto(false);
  }, [montoGasto, item.id, registrarGastoCategoria]);

  return (
    <div className="group rounded-xl border bg-card/40 p-4 hover:bg-card/70 transition-all duration-200">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2.5">
          <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border text-muted-foreground', 'border-border/40 bg-secondary/40')}>
            {CATEGORY_ICONS[item.icon] ?? <MoreHorizontal className="h-4 w-4" />}
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">{item.name}</p>
            <p className="text-[11px] text-muted-foreground">
              {pct}% del presupuesto
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="text-sm font-semibold font-mono text-foreground">
            {formatCurrency(item.spent)}
          </p>
          <p className={cn('text-[11px]', isOverBudget ? 'text-red-400 font-medium' : 'text-muted-foreground')}>
            de {formatCurrency(item.budget)}
          </p>
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative">
        <Progress
          value={pct}
          className="h-2.5 bg-secondary/60 [&>div]:rounded-full [&>div]:transition-all [&>div]:duration-500"
        />
        {/* Colored indicator overlay */}
        <div
          className="absolute inset-0 overflow-hidden rounded-full pointer-events-none"
          style={{ width: `${pct}%` }}
        >
          <div className={cn('h-full rounded-full transition-all duration-500', getProgressColor(pct), getProgressGlow(pct))} />
        </div>
      </div>

      {/* Row actions */}
      {isAddingGasto ? (
        <div className="mt-3 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Input
            type="number"
            autoFocus
            placeholder="Monto gastado (COP)"
            value={montoGasto}
            onChange={(e) => setMontoGasto(e.target.value)}
            className="h-8 text-xs font-mono flex-1"
          />
          <Button
            size="sm"
            disabled={!montoGasto || Number(montoGasto) <= 0 || isSubmitting}
            onClick={handleRegistrarGasto}
            className="h-8 shrink-0 text-xs bg-blue-600 hover:bg-blue-500 text-white"
          >
            {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Guardar'}
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => { setIsAddingGasto(false); setMontoGasto(''); }}
            className="h-8 shrink-0 text-xs text-muted-foreground"
          >
            Cancelar
          </Button>
        </div>
      ) : (
        <div className="mt-3 flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={() => setIsAddingGasto(true)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors"
          >
            <CircleDollarSign className="h-3 w-3" />
            Registrar gasto
          </button>
          <span className="text-border/40">·</span>
          <button
            onClick={() => void eliminarPresupuestoCategoria(item.id)}
            className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-red-400 transition-colors"
          >
            <Trash2 className="h-3 w-3" />
            Eliminar
          </button>
        </div>
      )}
    </div>
  );
}

// ───── Tip Card ─────

function TipCard({ text, actionLabel }: { text: string; actionLabel?: string }) {
  return (
    <div className="group flex items-start gap-3 p-3 rounded-lg hover:bg-secondary/30 transition-colors cursor-default">
      <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-amber-500/10 border border-amber-500/20 mt-0.5">
        <Lightbulb className="h-3 w-3 text-amber-400" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-xs text-muted-foreground leading-relaxed">{text}</p>
        {actionLabel && (
          <button className="inline-flex items-center gap-1 mt-1.5 text-[11px] font-medium text-blue-400 hover:text-blue-300 transition-colors">
            {actionLabel}
            <ArrowRight className="h-3 w-3" />
          </button>
        )}
      </div>
    </div>
  );
}

// ───── Recibo pendiente (resultado de OCR, requiere confirmación) ─────

function ReciboPendienteCard({
  movimiento,
  categorias,
}: {
  movimiento: MovimientoOcr;
  categorias: BudgetCategory[];
}) {
  const confirmarMovimientoOcrEnCategoria = usePortalStore((s) => s.confirmarMovimientoOcrEnCategoria);
  const descartarMovimientoOcrPendiente = usePortalStore((s) => s.descartarMovimientoOcrPendiente);

  const categoriaSugeridaId = categorias.find((c) => c.name === movimiento.categoriaSugerida)?.id ?? '';
  const [categoriaId, setCategoriaId] = useState(categoriaSugeridaId || categorias[0]?.id || '');
  const [monto, setMonto] = useState(movimiento.valorExtraido ? String(movimiento.valorExtraido) : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDiscarding, setIsDiscarding] = useState(false);

  const canConfirm = !!categoriaId && Number(monto) > 0 && !isSubmitting;

  const handleConfirmar = useCallback(async () => {
    if (!canConfirm) return;
    setIsSubmitting(true);
    await confirmarMovimientoOcrEnCategoria(movimiento.id, categoriaId, Number(monto));
    setIsSubmitting(false);
  }, [canConfirm, confirmarMovimientoOcrEnCategoria, movimiento.id, categoriaId, monto]);

  const handleDescartar = useCallback(async () => {
    setIsDiscarding(true);
    await descartarMovimientoOcrPendiente(movimiento.id);
    setIsDiscarding(false);
  }, [descartarMovimientoOcrPendiente, movimiento.id]);

  const confianzaBaja = movimiento.confianzaOcr !== null && movimiento.confianzaOcr < 0.6;

  return (
    <div className="rounded-xl border border-amber-500/20 bg-amber-500/[0.04] p-4">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg border border-amber-500/20 bg-amber-500/10 text-amber-400">
            <Receipt className="h-4 w-4" />
          </div>
          <div>
            <p className="text-sm font-medium text-foreground">
              {movimiento.comercioExtraido ?? 'Comercio no detectado'}
            </p>
            <p className="text-[11px] text-muted-foreground">
              {movimiento.fechaExtraida ?? 'Sin fecha detectada'}
              {confianzaBaja && ' · revisá los datos, la lectura no fue muy clara'}
            </p>
          </div>
        </div>
        <button
          onClick={() => void handleDescartar()}
          disabled={isDiscarding}
          className="text-muted-foreground hover:text-red-400 transition-colors shrink-0"
          aria-label="Descartar recibo"
        >
          {isDiscarding ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
        </button>
      </div>

      <div className="grid grid-cols-2 gap-2.5">
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Monto (COP)</Label>
          <Input
            type="number"
            value={monto}
            onChange={(e) => setMonto(e.target.value)}
            className="h-8 text-xs font-mono"
          />
        </div>
        <div className="space-y-1">
          <Label className="text-[11px] font-medium text-muted-foreground">Categoría</Label>
          <select
            value={categoriaId}
            onChange={(e) => setCategoriaId(e.target.value)}
            className="h-8 w-full rounded-lg border border-border/60 bg-secondary/40 px-2 text-xs text-foreground"
          >
            {categorias.length === 0 && <option value="">Creá una categoría primero</option>}
            {categorias.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <Button
        size="sm"
        disabled={!canConfirm}
        onClick={handleConfirmar}
        className="w-full mt-3 h-8 text-xs bg-emerald-600 hover:bg-emerald-500 text-white"
      >
        {isSubmitting ? <Loader2 className="h-3 w-3 animate-spin" /> : 'Confirmar y sumar al presupuesto'}
      </Button>
    </div>
  );
}

// ───── Escanear Recibo ─────

function EscanearReciboCard({ categorias }: { categorias: BudgetCategory[] }) {
  const subirYProcesarRecibo = usePortalStore((s) => s.subirYProcesarRecibo);
  const isProcesandoRecibo = usePortalStore((s) => s.isProcesandoRecibo);
  const movimientosOcrPendientes = usePortalStore((s) => s.movimientosOcrPendientes);
  const isMovimientosOcrLoading = usePortalStore((s) => s.isMovimientosOcrLoading);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = useCallback(
    async (e: ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (!file) return;
      await subirYProcesarRecibo(file);
      if (inputRef.current) inputRef.current.value = '';
    },
    [subirYProcesarRecibo],
  );

  return (
    <div className="rounded-xl border bg-card/60 p-5">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-500/10 border border-emerald-500/20">
          <Camera className="h-3.5 w-3.5 text-emerald-400" />
        </div>
        <h3 className="text-sm font-semibold text-foreground">Escanear Recibo</h3>
      </div>

      <p className="text-xs text-muted-foreground leading-relaxed mb-4">
        Subí una foto de tu recibo o factura y leemos los datos automáticamente — vos solo confirmás antes de que se sume a tu presupuesto.
      </p>

      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => void handleFileChange(e)}
      />
      <Button
        onClick={() => inputRef.current?.click()}
        disabled={isProcesandoRecibo}
        className="w-full gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20"
      >
        {isProcesandoRecibo ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" />
            Leyendo recibo...
          </>
        ) : (
          <>
            <Camera className="h-4 w-4" />
            Tomar o subir foto
          </>
        )}
      </Button>

      {isMovimientosOcrLoading ? (
        <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
          <Loader2 className="h-4 w-4 animate-spin" />
          Cargando recibos pendientes...
        </div>
      ) : movimientosOcrPendientes.length > 0 ? (
        <div className="space-y-2.5 mt-4">
          {movimientosOcrPendientes.map((m) => (
            <ReciboPendienteCard key={m.id} movimiento={m} categorias={categorias} />
          ))}
        </div>
      ) : null}
    </div>
  );
}

// ───── Nueva Categoría Dialog ─────

function NuevaCategoriaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addPresupuestoCategoria = usePortalStore((s) => s.addPresupuestoCategoria);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryBudget, setNewCategoryBudget] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const canSubmit = !!newCategoryName.trim() && Number(newCategoryBudget) > 0 && !isSubmitting;

  const handleSubmit = useCallback(async () => {
    if (!canSubmit) return;
    setIsSubmitting(true);
    const categoria: BudgetCategory = {
      id: `PRES-${Date.now()}`,
      name: newCategoryName.trim(),
      budget: Number(newCategoryBudget),
      spent: 0,
      color: 'blue',
      icon: 'MoreHorizontal',
    };
    const ok = await addPresupuestoCategoria(categoria);
    setIsSubmitting(false);
    if (ok) {
      setNewCategoryName('');
      setNewCategoryBudget('');
      onOpenChange(false);
    }
  }, [canSubmit, newCategoryName, newCategoryBudget, addPresupuestoCategoria, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight">
            Nueva Categoría de Gasto
          </DialogTitle>
          <DialogDescription className="text-sm">
            Define un presupuesto para una nueva categoría. Después podés registrar gastos puntuales desde la tarjeta.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="cat-name" className="text-xs font-medium text-muted-foreground">
              Nombre de la categoría
            </Label>
            <Input
              id="cat-name"
              placeholder="Ej: Educación, Salud, Mascotas..."
              value={newCategoryName}
              onChange={(e) => setNewCategoryName(e.target.value)}
              className="h-10 rounded-lg border-border/60 bg-secondary/40 text-sm placeholder:text-muted-foreground/50"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cat-budget" className="text-xs font-medium text-muted-foreground">
              Presupuesto mensual (COP)
            </Label>
            <Input
              id="cat-budget"
              type="number"
              placeholder="500,000"
              value={newCategoryBudget}
              onChange={(e) => setNewCategoryBudget(e.target.value)}
              className="h-10 rounded-lg border-border/60 bg-secondary/40 text-sm font-mono placeholder:text-muted-foreground/50"
            />
          </div>
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="rounded-lg border-border/60 text-sm"
          >
            Cancelar
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm gap-1.5"
          >
            {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Guardar Categoría
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ───── Main Control Financiero View ─────

export default function ControlFinancieroView() {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const { presupuestoCategorias, isPresupuestoLoading, hydratePresupuesto, hydrateMovimientosOcr } = usePortalStore();

  useEffect(() => {
    void hydratePresupuesto();
    void hydrateMovimientosOcr();
  }, [hydratePresupuesto, hydrateMovimientosOcr]);

  const totalSpent = useMemo(
    () => presupuestoCategorias.reduce((sum, c) => sum + c.spent, 0),
    [presupuestoCategorias],
  );
  const totalBudget = useMemo(
    () => presupuestoCategorias.reduce((sum, c) => sum + c.budget, 0),
    [presupuestoCategorias],
  );
  const categoriesActive = presupuestoCategorias.length;
  const dayOfMonth = new Date().getDate();
  const averageDailySpend = dayOfMonth > 0 ? Math.round(totalSpent / dayOfMonth) : 0;

  const remainingBudget = totalBudget - totalSpent;
  const budgetPct = totalBudget > 0 ? Math.min(Math.round((totalSpent / totalBudget) * 100), 100) : 0;

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Presupuesto Mensual Total"
          value={formatCurrency(totalBudget)}
          icon={Wallet}
          gradient="blue"
          suffix="COP"
        />
        <KPICard
          title="Categorías Activas"
          value={categoriesActive}
          icon={PieChart}
          gradient="purple"
        />
        <KPICard
          title="Gasto Promedio Diario"
          value={formatCurrency(averageDailySpend)}
          icon={TrendingUp}
          gradient="emerald"
          suffix="COP"
        />
      </div>

      {/* ── 50-30-20 Rule + Budget Overview ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 50-30-20 Rule */}
        <div className="lg:col-span-1 rounded-xl border bg-card/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-green-500/10 border border-green-500/20">
              <PieChart className="h-3.5 w-3.5 text-green-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Regla 50-30-20</h3>
          </div>

          <p className="text-xs text-muted-foreground leading-relaxed mb-4">
            Un método simple para distribuir tus ingresos y construir estabilidad financiera a largo plazo.
          </p>

          <div className="space-y-3">
            {[
              { label: 'Necesidades (50%)', pct: 50, color: 'bg-blue-500', amount: totalBudget * 0.5, desc: 'Vivienda, alimentos, transporte, servicios' },
              { label: 'Deseos (30%)', pct: 30, color: 'bg-purple-500', amount: totalBudget * 0.3, desc: 'Entretenimiento, viajes, compras personales' },
              { label: 'Ahorro (20%)', pct: 20, color: 'bg-emerald-500', amount: totalBudget * 0.2, desc: 'Fondo de emergencia, inversiones, retiro' },
            ].map((item) => (
              <div key={item.label} className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-medium text-foreground">{item.label}</span>
                  <span className="text-xs font-mono text-muted-foreground">{formatCurrency(item.amount)}</span>
                </div>
                <div className="relative h-2 rounded-full bg-secondary/60 overflow-hidden">
                  <div
                    className={cn('absolute inset-y-0 left-0 rounded-full transition-all duration-700', item.color)}
                    style={{ width: `${item.pct}%` }}
                  />
                </div>
                <p className="text-[10px] text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Budget progress bars */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between mb-1">
            <div>
              <h3 className="text-sm font-semibold text-foreground">Desglose por Categoría</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                {formatCurrency(totalSpent)} gastado de {formatCurrency(totalBudget)}
              </p>
            </div>
            <Badge
              className={cn(
                'text-xs font-semibold px-3 py-1 rounded-lg border font-mono',
                budgetPct < 60
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                  : budgetPct < 80
                    ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                    : 'bg-red-500/10 text-red-400 border-red-500/20',
              )}
            >
              {budgetPct}%
            </Badge>
          </div>

          {/* Overall budget bar */}
          <div className="rounded-xl border bg-card/40 p-4 mb-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-medium text-muted-foreground">Total Presupuesto</span>
              <span className="text-xs font-mono font-semibold text-foreground">
                {formatCurrency(remainingBudget)} disponible
              </span>
            </div>
            <div className="relative">
              <Progress value={budgetPct} className="h-3 bg-secondary/60 [&>div]:rounded-full" />
              <div className="absolute inset-0 overflow-hidden rounded-full pointer-events-none" style={{ width: `${budgetPct}%` }}>
                <div className={cn('h-full rounded-full', getProgressColor(budgetPct), getProgressGlow(budgetPct))} />
              </div>
            </div>
          </div>

          {/* Individual categories */}
          {isPresupuestoLoading ? (
            <div className="flex items-center gap-2 text-xs text-muted-foreground py-6 justify-center">
              <Loader2 className="h-4 w-4 animate-spin" />
              Cargando tu presupuesto...
            </div>
          ) : presupuestoCategorias.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 text-center rounded-xl border border-dashed border-border/40">
              <Wallet className="h-6 w-6 text-muted-foreground/60 mb-2" />
              <p className="text-xs text-muted-foreground max-w-xs">
                Todavía no tenés categorías. Creá la primera con el botón "Agregar Categoría" para empezar a llevar tu presupuesto.
              </p>
            </div>
          ) : (
            <div className="space-y-2.5">
              {presupuestoCategorias.map((item) => (
                <CategoryRow key={item.id} item={item} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* ── Bottom Row: Tips + Add Category ── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Financial tips panel */}
        <div className="lg:col-span-2 rounded-xl border bg-card/60 p-5">
          <div className="flex items-center gap-2 mb-4">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
              <Lightbulb className="h-3.5 w-3.5 text-amber-400" />
            </div>
            <h3 className="text-sm font-semibold text-foreground">Consejos Financieros</h3>
          </div>

          <div className="space-y-1 divide-y divide-border/20">
            {MOCK_FINANCIAL_TIPS.map((tip) => (
              <TipCard key={tip.id} text={tip.text} actionLabel={tip.actionLabel} />
            ))}
          </div>
        </div>

        {/* Add category CTA */}
        <div className="rounded-xl border bg-card/60 p-5 flex flex-col justify-center items-center text-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20">
            <Plus className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-foreground mb-1">Personaliza tu presupuesto</h3>
            <p className="text-xs text-muted-foreground max-w-[220px]">
              Agrega nuevas categorías o registra gastos puntuales para tener control total de tus finanzas.
            </p>
          </div>
          <Button
            onClick={() => setIsDialogOpen(true)}
            className="w-full gap-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 transition-all hover:shadow-blue-600/30"
          >
            <Plus className="h-4 w-4" />
            Agregar Categoría
          </Button>
        </div>
      </div>

      {/* ── Escanear Recibo (OCR) ── */}
      <EscanearReciboCard categorias={presupuestoCategorias} />

      <NuevaCategoriaDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
