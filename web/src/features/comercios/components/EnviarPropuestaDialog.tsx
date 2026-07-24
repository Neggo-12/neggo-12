import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useComercioStore, filterOportunidades } from '../store/useComercioStore';
import { Gift, FileText, Zap, Send, Check, ShieldAlert, Star } from 'lucide-react';

interface EnviarPropuestaDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export default function EnviarPropuestaDialog({ open, onOpenChange }: EnviarPropuestaDialogProps) {
  const {
    currentComercio,
    oportunidades,
    hydrateOportunidades,
    selectedOpportunityId,
    sendPropuesta,
    markPropuestaEnviada,
    setPropuestaDialogOpen,
  } = useComercioStore();

  useEffect(() => {
    void hydrateOportunidades();
  }, [hydrateOportunidades]);

  const [beneficio, setBeneficio] = useState('');
  const [detalles, setDetalles] = useState('');
  const [descripcionDetallada, setDescripcionDetallada] = useState('');
  const [terminosCondiciones, setTerminosCondiciones] = useState('');
  const [ganchoComercial, setGanchoComercial] = useState('');
  const [facturacionAutomatica, setFacturacionAutomatica] = useState(false);
  const [sent, setSent] = useState(false);

  const oport = filterOportunidades(
    oportunidades,
    currentComercio.categoria,
  ).find((o) => o.id === selectedOpportunityId);

  const handleSend = (): void => {
    if (!beneficio || !selectedOpportunityId) return;
    sendPropuesta({
      oportunidadId: selectedOpportunityId,
      beneficio,
      detalles,
      descripcionDetallada,
      terminosCondiciones,
      ganchoComercial,
      facturacionAutomatica,
    });
    markPropuestaEnviada(selectedOpportunityId);
    setSent(true);
  };

  const handleClose = (): void => {
    setBeneficio('');
    setDetalles('');
    setDescripcionDetallada('');
    setTerminosCondiciones('');
    setGanchoComercial('');
    setFacturacionAutomatica(false);
    setSent(false);
    setPropuestaDialogOpen(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-xl border-border/40 bg-card/95 backdrop-blur-xl sm:rounded-xl max-h-[85vh] overflow-y-auto">
        {!sent ? (
          <>
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold flex items-center gap-2">
                <Send className="h-5 w-5 text-emerald-400" />
                Enviar Propuesta Competitiva
              </DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">
                {oport ? (
                  <span>
                    Oportunidad{' '}
                    <span className="font-mono text-emerald-400">{oport.id}</span> — Presupuesto
                    validado:{' '}
                    <span className="font-mono text-foreground">
                      ${oport.presupuesto.toLocaleString('es-CO')} COP
                    </span>
                  </span>
                ) : (
                  'Configura tu oferta para competir en el portal del cliente.'
                )}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5">
              {/* Beneficio Clave */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Gift className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                  Beneficio Clave
                </Label>
                <input
                  type="text"
                  placeholder='Ej: "8% Descuento + Seguro Gratis"'
                  value={beneficio}
                  onChange={(e) => setBeneficio(e.target.value)}
                  className="w-full rounded-lg border border-border/40 bg-card pl-4 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* Descripción Detallada */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <FileText className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                  Descripción Detallada de la Oferta
                </Label>
                <textarea
                  placeholder="Ej: Te damos un 15% de descuento exclusivo en la referencia seleccionada + envío asegurado a nivel nacional sin costo adicional."
                  value={descripcionDetallada}
                  onChange={(e) => setDescripcionDetallada(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border/40 bg-card pl-4 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none"
                />
              </div>

              {/* Gancho Comercial / Valor Agregado */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <Star className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                  Gancho Comercial / Valor Agregado
                </Label>
                <input
                  type="text"
                  placeholder='Ej: "Instalación gratis a domicilio" o "Primer mantenimiento sin costo"'
                  value={ganchoComercial}
                  onChange={(e) => setGanchoComercial(e.target.value)}
                  className="w-full rounded-lg border border-border/40 bg-card pl-4 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all"
                />
              </div>

              {/* Términos y Condiciones */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <ShieldAlert className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                  Términos, Condiciones y Garantías
                </Label>
                <textarea
                  placeholder="Ej: Garantía extendida de 2 años de fábrica. Válido por 5 días o hasta agotar existencias. Aplica solo para compras de contado."
                  value={terminosCondiciones}
                  onChange={(e) => setTerminosCondiciones(e.target.value)}
                  rows={3}
                  className="w-full rounded-lg border border-border/40 bg-card pl-4 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none"
                />
              </div>

              {/* Detalles Técnicos */}
              <div className="space-y-2">
                <Label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  <FileText className="inline h-3.5 w-3.5 mr-1.5 -mt-0.5" />
                  Detalles Técnicos de la Oferta
                </Label>
                <textarea
                  placeholder="Describe las condiciones técnicas, plazos de entrega o cualquier detalle relevante..."
                  value={detalles}
                  onChange={(e) => setDetalles(e.target.value)}
                  rows={2}
                  className="w-full rounded-lg border border-border/40 bg-card pl-4 pr-4 py-2.5 text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-emerald-500/50 focus:outline-none focus:ring-1 focus:ring-emerald-500/20 transition-all resize-none"
                />
              </div>

              {/* Toggle Facturación Automática */}
              <div className="rounded-lg border border-border/40 bg-card/50 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
                      <Zap className="h-4 w-4 text-emerald-400" />
                      Facturación Automática
                    </Label>
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-xs">
                      Al activarse, cuando el cliente confirme la compra, Neggo cobrará
                      automáticamente tu comisión (Success Fee) además de depositar la factura
                      digital en la Bóveda del Cliente usando su ID IFC.
                    </p>
                  </div>
                  <Switch
                    checked={facturacionAutomatica}
                    onCheckedChange={setFacturacionAutomatica}
                  />
                </div>
                {facturacionAutomatica && (
                  <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/30 text-[10px]">
                    Se cobrará tu comisión automáticamente al confirmarse la venta
                  </Badge>
                )}
              </div>
            </div>

            <DialogFooter className="gap-2 sm:gap-2">
              <Button variant="outline" className="border-border/40" onClick={handleClose}>
                Cancelar
              </Button>
              <Button
                className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium"
                disabled={!beneficio}
                onClick={handleSend}
              >
                <Send className="mr-2 h-4 w-4" />
                Enviar Propuesta
              </Button>
            </DialogFooter>
          </>
        ) : (
          <div className="py-8 text-center space-y-4 animate-slide-up">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/10 border border-emerald-500/20">
              <Check className="h-8 w-8 text-emerald-400" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold">Propuesta Enviada</DialogTitle>
              <p className="text-sm text-muted-foreground mt-1">
                Tu propuesta quedó registrada. Muy pronto el cliente podrá verla y responderla
                directamente.
              </p>
            </div>
            <Button className="bg-emerald-600 hover:bg-emerald-500 text-white font-medium" onClick={handleClose}>
              Entendido
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
