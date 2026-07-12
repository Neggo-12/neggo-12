import { useState } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import type { MeInteresaLeadDisplay } from '@/core/db/repositories';

interface CierreVentaModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  origen: MeInteresaLeadDisplay['origen'];
  productoBancario: string | null;
  onConfirm: (input: { montoCierre: number; franquiciaTarjeta?: 'visa' | 'mastercard' | 'amex' }) => void;
}

const FRANQUICIAS = [
  { value: 'visa', label: 'Visa' },
  { value: 'mastercard', label: 'Mastercard' },
  { value: 'amex', label: 'Amex' },
] as const;

export default function CierreVentaModal({ open, onOpenChange, origen, productoBancario, onConfirm }: CierreVentaModalProps) {
  const [monto, setMonto] = useState('');
  const [franquicia, setFranquicia] = useState<'visa' | 'mastercard' | 'amex' | ''>('');

  const esTarjeta = origen === 'banco' && productoBancario === 'tarjeta-credito';
  const label = origen === 'banco' ? 'Monto desembolsado (COP)' : 'Monto de venta (COP)';
  const canConfirm = esTarjeta ? franquicia !== '' : monto.trim() !== '' && Number(monto) > 0;

  const handleConfirm = () => {
    if (!canConfirm) return;
    onConfirm({
      montoCierre: esTarjeta ? 0 : Number(monto),
      franquiciaTarjeta: esTarjeta ? (franquicia as 'visa' | 'mastercard' | 'amex') : undefined,
    });
    setMonto('');
    setFranquicia('');
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm border-border/60 bg-card/95 backdrop-blur-xl">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Confirmar cierre
          </DialogTitle>
          <DialogDescription className="text-xs">
            Este dato es obligatorio para calcular la comisión correspondiente.
          </DialogDescription>
        </DialogHeader>

        {esTarjeta ? (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Franquicia de la tarjeta</Label>
            <Select value={franquicia} onValueChange={(v) => setFranquicia(v as typeof franquicia)}>
              <SelectTrigger className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm">
                <SelectValue placeholder="Seleccionar" />
              </SelectTrigger>
              <SelectContent>
                {FRANQUICIAS.map((f) => (
                  <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">{label}</Label>
            <Input
              type="number"
              placeholder="Ej: 250000000"
              value={monto}
              onChange={(e) => setMonto(e.target.value)}
              className="h-11 rounded-xl border-border/60 bg-secondary/50 text-sm font-mono"
            />
          </div>
        )}

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
