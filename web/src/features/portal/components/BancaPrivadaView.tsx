import { useState, useCallback } from 'react';
import {
  Plus, Loader2, CheckCircle2, Building2, Sparkles,
  Clock, FileText, ChevronRight, Shield,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
import type { SolicitudProductType } from '@/features/portal/store/usePortalStore';
import { cn } from '@/lib/utils';

// ───── Product types for the form ─────

const PRODUCT_TYPES: { id: SolicitudProductType; label: string }[] = [
  { id: 'compra-cartera', label: 'Compra de Cartera' },
  { id: 'credito-hipotecario', label: 'Crédito Hipotecario' },
  { id: 'cdt', label: 'CDT' },
  { id: 'libre-inversion', label: 'Libre Inversión' },
];

const PRODUCT_LABELS: Record<SolicitudProductType, string> = {
  'compra-cartera': 'Compra de Cartera',
  'credito-hipotecario': 'Crédito Hipotecario',
  cdt: 'CDT',
  'libre-inversion': 'Libre Inversión',
};

/** Mapeo nombre de banco → ID real en la tabla `users` */
const BANK_ID_MAP: Record<string, string> = {
  'Bancolombia': 'USR-BANCO-01',
  'Davivienda': 'USR-BANCO-01',
  'BBVA': 'USR-BANCO-02',
  'Banco de Bogotá': 'USR-BANCO-03',
  'Scotiabank': 'USR-BANCO-04',
  'Itaú': 'USR-BANCO-05',
};

const AVAILABLE_BANKS = Object.keys(BANK_ID_MAP);

// ───── Solicitud Dialog ─────

function SolicitudDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const { addSolicitud } = usePortalStore();
  const [productType, setProductType] = useState<SolicitudProductType | null>(null);
  const [selectedBanks, setSelectedBanks] = useState<string[]>([]);
  const [submitState, setSubmitState] = useState<'idle' | 'loading' | 'done'>('idle');

  const toggleBank = useCallback((bank: string) => {
    setSelectedBanks((prev) =>
      prev.includes(bank) ? prev.filter((b) => b !== bank) : [...prev, bank],
    );
  }, []);

  const canSubmit = productType !== null && selectedBanks.length > 0 && submitState === 'idle';

  const handleSubmit = useCallback(() => {
    if (!canSubmit || !productType) return;
    setSubmitState('loading');

    setTimeout(() => {
      // Resolver IDs reales de los bancos seleccionados
      const bancoIds = selectedBanks
        .map((name) => BANK_ID_MAP[name])
        .filter((id): id is string => !!id);

      addSolicitud({
        id: `SOL-${Date.now().toString(36).toUpperCase()}`,
        productType,
        banks: selectedBanks,
        bancoIds,
        status: 'Pendiente de contacto por el banco',
        createdAt: new Date().toISOString(),
      });
      setSubmitState('done');

      setTimeout(() => {
        setSubmitState('idle');
        setProductType(null);
        setSelectedBanks([]);
        onOpenChange(false);
      }, 1500);
    }, 1200);
  }, [canSubmit, productType, selectedBanks, addSolicitud, onOpenChange]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold tracking-tight flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-blue-400" />
            Nueva Solicitud Financiera
          </DialogTitle>
          <DialogDescription className="text-sm">
            Configura tu solicitud y selecciona los bancos que quieres que te contacten.
          </DialogDescription>
        </DialogHeader>

        {submitState === 'done' ? (
          <div className="flex flex-col items-center justify-center py-8 text-center animate-fade-in">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-4">
              <CheckCircle2 className="h-8 w-8 text-emerald-400" />
            </div>
            <p className="text-base font-semibold text-foreground mb-1">Solicitud enviada</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Tus datos fueron enviados a {selectedBanks.length} banco
              {selectedBanks.length > 1 ? 's' : ''}. Un asesor te contactará pronto.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Tipo de Producto
              </label>
              <Select
                value={productType ?? ''}
                onValueChange={(val) => setProductType(val as SolicitudProductType)}
              >
                <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                  <SelectValue placeholder="Selecciona el tipo de producto..." />
                </SelectTrigger>
                <SelectContent className="border-border/60 bg-card/95 backdrop-blur-xl">
                  {PRODUCT_TYPES.map((pt) => (
                    <SelectItem key={pt.id} value={pt.id} className="cursor-pointer text-sm">
                      {pt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                Bancos de Interés
              </label>
              <p className="text-[11px] text-muted-foreground">
                Selecciona las entidades que quieres que reciban tu solicitud
              </p>
              <div className="flex flex-wrap gap-2">
                {AVAILABLE_BANKS.map((bank) => {
                  const isSelected = selectedBanks.includes(bank);
                  return (
                    <button
                      key={bank}
                      type="button"
                      onClick={() => toggleBank(bank)}
                      className={cn(
                        'inline-flex items-center gap-1.5 rounded-lg border px-3 py-2 text-xs font-medium transition-all duration-200',
                        isSelected
                          ? 'border-blue-500/40 bg-blue-500/10 text-blue-400 shadow-sm'
                          : 'border-border/50 bg-secondary/40 text-muted-foreground hover:border-border/70 hover:text-foreground',
                      )}
                    >
                      <Building2 className="h-3 w-3" />
                      {bank}
                      {isSelected && <CheckCircle2 className="h-3 w-3 text-blue-400" />}
                    </button>
                  );
                })}
              </div>
            </div>

            {productType && selectedBanks.length > 0 && (
              <div className="rounded-lg bg-blue-500/5 border border-blue-500/20 p-3">
                <p className="text-xs text-blue-400 font-medium text-center">
                  Solicitarás{' '}
                  <span className="font-semibold">
                    {PRODUCT_TYPES.find((p) => p.id === productType)?.label}
                  </span>{' '}
                  a {selectedBanks.length} banco{selectedBanks.length > 1 ? 's' : ''}:{' '}
                  {selectedBanks.join(', ')}
                </p>
              </div>
            )}

            <Button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className={cn(
                'w-full h-11 gap-2 font-semibold text-sm rounded-xl transition-all duration-300',
                canSubmit
                  ? 'bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20'
                  : 'bg-muted text-muted-foreground cursor-not-allowed',
              )}
            >
              {submitState === 'loading' ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Enviando solicitud...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4" />
                  Enviar Solicitud
                </>
              )}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

// ───── Main BancaPrivadaView ─────

export default function BancaPrivadaView() {
  const { solicitudes, currentClient } = usePortalStore();
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  return (
    <div className="animate-fade-in space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
              <Building2 className="h-3.5 w-3.5 text-blue-400" />
            </div>
            <h2 className="text-base font-semibold text-foreground">Banca Privada</h2>
          </div>
          <p className="text-xs text-muted-foreground">
            Gestiona tus solicitudes financieras. Los bancos aliados de Neggo reciben tu perfil de
            forma anónima y compiten por ofrecerte las mejores condiciones.
          </p>
        </div>

        <Button
          onClick={() => setIsDialogOpen(true)}
          className={cn(
            'shrink-0 h-10 gap-2 rounded-xl px-5 font-semibold text-sm',
            'bg-blue-600 hover:bg-blue-500 text-white',
            'shadow-lg shadow-blue-600/20',
            'transition-all duration-200 hover:shadow-blue-600/30 hover:scale-[1.02]',
          )}
        >
          <Plus className="h-4 w-4" />
          Nueva Solicitud
        </Button>
      </div>

      {/* Privacy assurance banner */}
      <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 p-4 flex items-start gap-3">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Shield className="h-4 w-4 text-blue-400" />
        </div>
        <div className="space-y-1">
          <p className="text-sm font-semibold text-blue-400">Privacidad Garantizada</p>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Tu identidad se mantiene 100% anónima hasta que decidas revelarla. Los bancos solo
            ven tu perfil financiero verificado (score {currentClient.score}, ciudad{' '}
            {currentClient.city}) y compiten con sus mejores ofertas.
          </p>
        </div>
      </div>

      {/* Solicitudes history */}
      <div className="space-y-4">
        <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
          <FileText className="h-4 w-4 text-muted-foreground" />
          Historial de Solicitudes
        </h3>

        {solicitudes.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-500/10 border border-blue-500/20 mb-4">
              <FileText className="h-6 w-6 text-blue-400" />
            </div>
            <h4 className="text-sm font-semibold text-foreground mb-1">Sin solicitudes aún</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              Crea tu primera solicitud financiera y deja que los bancos aliados de Neggo compitan
              por ti.
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {solicitudes.map((sol) => (
              <div
                key={sol.id}
                className="group rounded-xl border border-border/40 bg-card/60 p-4 transition-all duration-200 hover:border-border/60 hover:bg-card/80"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-blue-500/10 border border-blue-500/20">
                      <Building2 className="h-4 w-4 text-blue-400" />
                    </div>
                    <div className="space-y-0.5">
                      <p className="text-sm font-semibold text-foreground">
                        {PRODUCT_LABELS[sol.productType]}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {sol.banks.join(', ')}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] px-2 py-0.5 font-medium rounded-full">
                      <Clock className="h-2.5 w-2.5 mr-1" />
                      {sol.status}
                    </Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
                <div className="mt-2 flex items-center gap-2 text-[10px] text-muted-foreground">
                  <span>ID: {sol.id}</span>
                  <span className="text-border/60">|</span>
                  <span>
                    {new Date(sol.createdAt).toLocaleDateString('es-CO', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Solicitud Dialog */}
      <SolicitudDialog open={isDialogOpen} onOpenChange={setIsDialogOpen} />
    </div>
  );
}
