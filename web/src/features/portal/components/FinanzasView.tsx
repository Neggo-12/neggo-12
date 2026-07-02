import { TrendingUp, TrendingDown, BookOpen, Clock, ChevronRight } from 'lucide-react';
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from '@/components/ui/accordion';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { MOCK_ECONOMIC_NEWS, MOCK_EDUCATION_MODULES } from '@/features/portal/data/mock';
import type { EconomicNews, EducationModule } from '@/features/portal/data/mock';

// ───── Icon map for education modules ─────

const ICON_MAP: Record<string, React.ReactNode> = {
  TrendingUp: <TrendingUp className="h-5 w-5" />,
  Calculator: <span className="text-lg font-mono font-bold">∑</span>,
  Landmark: <span className="text-lg font-mono font-bold">⌂</span>,
  Home: <span className="text-lg font-mono font-bold">⌂</span>,
  Shield: <span className="text-lg font-mono font-bold">🛡</span>,
  CreditCard: <span className="text-lg font-mono font-bold">💳</span>,
};

// ───── News Card ─────

function NewsCard({ item }: { item: EconomicNews }) {
  const isPositive = item.impact === 'positive';

  return (
    <div
      className={cn(
        'group rounded-xl border bg-card/60 p-5 transition-all duration-300',
        'hover:bg-card/90 hover:border-border/60',
        'hover:shadow-lg hover:shadow-black/10',
      )}
    >
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 mb-3">
        <div className="flex items-center gap-2">
          {isPositive ? (
            <TrendingUp className="h-4 w-4 text-emerald-400 shrink-0" />
          ) : (
            <TrendingDown className="h-4 w-4 text-red-400 shrink-0" />
          )}
          <Badge
            className={cn(
              'text-[10px] font-semibold px-2 py-0.5 rounded-md border',
              isPositive
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-red-500/10 text-red-400 border-red-500/20',
            )}
          >
            {isPositive ? 'Positivo' : 'Negativo'}
          </Badge>
        </div>
        <span className="text-[11px] text-muted-foreground whitespace-nowrap">{item.date}</span>
      </div>

      {/* Title & summary */}
      <h4 className="text-sm font-semibold text-foreground mb-1.5 leading-snug">{item.title}</h4>
      <p className="text-xs text-muted-foreground leading-relaxed mb-4">{item.summary}</p>

      {/* Accordion — "¿Cómo te afecta?" */}
      <Accordion type="single" collapsible className="border-t border-border/40 pt-1">
        <AccordionItem value={item.id} className="border-b-0">
          <AccordionTrigger className="py-2.5 text-xs font-semibold text-blue-400 hover:text-blue-300 hover:no-underline transition-colors">
            <span className="flex items-center gap-1.5">
              <span className="flex h-4 w-4 items-center justify-center rounded bg-blue-500/10 text-[10px]">?</span>
              ¿Cómo te afecta?
            </span>
          </AccordionTrigger>
          <AccordionContent>
            <p className="text-xs text-muted-foreground leading-relaxed bg-secondary/40 rounded-lg p-3 border border-border/30">
              {item.affectExplanation}
            </p>
          </AccordionContent>
        </AccordionItem>
      </Accordion>
    </div>
  );
}

// ───── Education Card ─────

function EducationCard({ item }: { item: EducationModule }) {
  return (
    <div
      className={cn(
        'group relative rounded-xl border bg-card/60 p-5 cursor-pointer',
        'transition-all duration-300 hover:scale-[1.02]',
        'hover:bg-card/90 hover:border-border/60',
        'hover:shadow-lg hover:shadow-black/10',
      )}
    >
      {/* Icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20 text-blue-400 mb-3 group-hover:bg-blue-500/15 transition-colors">
        {ICON_MAP[item.icon] ?? <BookOpen className="h-5 w-5" />}
      </div>

      {/* Category badge */}
      <Badge className="text-[10px] mb-2 bg-secondary/60 text-muted-foreground border-border/30 rounded-md font-normal">
        {item.category}
      </Badge>

      {/* Title */}
      <h4 className="text-sm font-semibold text-foreground mb-1.5 leading-snug group-hover:text-blue-400 transition-colors">
        {item.title}
      </h4>

      {/* Description */}
      <p className="text-xs text-muted-foreground leading-relaxed line-clamp-2">{item.description}</p>

      {/* Footer */}
      <div className="flex items-center justify-between mt-4 pt-3 border-t border-border/40">
        <span className="flex items-center gap-1 text-[11px] text-muted-foreground">
          <Clock className="h-3 w-3" />
          {item.readTime}
        </span>
        <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
      </div>
    </div>
  );
}

// ───── Main Finanzas View ─────

export default function FinanzasView() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-6 animate-fade-in">
      {/* ── LEFT: Noticias del Banco de la República (3 cols on lg) ── */}
      <div className="lg:col-span-3 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
            <TrendingUp className="h-3.5 w-3.5 text-blue-400" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Noticias del Banco de la República
          </h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-2 mb-4">
          Información económica relevante y cómo impacta tus finanzas personales
        </p>

        <div className="space-y-3">
          {MOCK_ECONOMIC_NEWS.map((item) => (
            <NewsCard key={item.id} item={item} />
          ))}
        </div>
      </div>

      {/* ── RIGHT: Biblioteca de Educación Financiera (2 cols on lg) ── */}
      <div className="lg:col-span-2 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-purple-500/10 border border-purple-500/20">
            <BookOpen className="h-3.5 w-3.5 text-purple-400" />
          </div>
          <h2 className="text-base font-semibold text-foreground">
            Biblioteca de Educación Financiera
          </h2>
        </div>
        <p className="text-xs text-muted-foreground -mt-2 mb-4">
          Aprende a manejar tu dinero con módulos cortos y prácticos
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2 gap-3">
          {MOCK_EDUCATION_MODULES.map((item) => (
            <EducationCard key={item.id} item={item} />
          ))}
        </div>
      </div>
    </div>
  );
}
