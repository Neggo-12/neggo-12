import { useState, useCallback, useMemo } from 'react';
import {
  MessageSquareText, Send, X, Loader2, CheckCircle2,
  Building2, Landmark, Store, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { FeedbackDestinatario, Feedback, FeedbackSector, FeedbackWizardStep } from '@/types';

// ───── Sector → Company mapping ─────

interface CompanyEntry {
  id: string;
  name: string;
  type: FeedbackDestinatario;
  sector: FeedbackSector;
}

const COMPANIES_BY_SECTOR: Record<FeedbackSector, CompanyEntry[]> = {
  inmobiliario: [
    { id: 'CONS-001', name: 'Constructora Marval', type: 'constructora', sector: 'inmobiliario' },
    { id: 'CONS-002', name: 'Coninsa Ramón H.', type: 'constructora', sector: 'inmobiliario' },
    { id: 'CONS-003', name: 'Proyectos del Valle', type: 'constructora', sector: 'inmobiliario' },
  ],
  financiero: [
    { id: 'BANK-001', name: 'Bancolombia', type: 'banco', sector: 'financiero' },
    { id: 'BANK-002', name: 'Davivienda', type: 'banco', sector: 'financiero' },
    { id: 'BANK-003', name: 'BBVA Colombia', type: 'banco', sector: 'financiero' },
    { id: 'BANK-004', name: 'Scotiabank', type: 'banco', sector: 'financiero' },
  ],
  comercial: [
    { id: 'COM-001', name: 'AutoMercado Premium', type: 'comercio', sector: 'comercial' },
    { id: 'COM-002', name: 'ElectroMundo', type: 'comercio', sector: 'comercial' },
    { id: 'COM-003', name: 'Viajes Colombia', type: 'comercio', sector: 'comercial' },
  ],
};

// ───── Sector config ─────

interface SectorConfig {
  label: string;
  icon: typeof Building2;
  color: string;
  bgColor: string;
}

const SECTOR_CONFIGS: Record<FeedbackSector, SectorConfig> = {
  inmobiliario: {
    label: 'Sector Inmobiliario',
    icon: Building2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20',
  },
  financiero: {
    label: 'Sector Financiero',
    icon: Landmark,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20',
  },
  comercial: {
    label: 'Establecimientos Comerciales',
    icon: Store,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20',
  },
};

// ───── Component ─────

export default function FeedbackFloatingButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [step, setStep] = useState<FeedbackWizardStep>('sector');
  const [selectedSector, setSelectedSector] = useState<FeedbackSector | null>(null);
  const [selectedCompany, setSelectedCompany] = useState<CompanyEntry | null>(null);
  const [comment, setComment] = useState('');
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done'>('idle');

  const companiesForSector = useMemo(
    () => (selectedSector ? COMPANIES_BY_SECTOR[selectedSector] : []),
    [selectedSector],
  );

  const handleSelectSector = useCallback((sector: FeedbackSector) => {
    setSelectedSector(sector);
    setSelectedCompany(null);
    setStep('company');
  }, []);

  const handleSelectCompany = useCallback((company: CompanyEntry) => {
    setSelectedCompany(company);
    setStep('message');
  }, []);

  const handleBack = useCallback(() => {
    if (step === 'company') {
      setStep('sector');
      setSelectedSector(null);
    } else if (step === 'message') {
      setStep('company');
    }
  }, [step]);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    // Reset after close animation
    setTimeout(() => {
      setStep('sector');
      setSelectedSector(null);
      setSelectedCompany(null);
      setComment('');
      setSubmitState('idle');
    }, 200);
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedCompany || !comment.trim()) return;
    setSubmitState('loading');

    const nuevoFeedback: Feedback = {
      id: `FB-${Date.now().toString(36).toUpperCase()}`,
      clientName: 'Jhon Edison Flórez',
      type: 'sugerencia',
      status: 'nuevo',
      rating: 4,
      comment: comment.trim(),
      bank: selectedCompany.name,
      destinatario: selectedCompany.type,
      destinatarioName: selectedCompany.name,
      destinatarioId: selectedCompany.id,
      createdAt: new Date().toISOString(),
    };

    // Simular envío al backend
    setTimeout(() => {
      setSubmitState('done');
      toast.success('Mensaje enviado', {
        description: `Tu feedback fue enviado a ${selectedCompany.name}. La empresa lo verá en su panel de Neggo y podrá responderte en tiempo real.`,
      });
      setTimeout(() => {
        handleClose();
      }, 2000);
    }, 1200);
  }, [selectedCompany, comment, handleClose]);

  // ───── Render helpers ─────

  const sectorConfig = selectedSector ? SECTOR_CONFIGS[selectedSector] : null;

  const renderStepIndicator = () => (
    <div className="flex items-center gap-1.5 px-1">
      {(['sector', 'company', 'message'] as FeedbackWizardStep[]).map((s, i) => {
        const isActive = step === s;
        const isPast = (
          (step === 'company' && s === 'sector') ||
          (step === 'message' && (s === 'sector' || s === 'company'))
        );
        return (
          <div key={s} className="flex items-center gap-1.5">
            <div
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                isActive ? 'w-4 bg-cyan-400' : isPast ? 'w-2 bg-cyan-500/40' : 'w-2 bg-border/40',
              )}
            />
            {i < 2 && <div className="w-3 h-px bg-border/30" />}
          </div>
        );
      })}
    </div>
  );

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
                <p className="text-[10px] text-muted-foreground">
                  {step === 'sector' && 'Paso 1/3 — Elige el sector'}
                  {step === 'company' && `Paso 2/3 — ${sectorConfig?.label ?? ''}`}
                  {step === 'message' && 'Paso 3/3 — Tu mensaje'}
                </p>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-card/60 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Step indicator */}
          <div className="flex items-center justify-center py-2 border-b border-border/20">
            {renderStepIndicator()}
          </div>

          {submitState === 'done' ? (
            <div className="flex flex-col items-center justify-center py-10 text-center px-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-3">
                <CheckCircle2 className="h-7 w-7 text-emerald-400" />
              </div>
              <p className="text-sm font-semibold text-foreground mb-1">Mensaje enviado</p>
              <p className="text-[11px] text-muted-foreground">
                {selectedCompany?.name} recibirá tu mensaje y te responderá a través del portal.
              </p>
            </div>
          ) : (
            <div className="p-4">
              {/* ── STEP 1: Sector selection ── */}
              {step === 'sector' && (
                <div className="space-y-3">
                  <p className="text-[11px] text-muted-foreground text-center mb-2">
                    ¿Sobre qué sector quieres enviar feedback?
                  </p>
                  {(Object.entries(SECTOR_CONFIGS) as [FeedbackSector, SectorConfig][]).map(
                    ([sector, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={sector}
                          onClick={() => handleSelectSector(sector)}
                          className={cn(
                            'w-full flex items-center gap-3 rounded-xl border p-3.5 transition-all duration-200 text-left cursor-pointer',
                            'hover:scale-[1.01]',
                            cfg.bgColor,
                          )}
                        >
                          <div className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-lg', cfg.bgColor)}>
                            <Icon className={cn('h-4.5 w-4.5', cfg.color)} />
                          </div>
                          <div className="flex-1">
                            <p className={cn('text-sm font-semibold', cfg.color)}>{cfg.label}</p>
                            <p className="text-[10px] text-muted-foreground mt-0.5">
                              {sector === 'inmobiliario' && 'Constructoras y proyectos de vivienda'}
                              {sector === 'financiero' && 'Bancos, CDT, créditos e inversiones'}
                              {sector === 'comercial' && 'Tiendas, viajes y establecimientos aliados'}
                            </p>
                          </div>
                          <ArrowRight className="h-4 w-4 text-muted-foreground/40" />
                        </button>
                      );
                    },
                  )}
                </div>
              )}

              {/* ── STEP 2: Company selection ── */}
              {step === 'company' && sectorConfig && (
                <div className="space-y-3">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer mb-1"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Volver a sectores
                  </button>

                  <div className={cn('rounded-lg border px-3 py-2.5 flex items-center gap-2', sectorConfig.bgColor)}>
                    <sectorConfig.icon className={cn('h-4 w-4', sectorConfig.color)} />
                    <span className={cn('text-xs font-semibold', sectorConfig.color)}>
                      {sectorConfig.label}
                    </span>
                  </div>

                  <p className="text-[11px] text-muted-foreground">
                    Selecciona la empresa específica a la que va dirigido tu mensaje:
                  </p>

                  <div className="space-y-1.5 max-h-48 overflow-y-auto">
                    {companiesForSector.map((company) => (
                      <button
                        key={company.id}
                        onClick={() => handleSelectCompany(company)}
                        className={cn(
                          'w-full flex items-center gap-2.5 rounded-lg border border-border/40 bg-card/40 px-3 py-2.5',
                          'text-left transition-all duration-150 cursor-pointer',
                          'hover:border-cyan-500/30 hover:bg-cyan-500/5',
                        )}
                      >
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 border border-cyan-500/20">
                          <MessageSquareText className="h-3 w-3 text-cyan-400" />
                        </div>
                        <span className="text-xs font-medium text-foreground">{company.name}</span>
                        <ArrowRight className="h-3 w-3 text-muted-foreground/30 ml-auto" />
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* ── STEP 3: Message ── */}
              {step === 'message' && selectedCompany && (
                <div className="space-y-3">
                  <button
                    onClick={handleBack}
                    className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                  >
                    <ArrowLeft className="h-3 w-3" />
                    Volver a empresas
                  </button>

                  <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-3 py-2.5 flex items-center gap-2">
                    <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-cyan-500/10">
                      <MessageSquareText className="h-3 w-3 text-cyan-400" />
                    </div>
                    <span className="text-xs font-semibold text-cyan-400">
                      Para: {selectedCompany.name}
                    </span>
                  </div>

                  <div className="space-y-1.5">
                    <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                      Tu mensaje
                    </Label>
                    <Textarea
                      placeholder="Escribe tu comentario, sugerencia, problema o felicitación..."
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      className="min-h-[90px] text-xs bg-secondary/40 border-border/40 rounded-lg resize-none focus:border-cyan-500/40"
                    />
                  </div>

                  <Button
                    disabled={!comment.trim() || submitState !== 'idle'}
                    onClick={handleSubmit}
                    size="sm"
                    className={cn(
                      'w-full h-9 gap-1.5 font-semibold text-xs rounded-lg transition-all',
                      comment.trim() && submitState === 'idle'
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
        </div>
      )}
    </>
  );
}
