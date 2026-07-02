import { useState, useMemo, useCallback } from 'react';
import {
  Gift, Percent, MapPin, TrendingUp, CreditCard,
  Loader2, CheckCircle2, Sparkles, Building2,
  Clock, Users, Target, Star,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { campaigns } from '@/data/mock';
import { usePortalStore } from '@/features/portal/store/usePortalStore';
import { cn } from '@/lib/utils';
import { useRejectionTracking } from '@/hooks/useRejectionTracking';
import type { Campaign } from '@/types';
import type { GoalCategory } from '@/types';

// ───── Type icons ─────

const TYPE_ICONS: Record<string, React.ReactNode> = {
  cdt: <TrendingUp className="h-4 w-4" />,
  hipotecario: <Building2 className="h-4 w-4" />,
  'compra-cartera': <CreditCard className="h-4 w-4" />,
  tarjetas: <CreditCard className="h-4 w-4" />,
  libranzas: <Gift className="h-4 w-4" />,
  vehiculos: <span className="text-sm">🚗</span>,
  inversiones: <TrendingUp className="h-4 w-4" />,
};

const TYPE_LABELS: Record<string, string> = {
  cdt: 'CDT',
  hipotecario: 'Crédito Hipotecario',
  'compra-cartera': 'Compra de Cartera',
  tarjetas: 'Tarjeta de Crédito',
  libranzas: 'Libranza',
  vehiculos: 'Crédito Vehículo',
  inversiones: 'Inversión',
};

// ───── Campaign Card ─────

function OfferCard({ campaign }: { campaign: Campaign }) {
  const [requestState, setRequestState] = useState<'idle' | 'loading' | 'done'>('idle');
  const [isRejected, setIsRejected] = useState(campaign.offerStatus === 'rejected');
  const { trackRejection } = useRejectionTracking();

  const spentPercent = Math.min(100, Math.round((campaign.spent / campaign.budget) * 100));
  const remaining = campaign.budget - campaign.spent;
  const isUrgent = spentPercent > 70;

  const handleSolicitar = useCallback(() => {
    setRequestState('loading');
    setTimeout(() => setRequestState('done'), 1200);
  }, []);

  const handleReject = useCallback(() => {
    void trackRejection({
      offerId: campaign.id,
      sector: 'banca',
      productType: TYPE_LABELS[campaign.type] ?? campaign.type,
      entityName: campaign.bank,
      onRejected: () => setIsRejected(true),
    });
  }, [campaign.id, campaign.bank, campaign.type, trackRejection]);

  if (isRejected) {
    return (
      <div className="rounded-2xl border border-border/20 bg-secondary/10 p-5 opacity-40 pointer-events-none">
        <p className="text-[11px] text-muted-foreground italic text-center">Oferta descartada</p>
      </div>
    );
  }

  return (
    <div
      className={cn(
        'group relative rounded-2xl border bg-card/60 overflow-hidden',
        'transition-all duration-300 hover:bg-card/90',
        'hover:border-border/60 hover:shadow-xl hover:shadow-black/10',
        'hover:-translate-y-0.5',
      )}
    >
      {/* Subtle top glow accent */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-px',
          isUrgent
            ? 'bg-gradient-to-r from-transparent via-amber-400/40 to-transparent'
            : 'bg-gradient-to-r from-transparent via-blue-400/30 to-transparent',
        )}
      />

      <div className="p-5 space-y-4">
        {/* ── Header: Bank + Product Type ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            {/* Bank initial */}
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-blue-500/10 border border-blue-500/20 text-sm font-bold text-blue-400 font-mono">
              {campaign.bank.charAt(0)}
            </div>
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                {campaign.bank}
              </p>
              <div className="flex items-center gap-1.5 mt-0.5">
                <span className="text-cyan-400/60">{TYPE_ICONS[campaign.type]}</span>
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {TYPE_LABELS[campaign.type] ?? campaign.type}
                </h4>
              </div>
            </div>
          </div>

          {/* Match badge */}
          <Badge className="shrink-0 bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-[10px] gap-1 px-2 py-0.5 font-medium rounded-full">
            <Sparkles className="h-2.5 w-2.5" />
            Match Perfecto
          </Badge>
        </div>

        {/* ── Tasa destacada ── */}
        <div className="rounded-xl border border-border/40 bg-secondary/30 p-4 text-center">
          <p className="text-[10px] font-semibold uppercase tracking-[0.15em] text-muted-foreground mb-1">
            Tasa de Interés
          </p>
          <p className="text-3xl font-bold font-mono text-cyan-300 tracking-tight">
            {campaign.tasa}
          </p>
        </div>

        {/* ── Meta row: cities + score range ── */}
        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3 text-emerald-400" />
            {campaign.cities.join(', ')}
          </span>
          <span className="text-border/60">|</span>
          <span className="flex items-center gap-1">
            <Users className="h-3 w-3 text-blue-400" />
            Score {campaign.minScore}–{campaign.maxScore}
          </span>
        </div>

        {/* ── Budget bar ── */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground flex items-center gap-1">
              <Clock className="h-3 w-3" />
              Cupo disponible
            </span>
            <span className={cn('font-mono font-semibold', isUrgent ? 'text-amber-400' : 'text-emerald-400')}>
              ${(remaining / 1_000_000).toFixed(1)}M COP
            </span>
          </div>
          <Progress
            value={spentPercent}
            className={cn(
              'h-1.5',
              isUrgent
                ? '[&>div]:bg-amber-500'
                : spentPercent > 50
                  ? '[&>div]:bg-blue-500'
                  : '[&>div]:bg-emerald-500',
            )}
          />
          <p className={cn('text-[10px]', isUrgent ? 'text-amber-400/70' : 'text-muted-foreground')}>
            {isUrgent
              ? `¡${100 - spentPercent}% restante — apresúrate!`
              : `${spentPercent}% del presupuesto utilizado`}
          </p>
        </div>

        {/* ── Campaign Name ── */}
        <p className="text-xs text-muted-foreground leading-relaxed line-clamp-1">
          {campaign.name} — {campaign.leadsGenerated} leads generados
        </p>

        {/* ── Reject button ── */}
        <button
          onClick={(e) => { e.stopPropagation(); handleReject(); }}
          className="w-full flex items-center justify-center gap-1.5 rounded-lg border border-border/20 bg-transparent px-3 py-1.5 text-[10px] text-muted-foreground/50 hover:text-red-400/70 hover:border-red-500/20 hover:bg-red-500/5 transition-all cursor-pointer"
        >
          No me interesa
        </button>

        {/* ── CTA ── */}
        <Button
          disabled={requestState !== 'idle'}
          onClick={handleSolicitar}
          className={cn(
            'w-full h-10 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
            requestState === 'idle' &&
              'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20 hover:shadow-cyan-600/30',
            requestState === 'loading' &&
              'bg-cyan-700 text-cyan-300 cursor-wait',
            requestState === 'done' &&
              'bg-emerald-600/50 text-emerald-300 border border-emerald-500/30 cursor-default',
          )}
        >
          {requestState === 'idle' && (
            <>
              Solicitar más información
              <Sparkles className="h-3.5 w-3.5" />
            </>
          )}
          {requestState === 'loading' && (
            <>
              <Loader2 className="h-4 w-4 animate-spin" />
              Enviando solicitud...
            </>
          )}
          {requestState === 'done' && (
            <>
              <CheckCircle2 className="h-4 w-4" />
              Solicitado
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

// ───── Main View ─────

// ───── Meta creation dialog ─────

const GOAL_CATEGORIES: { id: GoalCategory; label: string; emoji: string }[] = [
  { id: 'Celular', label: 'Celular', emoji: '📱' },
  { id: 'Viaje', label: 'Viaje', emoji: '✈️' },
  { id: 'Vivienda', label: 'Vivienda', emoji: '🏠' },
  { id: 'Carro', label: 'Carro', emoji: '🚗' },
  { id: 'Moto', label: 'Moto', emoji: '🏍️' },
  { id: 'Computador', label: 'Computador', emoji: '💻' },
  { id: 'Remodelación', label: 'Remodelación de Casa', emoji: '🔨' },
];

function CrearMetaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const [category, setCategory] = useState<GoalCategory | null>(null);
  const [targetAmount, setTargetAmount] = useState('');
  const [monthlyGoal, setMonthlyGoal] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done'>('idle');

  const canSubmit =
    category !== null &&
    targetAmount.trim() !== '' &&
    Number(targetAmount) > 0 &&
    monthlyGoal.trim() !== '' &&
    Number(monthlyGoal) > 0 &&
    submitState === 'idle';

  const handleSubmit = useCallback(() => {
    if (!canSubmit) return;
    setSubmitState('loading');
    setTimeout(() => {
      setSubmitState('done');
      setTimeout(() => {
        setSubmitState('idle');
        setCategory(null);
        setTargetAmount('');
        setMonthlyGoal('');
        onOpenChange(false);
      }, 1500);
    }, 1000);
  }, [canSubmit, onOpenChange]);

  const formatCOP = (val: string) => {
    const num = Number(val);
    if (isNaN(num) || num === 0) return '';
    if (num >= 1_000_000) return `$${(num / 1_000_000).toFixed(1)}M COP`;
    return `$${num.toLocaleString('es-CO')} COP`;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Star className="h-5 w-5 text-amber-400" />
            Crear Nueva Meta de Ahorro
          </DialogTitle>
          <DialogDescription className="text-sm">
            Define tu meta financiera. Cuando actives la IFC, los comercios aliados de Neggo
            competirán por ofrecerte las mejores condiciones.
          </DialogDescription>
        </DialogHeader>

        {submitState === 'done' ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">
              Meta creada exitosamente
            </p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Tu meta de ahorro ha sido registrada. Activa tu IFC para empezar a recibir ofertas
              de comercios aliados.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Category Select */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Categoría
              </label>
              <Select
                value={category ?? ''}
                onValueChange={(val) => setCategory(val as GoalCategory)}
              >
                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                  <SelectValue placeholder="¿Para qué estás ahorrando?" />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl">
                  {GOAL_CATEGORIES.map((cat) => (
                    <SelectItem key={cat.id} value={cat.id} className="cursor-pointer text-sm">
                      <span className="flex items-center gap-2">
                        <span>{cat.emoji}</span>
                        <span>{cat.label}</span>
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target Amount */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Monto Objetivo (COP)
              </label>
              <Input
                type="number"
                placeholder="ej. 15.000.000"
                value={targetAmount}
                onChange={(e) => setTargetAmount(e.target.value)}
                className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono"
              />
              {targetAmount && Number(targetAmount) > 0 && (
                <p className="text-[11px] text-cyan-400 font-mono">
                  {formatCOP(targetAmount)}
                </p>
              )}
            </div>

            {/* Monthly Goal */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Ahorro Mensual (COP)
              </label>
              <Input
                type="number"
                placeholder="ej. 1.200.000"
                value={monthlyGoal}
                onChange={(e) => setMonthlyGoal(e.target.value)}
                className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono"
              />
              {monthlyGoal && Number(monthlyGoal) > 0 && targetAmount && Number(targetAmount) > 0 && (
                <p className="text-[11px] text-blue-400 font-mono">
                  Alcanzarás tu meta en aproximadamente{' '}
                  {Math.ceil(Number(targetAmount) / Number(monthlyGoal))} meses
                </p>
              )}
            </div>

            {/* Submit */}
            <Button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={cn(
                'w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
                canSubmit
                  ? 'bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {submitState === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando meta...
                </>
              ) : (
                <>
                  <Star className="h-4 w-4" />
                  Crear Meta de Ahorro
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ───── Main OfertasView ─────

export default function OfertasView() {
  const { currentClient } = usePortalStore();
  const [isCrearMetaOpen, setCrearMetaOpen] = useState(false);

  const matchingCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      // Only active campaigns
      if (c.status !== 'activa') return false;
      // City must match
      const cityMatch = c.cities.includes(currentClient.city);
      if (!cityMatch) return false;
      // Score must be in range
      const scoreMatch =
        currentClient.score >= c.minScore &&
        currentClient.score <= c.maxScore;
      return scoreMatch;
    });
  }, [currentClient.city, currentClient.score]);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Gift className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Ofertas para ti
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Campañas financieras que coinciden con tu perfil en{' '}
            <span className="font-semibold text-cyan-400">{currentClient.city}</span>{' '}
            — Score <span className="font-mono text-cyan-400">{currentClient.score}</span>
          </p>
        </div>

        <Badge className="self-start bg-cyan-500/10 text-cyan-400 border-cyan-500/20 text-xs px-3 py-1 gap-1.5 font-medium">
          <Sparkles className="h-3 w-3" />
          {matchingCampaigns.length} ofertas disponibles
        </Badge>
      </div>

      {/* Crear Meta banner */}
      <div className="rounded-xl border border-amber-500/20 bg-amber-500/5 p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 border border-amber-500/20">
            <Target className="h-4.5 w-4.5 text-amber-400" />
          </div>
          <div>
            <p className="text-sm font-semibold text-foreground">
              ¿Tienes una meta de ahorro en mente?
            </p>
            <p className="text-xs text-muted-foreground">
              Crea tu meta y deja que los comercios aliados de Neggo compitan por ofrecerte las mejores condiciones.
            </p>
          </div>
        </div>
        <Button
          onClick={() => setCrearMetaOpen(true)}
          className="shrink-0 h-10 gap-2 rounded-xl px-5 font-semibold text-sm bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition-all duration-200 hover:shadow-amber-500/30 hover:scale-[1.02]"
        >
          <Star className="h-4 w-4" />
          Crear Nueva Meta de Ahorro
        </Button>
      </div>

      {/* Matching logic summary */}
      <div className="rounded-xl border border-border/40 bg-card/60 p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tu ciudad</p>
            <p className="text-sm font-semibold text-emerald-400 flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5" />
              {currentClient.city}
            </p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Tu score</p>
            <p className="text-sm font-semibold text-blue-400 font-mono">{currentClient.score}</p>
          </div>
          <div className="space-y-1">
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Perfil</p>
            <p className="text-sm font-semibold text-foreground">{currentClient.type}</p>
          </div>
        </div>
      </div>

      {/* Grid of matching offers */}
      {matchingCampaigns.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {matchingCampaigns.map((campaign) => (
            <OfferCard key={campaign.id} campaign={campaign} />
          ))}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-card/60 border border-border/40 mb-4">
            <Gift className="h-7 w-7 text-muted-foreground" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-1">
            Sin ofertas disponibles
          </h3>
          <p className="text-sm text-muted-foreground max-w-sm">
            No encontramos campañas activas que coincidan con tu perfil en {currentClient.city}.
            Revisa más tarde o actualiza tus preferencias.
          </p>
        </div>
      )}

      {/* Crear Meta Dialog */}
      <CrearMetaDialog open={isCrearMetaOpen} onOpenChange={setCrearMetaOpen} />
    </div>
  );
}
