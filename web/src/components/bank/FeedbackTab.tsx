import { useState } from 'react';
import {
  ThumbsUp, AlertTriangle, Lightbulb, Frown,
  Star, Clock, CheckCircle2, ArrowUpRight, MessageSquare,
  Filter, Search
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { feedbacks } from '@/data/mock';
import { cn } from '@/lib/utils';
import type { FeedbackType, FeedbackStatus } from '@/types';

const typeConfig: Record<FeedbackType, { label: string; icon: typeof ThumbsUp; bg: string; text: string; border: string }> = {
  felicitacion: { label: 'Felicitación', icon: ThumbsUp, bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  problema: { label: 'Problema', icon: AlertTriangle, bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  sugerencia: { label: 'Sugerencia', icon: Lightbulb, bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'mala-atencion': { label: 'Mala Atención', icon: Frown, bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
};

const statusConfig: Record<FeedbackStatus, { label: string; bg: string; text: string }> = {
  nuevo: { label: 'Nuevo', bg: 'bg-blue-500/10', text: 'text-blue-400' },
  'en-proceso': { label: 'En Proceso', bg: 'bg-amber-500/10', text: 'text-amber-400' },
  resuelto: { label: 'Resuelto', bg: 'bg-emerald-500/10', text: 'text-emerald-400' },
  escalado: { label: 'Escalado', bg: 'bg-red-500/10', text: 'text-red-400' },
};

export default function FeedbackTab() {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const filtered = feedbacks.filter((f) => {
    if (search && !f.clientName.toLowerCase().includes(search.toLowerCase()) && !f.comment.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && f.type !== typeFilter) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: feedbacks.length,
    felicitaciones: feedbacks.filter((f) => f.type === 'felicitacion').length,
    problemas: feedbacks.filter((f) => f.type === 'problema').length,
    sugerencias: feedbacks.filter((f) => f.type === 'sugerencia').length,
    malaAtencion: feedbacks.filter((f) => f.type === 'mala-atencion').length,
    avgRating: feedbacks.reduce((s, f) => s + f.rating, 0) / feedbacks.length,
    resueltos: feedbacks.filter((f) => f.status === 'resuelto').length,
    escalados: feedbacks.filter((f) => f.status === 'escalado').length,
  };

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-8">
        {[
          { label: 'Total', value: stats.total, icon: MessageSquare, color: 'text-foreground', bg: 'bg-muted' },
          { label: 'Felicitaciones', value: stats.felicitaciones, icon: ThumbsUp, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Problemas', value: stats.problemas, icon: AlertTriangle, color: 'text-red-400', bg: 'bg-red-500/10' },
          { label: 'Sugerencias', value: stats.sugerencias, icon: Lightbulb, color: 'text-blue-400', bg: 'bg-blue-500/10' },
          { label: 'Mala Atención', value: stats.malaAtencion, icon: Frown, color: 'text-amber-400', bg: 'bg-amber-500/10' },
          { label: 'Calificación', value: stats.avgRating.toFixed(1), icon: Star, color: 'text-yellow-400', bg: 'bg-yellow-500/10' },
          { label: 'Resueltos', value: stats.resueltos, icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
          { label: 'Escalados', value: stats.escalados, icon: ArrowUpRight, color: 'text-red-400', bg: 'bg-red-500/10' },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl border border-border/40 bg-card/40 p-3 text-center">
            <div className={cn('flex h-7 w-7 items-center justify-center rounded-md mx-auto mb-1.5', stat.bg)}>
              <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
            </div>
            <div className="text-lg font-bold text-foreground font-mono">{stat.value}</div>
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</div>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Buscar feedback..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card/60 border-border/40 text-sm"
          />
        </div>
        <div className="flex flex-wrap gap-2">
          {(['all', 'felicitacion', 'problema', 'sugerencia', 'mala-atencion'] as const).map((t) => {
            const cfg = t === 'all' ? null : typeConfig[t];
            return (
              <Button
                key={t}
                size="sm"
                variant={typeFilter === t ? 'default' : 'outline'}
                className={cn('text-xs gap-1.5', typeFilter === t ? '' : 'border-border/40 bg-card/40')}
                onClick={() => setTypeFilter(t)}
              >
                {cfg && <cfg.icon className={cn('h-3 w-3', cfg.text)} />}
                {t === 'all' ? 'Todos' : cfg?.label}
              </Button>
            );
          })}
        </div>
      </div>

      {/* Feedback List */}
      <div className="space-y-3">
        {filtered.map((fb) => {
          const typeCfg = typeConfig[fb.type];
          const statusCfg = statusConfig[fb.status];
          const isExpanded = expandedId === fb.id;

          return (
            <div
              key={fb.id}
              className="group rounded-xl border border-border/40 bg-card/40 overflow-hidden transition-all hover:border-border/60"
            >
              <div
                className="flex items-start gap-4 p-4 cursor-pointer"
                onClick={() => setExpandedId(isExpanded ? null : fb.id)}
              >
                <div className={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border', typeCfg.bg, typeCfg.border)}>
                  <typeCfg.icon className={cn('h-5 w-5', typeCfg.text)} />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 mb-1">
                    <span className="font-medium text-foreground text-sm">{fb.clientName}</span>
                    <Badge variant="outline" className={cn('text-[10px] border-border/40', typeCfg.bg, typeCfg.text)}>
                      {typeCfg.label}
                    </Badge>
                    <span className={cn('rounded-full px-2 py-0.5 text-[10px] font-medium', statusCfg.bg, statusCfg.text)}>
                      {statusCfg.label}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground line-clamp-2">{fb.comment}</p>
                  <div className="flex items-center gap-4 mt-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1">
                      <Star className="h-3 w-3 text-yellow-400" />
                      {fb.rating}/5
                    </span>
                    <span>{fb.bank}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(fb.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {fb.satisfactionScore && (
                    <div className="text-right hidden sm:block">
                      <div className="text-lg font-bold text-emerald-400 font-mono">{fb.satisfactionScore}</div>
                      <div className="text-[10px] text-muted-foreground">Satisfacción</div>
                    </div>
                  )}
                </div>
              </div>

              {isExpanded && fb.response && (
                <div className="border-t border-border/30 bg-card/30 px-4 py-3 ml-14">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-foreground mb-1">Respuesta del banco</div>
                      <p className="text-sm text-muted-foreground">{fb.response}</p>
                      {fb.respondedAt && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Respondido el {new Date(fb.respondedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No hay feedback que coincida</p>
          </div>
        )}
      </div>
    </div>
  );
}
