import { useState, useCallback } from 'react';
import {
  ThumbsUp, AlertTriangle, Lightbulb, Frown,
  Star, Clock, CheckCircle2, MessageSquare,
  Filter, Search, Send, Loader2,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { feedbacks } from '@/data/mock';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Feedback, FeedbackType, FeedbackStatus, FeedbackDestinatario } from '@/types';

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

// ───── Component ─────

interface CrossSectorFeedbackPanelProps {
  /** Filters feedback for this specific entity type */
  entityType: FeedbackDestinatario;
  /** Optional: further filter by specific entity name */
  entityName?: string;
}

export default function CrossSectorFeedbackPanel({ entityType, entityName }: CrossSectorFeedbackPanelProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<FeedbackType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<FeedbackStatus | 'all'>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState('');
  const [replyingTo, setReplyingTo] = useState<string | null>(null);
  const [replyState, setReplyState] = useState<'idle' | 'loading'>('idle');

  const filtered = feedbacks.filter((f) => {
    if (f.destinatario !== entityType) return false;
    if (entityName && f.destinatarioName !== entityName) return false;
    if (search && !f.clientName.toLowerCase().includes(search.toLowerCase()) && !f.comment.toLowerCase().includes(search.toLowerCase())) return false;
    if (typeFilter !== 'all' && f.type !== typeFilter) return false;
    if (statusFilter !== 'all' && f.status !== statusFilter) return false;
    return true;
  });

  const stats = {
    total: filtered.length,
    felicitaciones: filtered.filter((f) => f.type === 'felicitacion').length,
    problemas: filtered.filter((f) => f.type === 'problema').length,
    sugerencias: filtered.filter((f) => f.type === 'sugerencia').length,
    malaAtencion: filtered.filter((f) => f.type === 'mala-atencion').length,
    avgRating: filtered.length > 0 ? filtered.reduce((s, f) => s + f.rating, 0) / filtered.length : 0,
    resueltos: filtered.filter((f) => f.status === 'resuelto').length,
    pendientes: filtered.filter((f) => f.status === 'nuevo' || f.status === 'en-proceso').length,
  };

  const handleReply = useCallback((fbId: string) => {
    if (!replyText.trim()) return;
    setReplyState('loading');
    setTimeout(() => {
      setReplyState('idle');
      setReplyingTo(null);
      setReplyText('');
      toast.success('Respuesta enviada', {
        description: 'El cliente verá tu respuesta en tiempo real en su portal.',
      });
    }, 1000);
  }, [replyText]);

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
          { label: 'Pendientes', value: stats.pendientes, icon: Clock, color: 'text-amber-400', bg: 'bg-amber-500/10' },
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
          const isReplying = replyingTo === fb.id;

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
                    <span>{fb.destinatarioName}</span>
                    <span className="flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(fb.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>
                </div>
              </div>

              {/* Response section */}
              {isExpanded && fb.response && (
                <div className="border-t border-border/30 bg-card/30 px-4 py-3 ml-14">
                  <div className="flex items-start gap-3">
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary/10">
                      <MessageSquare className="h-3.5 w-3.5 text-primary" />
                    </div>
                    <div>
                      <div className="text-xs font-medium text-foreground mb-1">Nuestra respuesta</div>
                      <p className="text-sm text-muted-foreground">{fb.response}</p>
                      {fb.respondedAt && (
                        <div className="text-[11px] text-muted-foreground mt-1">
                          Respondido: {new Date(fb.respondedAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'long', hour: '2-digit', minute: '2-digit' })}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Reply form for unresolved feedback */}
              {isExpanded && fb.status !== 'resuelto' && (
                <div className="border-t border-border/30 bg-card/20 px-4 py-3 ml-14 space-y-2">
                  {isReplying ? (
                    <>
                      <Textarea
                        placeholder="Escribe tu respuesta al cliente..."
                        value={replyText}
                        onChange={(e) => setReplyText(e.target.value)}
                        className="min-h-[60px] text-xs bg-secondary/40 border-border/40 rounded-lg resize-none"
                      />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => { setReplyingTo(null); setReplyText(''); }}
                          className="text-xs border-border/40 rounded-lg"
                        >
                          Cancelar
                        </Button>
                        <Button
                          size="sm"
                          disabled={!replyText.trim() || replyState === 'loading'}
                          onClick={() => handleReply(fb.id)}
                          className="text-xs gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg"
                        >
                          {replyState === 'loading' ? (
                            <>
                              <Loader2 className="h-3 w-3 animate-spin" />
                              Enviando...
                            </>
                          ) : (
                            <>
                              <Send className="h-3 w-3" />
                              Responder
                            </>
                          )}
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={(e) => { e.stopPropagation(); setReplyingTo(fb.id); }}
                      className="text-xs gap-1.5 border-border/40 rounded-lg"
                    >
                      <MessageSquare className="h-3 w-3" />
                      Escribir respuesta
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <MessageSquare className="h-10 w-10 text-muted-foreground/40 mb-3" />
            <p className="text-sm font-medium text-muted-foreground">No hay feedback de clientes</p>
            <p className="text-xs text-muted-foreground/50 mt-1">
              {entityName ? `Para ${entityName}` : `Para esta categoría de negocio`}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
