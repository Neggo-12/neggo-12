import { useState, useMemo } from 'react';
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
import {
  MOCK_BUDGET_CATEGORIES,
  MOCK_BUDGET_SUMMARY,
  MOCK_FINANCIAL_TIPS,
} from '@/features/portal/data/mock';
import type { BudgetCategory } from '@/features/portal/data/mock';

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
  const pct = Math.min(Math.round((item.spent / item.budget) * 100), 100);
  const isOverBudget = item.spent > item.budget;

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

// ───── Main Control Financiero View ─────

export default function ControlFinancieroView() {
  const [isDialogOpen, setIsDialogOpen] = useState<boolean>(false);
  const [newCategoryName, setNewCategoryName] = useState<string>('');
  const [newCategoryBudget, setNewCategoryBudget] = useState<string>('');

  const totalSpent = useMemo(
    () => MOCK_BUDGET_CATEGORIES.reduce((sum, c) => sum + c.spent, 0),
    [],
  );

  const remainingBudget = MOCK_BUDGET_SUMMARY.monthlyBudget - totalSpent;
  const budgetPct = Math.min(Math.round((totalSpent / MOCK_BUDGET_SUMMARY.monthlyBudget) * 100), 100);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* ── Top KPIs ── */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <KPICard
          title="Presupuesto Mensual Total"
          value={formatCurrency(MOCK_BUDGET_SUMMARY.monthlyBudget)}
          icon={Wallet}
          gradient="blue"
          suffix="COP"
        />
        <KPICard
          title="Categorías Activas"
          value={MOCK_BUDGET_SUMMARY.categoriesActive}
          icon={PieChart}
          gradient="purple"
        />
        <KPICard
          title="Gasto Promedio Diario"
          value={formatCurrency(MOCK_BUDGET_SUMMARY.averageDailySpend)}
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
              { label: 'Necesidades (50%)', pct: 50, color: 'bg-blue-500', amount: MOCK_BUDGET_SUMMARY.monthlyBudget * 0.5, desc: 'Vivienda, alimentos, transporte, servicios' },
              { label: 'Deseos (30%)', pct: 30, color: 'bg-purple-500', amount: MOCK_BUDGET_SUMMARY.monthlyBudget * 0.3, desc: 'Entretenimiento, viajes, compras personales' },
              { label: 'Ahorro (20%)', pct: 20, color: 'bg-emerald-500', amount: MOCK_BUDGET_SUMMARY.monthlyBudget * 0.2, desc: 'Fondo de emergencia, inversiones, retiro' },
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
                {formatCurrency(totalSpent)} gastado de {formatCurrency(MOCK_BUDGET_SUMMARY.monthlyBudget)}
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
          <div className="space-y-2.5">
            {MOCK_BUDGET_CATEGORIES.map((item) => (
              <CategoryRow key={item.id} item={item} />
            ))}
          </div>
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
            Agregar Categoría / Gasto
          </Button>
        </div>
      </div>

      {/* ── Add Category Dialog ── */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-md border-border/60 bg-card/95 backdrop-blur-xl">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold tracking-tight">
              Nueva Categoría de Gasto
            </DialogTitle>
            <DialogDescription className="text-sm">
              Define un presupuesto para una nueva categoría y haz seguimiento de tus gastos.
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
              onClick={() => setIsDialogOpen(false)}
              className="rounded-lg border-border/60 text-sm"
            >
              Cancelar
            </Button>
            <Button
              onClick={() => {
                // Placeholder — would dispatch to store in real app
                setIsDialogOpen(false);
                setNewCategoryName('');
                setNewCategoryBudget('');
              }}
              disabled={!newCategoryName || !newCategoryBudget}
              className="rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-sm"
            >
              Guardar Categoría
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
