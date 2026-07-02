import { useState, useCallback } from 'react';
import { MessageSquareText, Send, X, Star, Loader2, CheckCircle2, Store, Building2, Landmark } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select, SelectContent, SelectItem,
  SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { FeedbackDestinatario, Feedback } from '@/types';

const DESTINATARIOS: { id: string; name: string; type: FeedbackDestinatario; icon: typeof Building2 }[] = [
  { id: 'BANK-001', name: 'Bancolombia', type: 'banco', icon: Landmark },
  { id: 'BANK-002', name: 'Davivienda', type: 'banco', icon: Landmark },
  { id: 'BANK-003', name: 'BBVA Colombia', type: 'banco', icon: Landmark },
  { id: 'CONS-001', name: 'Constructora Andina', type: 'constructora', icon: Building2 },
  { id: 'CONS-002', name: 'Proyectos del Valle', type: 'constructora', icon: Building2 },
  { id: 'COM-001', name: 'AutoMercado Premium', type: 'comercio', icon: Store },
  { id: 'COM-002', name: 'ElectroMundo', type: 'comercio', icon: Store },
];

export default function FeedbackFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [destinatarioId, setDestinatarioId] = useState('');
  const [comment, setComment] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done'>('idle');

  const destinatario = DESTINATARIOS.find((d) => d.id === destinatarioId);

  const handleSubmit = useCallback(() => {
    if (!destinatario || !comment.trim()) return;
    setSubmitState('loading');
    const nuevoFeedback: Feedback = {
      id: `FB-${Date.now()}`,
      clientName: 'Jhon Edison Flórez',
      type: 'sugerencia',
      status: 'nuevo',
      rating: 4,
      comment: comment.trim(),
      bank: destinatario.name,
      destinatario: destinatario.type,
      destinatarioName: destinatario.name,
      destinatarioId: destinatario.id,
      createdAt: new Date().toISOString(),
    };
    // En producción, aquí se enviaría al backend
    setTimeout(() => {
      setSubmitState('done');
      toast.success('Mensaje enviado', {
        description: `Tu feedback fue enviado a ${destinatario.name}. Recibirás una respuesta pronto.`,
      });
      setTimeout(() => {
        setSubmitState('idle');
        setComment('');
        setDestinatarioId('');
        setIsOpen(false);
      }, 2000);
    }, 1000);
  }, [destinatario, comment]);

  const canSubmit = destinatarioId && comment.trim() && submitState === 'idle';

  return (
    <>
      {/* Floating trigger button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className={cn(
            'fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-2xl',
            'bg-gradient-to-br from-cyan-500 to-blue-600 shadow-xl shadow-cyan-500/30',
            'hover:scale-105 hover:shadow-cyan-500/40 transition-all duration-200',
            'ring-1 ring-cyan-400/30',
          )}
          title="Soporte y Feedback"
        >
          <MessageSquareText className="h-6 w-6 text-white" />
        </button>
      )}

      {/* Feedback panel */}
      {isOpen && (
        <div className="fixed bottom-6 right-6 z-50 w-80 rounded-2xl border border-border/60 bg-card/95 backdrop-blur-xl shadow-2xl shadow-black/30 overflow-hidden animate-slide-up">
          {/* Header */}
          <div className="flex items-center justify-between bg-gradient-to-r from-cyan-500/10 to-blue-500/10 px-4 py-3 border-b border-border/30">
            <div className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <MessageSquareText className="h-3.5 w-3.5 text-cyan-400" />
              </div>
              <div>
                <p className="text-xs font-semibold text-foreground">Soporte y Feedback</p>
                <p className="text-[10px] text-muted-foreground">Comunícate con aliados Neggo</p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {submitState === 'done' ? (
            <div className="flex flex-col items-center justify-center py-8 text-center px-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Mensaje enviado</p>
              <p className="text-[11px] text-muted-foreground">
                {destinatario?.name} recibirá tu mensaje y te responderá a través del portal.
              </p>
            </div>
          ) : (
            <div className="p-4 space-y-4">
              {/* Recipient selector */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Destinatario
                </Label>
                <Select value={destinatarioId} onValueChange={setDestinatarioId}>
                  <SelectTrigger className="h-9 text-xs bg-secondary/40 border-border/40 rounded-lg">
                    <SelectValue placeholder="¿A quién va dirigido?" />
                  </SelectTrigger>
                  <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl max-h-48">
                    {DESTINATARIOS.map((d) => {
                      const Icon = d.icon;
                      return (
                        <SelectItem key={d.id} value={d.id} className="text-xs cursor-pointer">
                          <span className="flex items-center gap-2">
                            <Icon className="h-3 w-3 text-muted-foreground" />
                            <span>{d.name}</span>
                            <span className="text-[9px] text-muted-foreground/50 capitalize">({d.type})</span>
                          </span>
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>

              {/* Message */}
              <div className="space-y-1.5">
                <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Tu mensaje
                </Label>
                <Textarea
                  placeholder="Escribe tu comentario, sugerencia o problema..."
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  className="min-h-[80px] text-xs bg-secondary/40 border-border/40 rounded-lg resize-none focus:border-cyan-500/40"
                />
              </div>

              <Button
                disabled={!canSubmit}
                onClick={handleSubmit}
                size="sm"
                className={cn(
                  'w-full h-9 gap-1.5 font-semibold text-xs rounded-lg transition-all',
                  canSubmit
                    ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-md shadow-cyan-600/20'
                    : 'bg-muted text-muted-foreground cursor-not-allowed',
                )}
              >
                {submitState === 'loading' ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                    Enviando...
                  </>
                ) : (
                  <>
                    <Send className="h-3.5 w-3.5" />
                    Enviar Mensaje
                  </>
                )}
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
