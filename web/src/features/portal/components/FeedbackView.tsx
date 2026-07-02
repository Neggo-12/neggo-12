import { useState, useCallback, useMemo } from 'react';
import {
  MessageSquareText, Send, Loader2, CheckCircle2,
  Building2, Landmark, Store, ArrowLeft, ArrowRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import type { Feedback, FeedbackDestinatario, FeedbackSector, FeedbackWizardStep } from '@/types';

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
  subtitle: string;
}

const SECTOR_CONFIGS: Record<FeedbackSector, SectorConfig> = {
  inmobiliario: {
    label: 'Sector Inmobiliario',
    icon: Building2,
    color: 'text-blue-400',
    bgColor: 'bg-blue-500/10 border-blue-500/20 hover:bg-blue-500/[0.15]',
    subtitle: 'Constructoras y proyectos de vivienda',
  },
  financiero: {
    label: 'Sector Financiero',
    icon: Landmark,
    color: 'text-emerald-400',
    bgColor: 'bg-emerald-500/10 border-emerald-500/20 hover:bg-emerald-500/[0.15]',
    subtitle: 'Bancos, CDT, créditos e inversiones',
  },
  comercial: {
    label: 'Establecimientos Comerciales',
    icon: Store,
    color: 'text-amber-400',
    bgColor: 'bg-amber-500/10 border-amber-500/20 hover:bg-amber-500/[0.15]',
    subtitle: 'Tiendas, viajes y establecimientos aliados',
  },
};

// ───── Component ─────

export default function FeedbackView() {
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

  const handleReset = useCallback(() => {
    setStep('sector');
    setSelectedSector(null);
    setSelectedCompany(null);
    setComment('');
    setSubmitState('idle');
  }, []);

  const handleSubmit = useCallback(() => {
    if (!selectedCompany || !comment.trim()) return;
    setSubmitState('loading');

    setTimeout(() => {
      setSubmitState('done');
      toast.success('Mensaje enviado', {
        description: `Tu feedback fue enviado a ${selectedCompany.name}. La empresa lo verá en su panel de Neggo y podrá responderte en tiempo real.`,
      });
    }, 1200);
  }, [selectedCompany, comment]);

  const sectorConfig = selectedSector ? SECTOR_CONFIGS[selectedSector] : null;

  // ───── Step indicator ─────

  const stepLabels: Record<FeedbackWizardStep, string> = {
    sector: 'Elige el sector',
    company: 'Selecciona la empresa',
    message: 'Redacta tu mensaje',
  };

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Header */}
      <div className="space-y-1">
        <div className="inline-flex items-center gap-2 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-3 py-1 text-[10px] font-medium text-cyan-400">
          <MessageSquareText className="h-3 w-3" />
          Paso {step === 'sector' ? '1' : step === 'company' ? '2' : '3'} de 3
        </div>
        <h2 className="text-xl font-bold text-foreground tracking-tight">
          {submitState === 'done' ? 'Mensaje Enviado' : 'Soporte y Feedback'}
        </h2>
        <p className="text-sm text-muted-foreground">
          {submitState === 'done'
            ? 'Tu mensaje ha sido entregado. La empresa te responderá a través del portal.'
            : stepLabels[step]}
        </p>
      </div>

      {/* Progress bar */}
      <div className="flex items-center gap-2">
        {(['sector', 'company', 'message'] as FeedbackWizardStep[]).map((s, i) => {
          const isActive = step === s;
          const isPast =
            (step === 'company' && s === 'sector') ||
            (step === 'message' && (s === 'sector' || s === 'company'));
          return (
            <div key={s} className="flex items-center gap-2 flex-1 last:flex-none">
              <div
                className={cn(
                  'h-1.5 rounded-full transition-all duration-500 flex-1',
                  isActive ? 'bg-cyan-400' : isPast ? 'bg-cyan-500/40' : 'bg-border/30',
                )}
              />
              {i < 2 && <div className="w-6 h-px bg-border/20 shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Main content */}
      <div className="rounded-2xl border border-border/40 bg-card/50 backdrop-blur-sm overflow-hidden">
        {submitState === 'done' ? (
          <div className="flex flex-col items-center justify-center py-16 px-6 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <h3 className="text-lg font-bold text-foreground mb-2">
              ¡Mensaje enviado exitosamente!
            </h3>
            <p className="text-sm text-muted-foreground max-w-md mb-6">
              {selectedCompany?.name} recibirá tu mensaje y te responderá a través del portal
              de Neggo. También recibirás una notificación cuando tengas respuesta.
            </p>
            <Button
              onClick={handleReset}
              variant="outline"
              className="gap-2 border-border/40 rounded-xl text-sm"
            >
              <MessageSquareText className="h-4 w-4" />
              Enviar otro mensaje
            </Button>
          </div>
        ) : (
          <div className="p-6">
            {/* ── STEP 1: Sector selection ── */}
            {step === 'sector' && (
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  ¿Sobre qué sector quieres enviar tu comentario, sugerencia o pregunta?
                </p>
                <div className="grid gap-3">
                  {(Object.entries(SECTOR_CONFIGS) as [FeedbackSector, SectorConfig][]).map(
                    ([sector, cfg]) => {
                      const Icon = cfg.icon;
                      return (
                        <button
                          key={sector}
                          onClick={() => handleSelectSector(sector)}
                          className={cn(
                            'flex items-center gap-4 rounded-xl border p-5 transition-all duration-200 text-left cursor-pointer',
                            'hover:scale-[1.01]',
                            cfg.bgColor,
                          )}
                        >
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-card/60 border border-border/30">
                            <Icon className={cn('h-6 w-6', cfg.color)} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-base font-semibold', cfg.color)}>{cfg.label}</p>
                            <p className="text-xs text-muted-foreground mt-0.5">{cfg.subtitle}</p>
                          </div>
                          <ArrowRight className="h-5 w-5 text-muted-foreground/30 shrink-0" />
                        </button>
                      );
                    },
                  )}
                </div>
              </div>
            )}

            {/* ── STEP 2: Company selection ── */}
            {step === 'company' && sectorConfig && (
              <div className="space-y-4">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver a sectores
                </button>

                <div
                  className={cn(
                    'rounded-lg border px-4 py-3 flex items-center gap-3',
                    sectorConfig.bgColor.replace('hover:bg-blue-500/[0.15]', ''),
                  )}
                >
                  <sectorConfig.icon className={cn('h-5 w-5', sectorConfig.color)} />
                  <span className={cn('text-sm font-semibold', sectorConfig.color)}>
                    {sectorConfig.label}
                  </span>
                </div>

                <p className="text-sm text-muted-foreground">
                  Selecciona la empresa específica a la que va dirigido tu mensaje:
                </p>

                <div className="space-y-2">
                  {companiesForSector.map((company) => (
                    <button
                      key={company.id}
                      onClick={() => handleSelectCompany(company)}
                      className={cn(
                        'w-full flex items-center gap-3 rounded-xl border border-border/40 bg-card/40 px-4 py-3.5',
                        'text-left transition-all duration-150 cursor-pointer',
                        'hover:border-cyan-500/30 hover:bg-cyan-500/5',
                      )}
                    >
                      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                        <MessageSquareText className="h-4 w-4 text-cyan-400" />
                      </div>
                      <span className="text-sm font-medium text-foreground">{company.name}</span>
                      <ArrowRight className="h-4 w-4 text-muted-foreground/30 ml-auto shrink-0" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── STEP 3: Message ── */}
            {step === 'message' && selectedCompany && (
              <div className="space-y-4">
                <button
                  onClick={handleBack}
                  className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
                >
                  <ArrowLeft className="h-3.5 w-3.5" />
                  Volver a empresas
                </button>

                <div className="rounded-lg border border-cyan-500/20 bg-cyan-500/5 px-4 py-3 flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-cyan-500/10">
                    <MessageSquareText className="h-4 w-4 text-cyan-400" />
                  </div>
                  <span className="text-sm font-semibold text-cyan-400">
                    Para: {selectedCompany.name}
                  </span>
                </div>

                <div className="space-y-2">
                  <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    Tu mensaje
                  </Label>
                  <Textarea
                    placeholder="Escribe tu comentario, sugerencia, problema o felicitación... Cuantos más detalles incluyas, mejor podrán ayudarte."
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    className="min-h-[140px] text-sm bg-secondary/40 border-border/40 rounded-xl resize-none focus:border-cyan-500/40"
                  />
                </div>

                <Button
                  disabled={!comment.trim() || submitState !== 'idle'}
                  onClick={handleSubmit}
                  className={cn(
                    'w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all',
                    comment.trim() && submitState === 'idle'
                      ? 'bg-cyan-600 hover:bg-cyan-500 text-white shadow-lg shadow-cyan-600/20'
                      : 'bg-muted text-muted-foreground cursor-not-allowed',
                  )}
                >
                  {submitState === 'loading' ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Enviando mensaje...
                    </>
                  ) : (
                    <>
                      <Send className="h-4 w-4" />
                      Enviar Mensaje
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
