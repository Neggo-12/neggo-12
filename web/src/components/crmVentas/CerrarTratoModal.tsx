import { useState } from 'react';
import { PartyPopper } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { CrmVentasPlanElegido } from '@/core/db/repositories';
import { PLAN_ELEGIDO_OPTIONS } from './etapaVentaConfig';

interface CerrarTratoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  nombreNegocio: string;
  onConfirm: (input: { planElegido: CrmVentasPlanElegido; valorMensualEstimado: number }) => void;
}

/** Modal de "Cerrado - ganado" — plan_elegido y valor_mensual_estimado son obligatorios
 * (docs/spec-crm-ventas-admin.md, sección 5.4: crm_ventas_cambiar_etapa los exige). */
export default function CerrarTratoModal({ open, onOpenChange, nombreNegocio, onConfirm }: CerrarTratoModalProps) {
  const [plan, setPlan] = useState<CrmVentasPlanElegido | ''>('');
  const [valor, setValor] = useState('');

  const canConfirm = plan !== '' && valor.trim() !== '' && Number(valor) >= 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({ planElegido: plan as CrmVentasPlanElegido, valorMensualEstimado: Number(valor) });
    setPlan('');
    setValor('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <PartyPopper className="h-4 w-4 text-emerald-400" />
            Cerrar trato — {nombreNegocio}
          </DialogTitle>
          <DialogDescription className="text-xs">
            Plan elegido y valor mensual estimado son obligatorios para marcar este lead como "Cerrado - ganado".
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Plan elegido</Label>
            <Select value={plan} onValueChange={(v) => setPlan(v as CrmVentasPlanElegido)}>
              <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                <SelectValue placeholder="Seleccionar plan" />
              </SelectTrigger>
              <SelectContent>
                {PLAN_ELEGIDO_OPTIONS.map((p) => (
                  <SelectItem key={p.value} value={p.value} className="text-xs">{p.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Valor mensual estimado (COP)</Label>
            <Input
              type="number"
              min={0}
              placeholder="Ej: 300000"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono"
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button size="sm" disabled={!canConfirm} onClick={handleConfirm} className="bg-emerald-600 hover:bg-emerald-500">
            Confirmar cierre
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
