import { useState, useCallback, useEffect, useRef, useMemo } from 'react';
import {
  Target, Shield, Sparkles, Gift, TrendingUp,
  ChevronDown, Clock, BadgeCheck, Store,
  Zap, Plus, Star, Loader2, CheckCircle2,
  Bot, Cpu, Users, Trash2, Trophy, Home,
  Building2, Landmark,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import { usePortalStore } from '@/features/portal/store/usePortalStore';
import { SUBCATEGORIAS } from '@/types';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { GoalMeta, PartnerOffer, GoalCategory } from '@/types';

// ───── Category config ─────

const CATEGORY_CONFIG: Record<string, { icon: string; color: string; bgColor: string }> = {
  Celular: { icon: '📱', color: 'text-sky-400', bgColor: 'bg-sky-500/10 border-sky-500/20' },
  Viaje: { icon: '✈️', color: 'text-amber-400', bgColor: 'bg-amber-500/10 border-amber-500/20' },
  Vivienda: { icon: '🏠', color: 'text-emerald-400', bgColor: 'bg-emerald-500/10 border-emerald-500/20' },
  Carro: { icon: '🚗', color: 'text-blue-400', bgColor: 'bg-blue-500/10 border-blue-500/20' },
  Moto: { icon: '🏍️', color: 'text-orange-400', bgColor: 'bg-orange-500/10 border-orange-500/20' },
  Computador: { icon: '💻', color: 'text-purple-400', bgColor: 'bg-purple-500/10 border-purple-500/20' },
  Remodelación: { icon: '🔨', color: 'text-rose-400', bgColor: 'bg-rose-500/10 border-rose-500/20' },
};

function formatCOP(value: number): string {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  return `$${value.toLocaleString('es-CO')}`;
}

function formatSubcatLabel(category: GoalCategory, subcatValue: string): string {
  const opts = SUBCATEGORIAS[category];
  if (!opts) return subcatValue;
  const found = opts.find((o) => o.value === subcatValue);
  return found ? found.label : subcatValue;
}

// ───── Aggregated offer types ─────

type OfferSector = 'constructoras' | 'banca' | 'establecimientos' | 'inversiones';

interface SectorOfferGroup {
  sector: OfferSector;
  label: string;
  icon: typeof Home;
  color: string;
  offers: PartnerOffer[];
}

function groupOffersBySector(offers: PartnerOffer[]): SectorOfferGroup[] {
  // Distribute mock offers across sectors based on commerce name patterns
  const sectors: SectorOfferGroup[] = [
    { sector: 'constructoras', label: 'Constructoras', icon: Home, color: 'text-purple-400', offers: [] },
    { sector: 'banca', label: 'Banca', icon: Building2, color: 'text-blue-400', offers: [] },
    { sector: 'establecimientos', label: 'Establecimientos', icon: Store, color: 'text-emerald-400', offers: [] },
    { sector: 'inversiones', label: 'Inversiones', icon: TrendingUp, color: 'text-amber-400', offers: [] },
  ];

  for (let i = 0; i < offers.length; i++) {
    const name = offers[i].commerceName.toLowerCase();
    if (name.includes('constructora') || name.includes('inmobiliaria') || name.includes('vivienda')) {
      sectors[0].offers.push(offers[i]);
    } else if (name.includes('banco') || name.includes('financiera')) {
      sectors[1].offers.push(offers[i]);
    } else if (name.includes('viaje') || name.includes('electro') || name.includes('tech') || name.includes('motor') || name.includes('auto') || name.includes('ferre')) {
      sectors[2].offers.push(offers[i]);
    } else {
      sectors[3].offers.push(offers[i]);
    }
  }

  return sectors.filter((s) => s.offers.length > 0);
}

// ───── Agent log lines (simulated orchestrator) ─────

const AGENT_LOG_LINES = [
  '🔍 Escaneando promociones activas en 12 comercios verificados con Sello de Confianza...',
  '📊 Recalculando fecha de cumplimiento optimizada según tu ahorro real.',
  '⚡ Certificación IFC enviada de forma 100% anónima a aliados estratégicos.',
  '🛡️ Verificando legalidad y procedencia de nuevas ofertas entrantes...',
  '🤝 Negociando condiciones preferenciales con comercios de tu categoría.',
  '📈 Actualizando proyección de ahorro con datos del último mes.',
  '🔐 Cifrando tu perfil financiero para distribución segura en la red Neggo.',
  '💡 Detectada una nueva oportunidad de ahorro — recalculando rutas de cumplimiento.',
];

// ───── Agent Orchestrator Panel ─────

function AgentOrchestrator({ goal }: { goal: GoalMeta }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [currentLogIndex, setCurrentLogIndex] = useState(0);
  const [isTyping, setIsTyping] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (isExpanded) {
      intervalRef.current = setInterval(() => {
        setIsTyping(true);
        setTimeout(() => {
          setCurrentLogIndex((prev) => (prev + 1) % AGENT_LOG_LINES.length);
          setIsTyping(false);
        }, 400);
      }, 2800);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isExpanded]);

  const toggleAgent = useCallback(() => setIsExpanded((prev) => !prev), []);
  const currentLog = AGENT_LOG_LINES[currentLogIndex];

  return (
    <div className="border-t border-border/40 bg-gradient-to-b from-emerald-500/5 to-transparent">
      {!isExpanded && (
        <button
          onClick={toggleAgent}
          className="w-full flex items-center gap-3 px-5 py-3 text-left transition-colors duration-200 hover:bg-emerald-500/5 cursor-pointer"
        >
          <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
            <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-30" />
            <div className="relative flex h-8 w-8 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
              <Bot className="h-4 w-4 text-emerald-400" />
            </div>
          </div>
          <div className="flex-1">
            <p className="text-xs font-semibold text-emerald-400 flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Agente Neggo Operando
            </p>
            <p className="text-[10px] text-muted-foreground">
              Optimizando tu meta automáticamente
            </p>
          </div>
          <ChevronDown className="h-3.5 w-3.5 text-emerald-400/60" />
        </button>
      )}

      {isExpanded && (
        <div className="animate-slide-up">
          <div className="px-5 py-3 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="relative flex h-7 w-7 items-center justify-center">
                  <div className="absolute inset-0 rounded-full bg-emerald-500/20 animate-ping opacity-30" />
                  <div className="relative flex h-7 w-7 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/30">
                    <Bot className="h-3.5 w-3.5 text-emerald-400" />
                  </div>
                </div>
                <span className="text-xs font-semibold text-emerald-400">Agente Neggo</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400/70">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  En vivo
                </span>
              </div>
            </div>

            <div className="rounded-lg bg-black/30 border border-emerald-500/10 p-3 space-y-1.5 font-mono text-[11px]">
              {[...Array(3)].map((_, i) => {
                const idx = (currentLogIndex - 3 + i + AGENT_LOG_LINES.length) % AGENT_LOG_LINES.length;
                return (
                  <p key={`prev-${i}`} className="text-emerald-400/40 leading-relaxed">
                    <span className="text-[9px] text-emerald-500/40 mr-2">
                      [{new Date(Date.now() - (3 - i) * 3000).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                    </span>
                    {AGENT_LOG_LINES[idx]}
                  </p>
                );
              })}
              <p className={cn('text-emerald-400 leading-relaxed', isTyping && 'opacity-60')}>
                <span className="text-[9px] text-emerald-500/60 mr-2">
                  [{new Date().toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}]
                </span>
                {currentLog}
                {isTyping && <span className="inline-block w-1.5 h-3.5 bg-emerald-400/60 ml-0.5 animate-pulse" />}
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-md bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-2 text-center">
                <p className="text-[9px] text-muted-foreground mb-0.5">Comercios</p>
                <p className="text-xs font-bold text-emerald-400 font-mono">12 activos</p>
              </div>
              <div className="rounded-md bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-2 text-center">
                <p className="text-[9px] text-muted-foreground mb-0.5">Ofertas</p>
                <p className="text-xs font-bold text-emerald-400 font-mono">{goal.offers.length} en competencia</p>
              </div>
              <div className="rounded-md bg-emerald-500/5 border border-emerald-500/10 px-2.5 py-2 text-center">
                <p className="text-[9px] text-muted-foreground mb-0.5">Ahorro pot.</p>
                <p className="text-xs font-bold text-emerald-400 font-mono">
                  {formatCOP(goal.offers.reduce((s, o) => s + o.savingsEstimate, 0))}
                </p>
              </div>
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={toggleAgent}
              className="w-full h-8 text-xs text-muted-foreground hover:text-foreground rounded-lg"
            >
              <ChevronDown className="h-3.5 w-3.5 rotate-180 mr-1.5" />
              Ocultar panel del agente
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ───── Offer Card (inside expanded panel) ─────

function OfferCard({ offer, rank }: { offer: PartnerOffer; rank: number }) {
  const medalColor =
    rank === 0 ? 'text-amber-400' : rank === 1 ? 'text-slate-300' : 'text-amber-700';

  return (
    <div
      className={cn(
        'group rounded-xl border border-border/40 bg-secondary/30 p-4',
        'transition-all duration-300 hover:bg-secondary/50 hover:border-border/60',
        'hover:shadow-md hover:shadow-black/10',
      )}
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-card border border-border/40 text-xs font-bold font-mono text-muted-foreground">
            {offer.commerceName.charAt(0)}
          </div>
          <div>
            <p className="text-xs font-semibold text-foreground">{offer.commerceName}</p>
            <div className="flex items-center gap-1 mt-0.5">
              <Shield className="h-3 w-3 text-emerald-400" />
              <p className="text-[10px] text-emerald-400/80 leading-tight">
                {offer.securityBadge}
              </p>
            </div>
          </div>
        </div>
        <span className={cn('text-base font-bold font-mono', medalColor)}>#{rank + 1}</span>
      </div>

      <div className="rounded-lg bg-card/60 border border-border/30 px-3 py-2.5 mb-3">
        <div className="flex items-center gap-1.5 mb-0.5">
          <Gift className="h-3.5 w-3.5 text-cyan-400" />
          <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
            Beneficio
          </span>
        </div>
        <p className="text-sm font-semibold text-cyan-300">{offer.benefit}</p>
      </div>

      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-md bg-card/40 px-2.5 py-2 text-center">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Ahorro Est.</p>
          <p className="text-xs font-bold text-emerald-400 font-mono">{formatCOP(offer.savingsEstimate)}</p>
        </div>
        <div className="rounded-md bg-card/40 px-2.5 py-2 text-center">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Cumplimiento</p>
          <p className="text-xs font-bold text-blue-400 font-mono">{offer.completionMonths} meses</p>
        </div>
        <div className="rounded-md bg-card/40 px-2.5 py-2 text-center">
          <p className="text-[9px] uppercase tracking-wider text-muted-foreground mb-0.5">Confianza</p>
          <p className="text-xs font-bold text-purple-400 font-mono">{offer.confidenceLevel}%</p>
        </div>
      </div>
    </div>
  );
}

// ───── Confetti Animation ─────

function ConfettiOverlay({ active }: { active: boolean }) {
  if (!active) return null;
  const particles = Array.from({ length: 40 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.8,
    duration: 1.5 + Math.random() * 2,
    color: ['#34d399', '#60a5fa', '#facc15', '#f472b6', '#a78bfa', '#f97316'][i % 6],
  }));

  return (
    <div className="absolute inset-0 pointer-events-none overflow-hidden z-50">
      {particles.map((p) => (
        <div
          key={p.id}
          className="absolute w-2 h-2 rounded-sm"
          style={{
            left: `${p.left}%`,
            top: '-4%',
            backgroundColor: p.color,
            animation: `confetti-fall ${p.duration}s ease-in ${p.delay}s forwards`,
          }}
        />
      ))}
    </div>
  );
}

// ───── Goal Card (with per-goal IFC Switch, delete/complete buttons) ─────

function GoalCard({
  goal,
  isIFCActive,
  onToggleIFC,
  onDelete,
  onComplete,
}: {
  goal: GoalMeta;
  isIFCActive: boolean;
  onToggleIFC: (goalId: string) => void;
  onDelete: (goalId: string) => void;
  onComplete: (goalId: string) => void;
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [offerSector, setOfferSector] = useState<OfferSector>('establecimientos');
  const config = CATEGORY_CONFIG[goal.category] ?? CATEGORY_CONFIG.Celular;
  const progressPercent = Math.min(100, Math.round((goal.savedAmount / goal.targetAmount) * 100));
  const remaining = goal.targetAmount - goal.savedAmount;
  const sectorGroups = useMemo(() => groupOffersBySector(goal.offers), [goal.offers]);
  const defaultSector = sectorGroups.length > 0 ? sectorGroups[0].sector : 'establecimientos';
  const activeSector = sectorGroups.some((s) => s.sector === offerSector) ? offerSector : defaultSector;
  const activeOffers = sectorGroups.find((s) => s.sector === activeSector)?.offers ?? [];
  const hasOffers = goal.offers.length > 0;

  const toggleExpand = useCallback(() => setIsExpanded((prev) => !prev), []);

  const handleComplete = useCallback(() => {
    setShowConfetti(true);
    setTimeout(() => {
      onComplete(goal.id);
      setShowConfetti(false);
    }, 2500);
  }, [goal.id, onComplete]);

  const handleDelete = useCallback(() => {
    onDelete(goal.id);
    toast.success('Meta eliminada', {
      description: `"${goal.category}" ha sido removida de tu lista activa.`,
    });
  }, [goal.id, goal.category, onDelete]);

  return (
    <div
      className={cn(
        'relative rounded-2xl border bg-card/60 overflow-hidden',
        'transition-all duration-300',
        isIFCActive
          ? 'border-cyan-500/40 shadow-lg shadow-cyan-500/10 ring-1 ring-cyan-500/20'
          : isExpanded
            ? 'border-border/60 shadow-lg shadow-black/10'
            : 'hover:border-border/50 hover:shadow-md hover:shadow-black/5',
      )}
    >
      <ConfettiOverlay active={showConfetti} />

      <div className="p-5 space-y-4">
        {/* ── Header: Category + IFC Toggle + Actions ── */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div
              className={cn(
                'flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border text-lg',
                config.bgColor,
              )}
            >
              {config.icon}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <p className="text-sm font-semibold text-foreground">{goal.category}</p>
                {goal.subcategoria && (
                  <span className="text-[10px] text-muted-foreground bg-muted/50 px-1.5 py-0.5 rounded">
                    {formatSubcatLabel(goal.category, goal.subcategoria)}
                  </span>
                )}
              </div>
              <p className="text-[11px] text-muted-foreground">
                Meta: {formatCOP(goal.targetAmount)}
                {goal.metadataAdicional?.personas && (
                  <span className="ml-1.5 text-muted-foreground/60">
                    — {goal.metadataAdicional.personas} personas
                  </span>
                )}
              </p>
            </div>
          </div>

          {/* Per-goal IFC Switch */}
          <div className="flex flex-col items-end gap-1">
            <div className="flex items-center gap-2">
              <span className="text-[10px] text-muted-foreground select-none">
                {isIFCActive ? 'IFC activo' : 'IFC'}
              </span>
              <Switch
                checked={isIFCActive}
                onCheckedChange={() => onToggleIFC(goal.id)}
                className={cn(
                  'scale-90',
                  isIFCActive && 'data-[state=checked]:bg-cyan-500',
                )}
              />
            </div>
            {isIFCActive && (
              <span className="inline-flex items-center gap-1 text-[9px] text-cyan-400 font-medium">
                <span className="h-1 w-1 rounded-full bg-cyan-400 animate-pulse" />
                Competencia anónima activa
              </span>
            )}
          </div>
        </div>

        {/* ── Progress section ── */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-[11px]">
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <Target className="h-3 w-3" />
              Progreso de ahorro
            </span>
            <span className="font-mono font-semibold text-foreground">
              {formatCOP(goal.savedAmount)} / {formatCOP(goal.targetAmount)}
            </span>
          </div>
          <Progress
            value={progressPercent}
            className={cn(
              'h-2',
              progressPercent >= 70
                ? '[&>div]:bg-emerald-500'
                : progressPercent >= 40
                  ? '[&>div]:bg-blue-500'
                  : '[&>div]:bg-amber-500',
            )}
          />
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-muted-foreground">
              Faltan{' '}
              <span className="font-mono font-semibold text-foreground">
                {formatCOP(remaining)}
              </span>
            </span>
            <span className="font-mono font-semibold text-foreground">{progressPercent}%</span>
          </div>
        </div>

        {/* ── Monthly goal + notification pill ── */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <Clock className="h-3 w-3" />
            Ahorro mensual:{' '}
            <span className="font-mono font-semibold text-foreground">
              {formatCOP(goal.monthlyGoal)}
            </span>
          </div>

          {hasOffers && isIFCActive && !isExpanded && (
            <button
              onClick={toggleExpand}
              className="flex items-center gap-1.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 transition-all duration-200 hover:bg-cyan-500/15 cursor-pointer"
            >
              <Sparkles className="h-3 w-3 text-cyan-400" />
              <span className="text-[11px] font-semibold text-cyan-400">
                {goal.offers.length} Ofertas Disponibles
              </span>
              <ChevronDown className="h-3 w-3 text-cyan-400/60" />
            </button>
          )}

          {!hasOffers && isIFCActive && (
            <p className="text-[10px] text-muted-foreground italic">
              Esperando ofertas de aliados...
            </p>
          )}

          {!isIFCActive && (
            <p className="text-[10px] text-muted-foreground/50 italic">
              Meta de ahorro privada — activa IFC para recibir ofertas
            </p>
          )}
        </div>

        {/* ── Action Buttons: Delete + Complete ── */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleDelete(); }}
            className="flex-1 h-8 gap-1.5 text-xs border-border/40 bg-card/40 text-muted-foreground hover:text-red-400 hover:border-red-500/30 hover:bg-red-500/5 rounded-lg transition-all"
          >
            <Trash2 className="h-3 w-3" />
            Eliminar
          </Button>
          <Button
            size="sm"
            onClick={(e) => { e.stopPropagation(); handleComplete(); }}
            className="flex-1 h-8 gap-1.5 text-xs bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-black font-semibold rounded-lg shadow-sm shadow-amber-500/20 transition-all hover:scale-[1.02]"
          >
            <Trophy className="h-3 w-3" />
            ¡Meta Lograda! 🎉
          </Button>
        </div>
      </div>

      {/* ── Expandable Offers Panel with Sector Tabs ── */}
      {isExpanded && hasOffers && isIFCActive && (
        <div className="border-t border-border/40 bg-gradient-to-b from-card/50 to-background/50 px-5 py-4 animate-slide-up">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="flex h-6 w-6 items-center justify-center rounded-md bg-cyan-500/10 border border-cyan-500/20">
                <Zap className="h-3 w-3 text-cyan-400" />
              </div>
              <h4 className="text-xs font-semibold text-foreground">
                Propuestas Neggo por Sector
              </h4>
            </div>
            <span className="text-[10px] text-muted-foreground">
              Seleccionadas por algoritmo anti-saturación
            </span>
          </div>

          {/* Sector Tabs */}
          {sectorGroups.length > 1 && (
            <Tabs
              value={activeSector}
              onValueChange={(v) => setOfferSector(v as OfferSector)}
              className="mb-3"
            >
              <TabsList className="h-9 w-full justify-start gap-0 bg-transparent p-0 border-b border-border/30 rounded-none">
                {sectorGroups.map((sg) => (
                  <TabsTrigger
                    key={sg.sector}
                    value={sg.sector}
                    className={cn(
                      'relative flex items-center gap-1.5 rounded-none border-b-2 border-transparent px-3 py-2 text-[10px] font-medium text-muted-foreground transition-all',
                      'data-[state=active]:border-cyan-500 data-[state=active]:text-cyan-400 data-[state=active]:bg-transparent',
                      'hover:text-foreground',
                    )}
                  >
                    <sg.icon className="h-3 w-3" />
                    {sg.label}
                    <span className="ml-0.5 text-[9px] opacity-60">({sg.offers.length})</span>
                  </TabsTrigger>
                ))}
              </TabsList>
            </Tabs>
          )}

          {/* Active sector offers */}
          <div className="space-y-3 mb-4">
            {activeOffers.map((offer, idx) => (
              <OfferCard key={offer.id} offer={offer} rank={idx} />
            ))}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={toggleExpand}
            className="w-full h-9 text-xs text-muted-foreground hover:text-foreground rounded-xl"
          >
            <ChevronDown className="h-3.5 w-3.5 rotate-180 mr-1.5" />
            Ocultar ofertas
          </Button>
        </div>
      )}

      {/* ── Agent Orchestrator (only when IFC is active for this goal) ── */}
      {isIFCActive && <AgentOrchestrator goal={goal} />}
    </div>
  );
}

// ───── Goal Categories ─────

const GOAL_CATEGORIES: { id: GoalCategory; label: string; emoji: string }[] = [
  { id: 'Celular', label: 'Celular', emoji: '📱' },
  { id: 'Viaje', label: 'Viaje', emoji: '✈️' },
  { id: 'Vivienda', label: 'Vivienda', emoji: '🏠' },
  { id: 'Carro', label: 'Carro', emoji: '🚗' },
  { id: 'Moto', label: 'Moto', emoji: '🏍️' },
  { id: 'Computador', label: 'Computador', emoji: '💻' },
  { id: 'Remodelación', label: 'Remodelación de Casa', emoji: '🔨' },
];

// ───── Crear Meta Dialog (with dynamic subcategories) ─────

function CrearMetaDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const addMeta = usePortalStore((s) => s.addMeta);
  const [category, setCategory] = useState<GoalCategory | null>(null);
  const [subcategoria, setSubcategoria] = useState('');
  const [personas, setPersonas] = useState('');
  const [targetAmount, setTargetAmount] = useState('');
  const [monthlyGoal, setMonthlyGoal] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done'>('idle');

  const subOptions = category ? SUBCATEGORIAS[category] : [];
  const needsPersonas = category === 'Viaje';

  const canSubmit =
    category !== null &&
    targetAmount.trim() !== '' &&
    Number(targetAmount) > 0 &&
    monthlyGoal.trim() !== '' &&
    Number(monthlyGoal) > 0 &&
    submitState === 'idle';

  const handleSubmit = useCallback(() => {
    if (!canSubmit || category === null) return;
    setSubmitState('loading');
    const nuevaMeta: GoalMeta = {
      id: `META-${Date.now()}`,
      category,
      subcategoria: subcategoria || undefined,
      metadataAdicional:
        needsPersonas && personas ? { personas: Number(personas) } : undefined,
      targetAmount: Number(targetAmount),
      savedAmount: 0,
      monthlyGoal: Number(monthlyGoal),
      ifcCertified: false,
      status: 'active',
      offers: [],
    };
    void addMeta(nuevaMeta).then(() => {
      setSubmitState('done');
      setTimeout(() => {
        setSubmitState('idle');
        setCategory(null);
        setSubcategoria('');
        setPersonas('');
        setTargetAmount('');
        setMonthlyGoal('');
        onOpenChange(false);
      }, 1500);
    });
  }, [canSubmit, category, subcategoria, personas, needsPersonas, targetAmount, monthlyGoal, addMeta, onOpenChange]);

  const formatCOPVal = (val: string) => {
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
            <p className="text-base font-semibold text-foreground mb-1">Meta creada exitosamente</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Tu meta de ahorro ha sido registrada. Activa la IFC desde la tarjeta de tu meta para
              empezar a recibir ofertas de comercios aliados.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {/* Category */}
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Categoría
              </label>
              <Select
                value={category ?? ''}
                onValueChange={(val) => {
                  setCategory(val as GoalCategory);
                  setSubcategoria('');
                  setPersonas('');
                }}
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

            {/* Dynamic Subcategory */}
            {category && subOptions.length > 0 && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  {category === 'Viaje' ? 'Tipo de Viaje' : 'Subcategoría'}
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {subOptions.map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => setSubcategoria(opt.value)}
                      className={cn(
                        'rounded-lg border px-3 py-2 text-xs font-medium transition-all',
                        subcategoria === opt.value
                          ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400 shadow-sm shadow-cyan-500/10'
                          : 'border-border/40 bg-card text-muted-foreground hover:border-cyan-500/30 hover:text-foreground',
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Viaje: Cantidad de personas */}
            {needsPersonas && (
              <div className="space-y-2 animate-fade-in">
                <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Cantidad aproximada de personas
                </label>
                <div className="relative">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    min="1"
                    max="20"
                    placeholder="ej. 2"
                    value={personas}
                    onChange={(e) => setPersonas(e.target.value)}
                    className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono pl-10"
                  />
                </div>
              </div>
            )}

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
                <p className="text-[11px] text-cyan-400 font-mono">{formatCOPVal(targetAmount)}</p>
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

// ───── Completed Goals View ─────

function CompletedGoalCard({ goal }: { goal: GoalMeta }) {
  const config = CATEGORY_CONFIG[goal.category] ?? CATEGORY_CONFIG.Celular;
  return (
    <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-4 opacity-80 hover:opacity-100 transition-opacity">
      <div className="flex items-center gap-3 mb-2">
        <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg border text-base', config.bgColor)}>
          {config.icon}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <p className="text-sm font-medium text-foreground">{goal.category}</p>
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" />
          </div>
          <p className="text-[10px] text-muted-foreground">
            Meta completada: {formatCOP(goal.targetAmount)}
            {goal.completedAt && (
              <span className="ml-1 text-emerald-400/60">
                — {new Date(goal.completedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', year: 'numeric' })}
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2 rounded-md bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
        <Trophy className="h-3.5 w-3.5 text-emerald-400" />
        <p className="text-[11px] text-emerald-400 font-medium">Meta lograda con éxito</p>
      </div>
    </div>
  );
}

// ───── Main Metas View ─────

export default function MetasView() {
  const { metas, hydrateMetas, isMetasLoading, toggleMetaIFC, deleteMeta, completeMeta } = usePortalStore();
  const [isCrearMetaOpen, setIsCrearMetaOpen] = useState(false);

  // Hidrata las metas desde la base de datos real al montar la vista
  useEffect(() => {
    void hydrateMetas();
  }, [hydrateMetas]);

  const toggleIFC = useCallback(
    (goalId: string) => {
      void toggleMetaIFC(goalId);
    },
    [toggleMetaIFC],
  );

  const handleDelete = useCallback(
    (goalId: string) => {
      void deleteMeta(goalId);
    },
    [deleteMeta],
  );

  const handleComplete = useCallback(
    (goalId: string) => {
      void completeMeta(goalId);
    },
    [completeMeta],
  );

  const activeMetas = metas.filter((g) => g.status !== 'deleted' && g.status !== 'completed');
  const completedMetas = metas.filter((g) => g.status === 'completed');
  const totalGoals = activeMetas.length;
  const activeIFCCount = activeMetas.filter((g) => g.ifcCertified).length;
  const totalSaved = activeMetas.reduce((sum, g) => sum + g.savedAmount, 0);
  const totalTarget = activeMetas.reduce((sum, g) => sum + g.targetAmount, 0);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
              <Target className="h-3.5 w-3.5 text-cyan-400" />
            </div>
            <h2 className="text-base font-semibold text-foreground">
              Mis Metas Financieras
            </h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Activa el Sello IFC en cada meta para que los comercios aliados compitan por ti de forma anónima
          </p>
          {isMetasLoading && (
            <p className="flex items-center gap-1.5 text-[11px] text-cyan-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Sincronizando metas con la base de datos...
            </p>
          )}
        </div>

        <Button
          onClick={() => setIsCrearMetaOpen(true)}
          className={cn(
            'shrink-0 h-10 gap-2 rounded-xl px-4 font-semibold text-sm',
            'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white',
            'shadow-lg shadow-cyan-600/20 transition-all duration-200 hover:shadow-cyan-500/30 hover:scale-[1.02]',
          )}
        >
          <Plus className="h-4 w-4" />
          Crear Nueva Meta
        </Button>
      </div>

      {/* Summary KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Metas activas</p>
          <p className="text-2xl font-bold text-foreground font-mono">{totalGoals}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">IFC activas</p>
          <p className="text-2xl font-bold text-cyan-400 font-mono">{activeIFCCount}/{totalGoals}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ahorro total</p>
          <p className="text-2xl font-bold text-emerald-400 font-mono">{formatCOP(totalSaved)}</p>
        </div>
        <div className="rounded-xl border border-border/40 bg-card/60 p-4 text-center">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Meta total</p>
          <p className="text-2xl font-bold text-blue-400 font-mono">{formatCOP(totalTarget)}</p>
        </div>
      </div>

      {/* Goals Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {activeMetas.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            isIFCActive={goal.ifcCertified}
            onToggleIFC={toggleIFC}
            onDelete={handleDelete}
            onComplete={handleComplete}
          />
        ))}
      </div>

      {/* Completed goals section */}
      {completedMetas.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <Trophy className="h-4 w-4 text-emerald-400" />
            <h3 className="text-sm font-semibold text-foreground">Metas Completadas</h3>
            <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-[10px]">
              {completedMetas.length}
            </Badge>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
            {completedMetas.map((goal) => (
              <CompletedGoalCard key={goal.id} goal={goal} />
            ))}
          </div>
        </div>
      )}

      {/* Bottom hint for goals without IFC */}
      {activeIFCCount < totalGoals && totalGoals > 0 && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 p-4">
          <Shield className="h-4 w-4 shrink-0 text-amber-400" />
          <p className="text-xs text-amber-400/80">
            Algunas metas no tienen el Sello IFC activado. Usa el switch dentro de cada tarjeta para
            activar la competencia comercial anónima y recibir ofertas de aliados verificados.
          </p>
        </div>
      )}

      {/* Crear Meta Dialog */}
      <CrearMetaDialog open={isCrearMetaOpen} onOpenChange={setIsCrearMetaOpen} />
    </div>
  );
}
