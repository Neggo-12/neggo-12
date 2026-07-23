import { useState } from 'react';
import { Phone, MessageCircle, CalendarClock, X, Shield } from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { MeInteresaLeadDisplay, MeInteresaPipelineEstado } from '@/core/db/repositories';
import { PIPELINE_BY_ORIGEN, PIPELINE_CONFIG, PRIORIDAD_CONFIG, ESTADOS_CIERRE, calcularPrioridad } from './pipelineConfig';
import { PRODUCT_LABELS, TIPO_VIVIENDA_LABELS, RANGO_INGRESOS_LABELS } from './leadLabels';
import CierreVentaModal from './CierreVentaModal';

function toWhatsAppUrl(telefono: string): string {
  const digits = telefono.replace(/\D/g, '');
  const withCountryCode = digits.startsWith('57') && digits.length > 10 ? digits : `57${digits}`;
  return `https://wa.me/${withCountryCode}`;
}

interface ExpandedLeadCRMProps {
  lead: MeInteresaLeadDisplay;
  /** Comisión % vigente real (negociación > plan global) — nunca la clave de organizations.plan_negociacion, que queda desactualizada frente a una tarifa negociada. */
  comercioComisionPct?: number | null;
  onPipelineChange: (estado: MeInteresaPipelineEstado) => void;
  onCierreConfirmado: (input: { montoCierre: number; franquiciaTarjeta?: 'visa' | 'mastercard' | 'amex' }) => void;
  onSeguimientoChange: (fecha: string | null) => void;
}

export default function ExpandedLeadCRM({ lead, comercioComisionPct, onPipelineChange, onCierreConfirmado, onSeguimientoChange }: ExpandedLeadCRMProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [cierreModalOpen, setCierreModalOpen] = useState(false);
  const prioridad = calcularPrioridad(lead.scoreEstimado);
  const prioridadCfg = PRIORIDAD_CONFIG[prioridad];
  const hasTelefono = lead.clienteTelefono.trim().length > 0;

  const requiereModalDeCierre = (estado: MeInteresaPipelineEstado) => {
    if (estado !== ESTADOS_CIERRE[lead.origen]) return false;
    // 0% comisión (plan "Solo Pauta", negociado o global) — no hay comisión que cobrar, se
    // salta el modal de monto de cierre. 2.25 es el fallback del plan "balanceado" global.
    if (lead.origen === 'comercio' && (comercioComisionPct ?? 2.25) === 0) return false;
    return true;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {/* Perfil Financiero */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Perfil Financiero</h4>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Score Estimado</div>
            <div className="text-sm font-semibold text-foreground font-mono">{lead.scoreEstimado ?? 'Sin datos'}</div>
          </div>
          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Ingresos Estimados</div>
            <div className="text-sm font-semibold text-foreground">
              {lead.rangoIngresos ? (RANGO_INGRESOS_LABELS[lead.rangoIngresos] ?? lead.rangoIngresos) : 'Sin datos'}
            </div>
          </div>
          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5 col-span-2">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Prioridad</div>
            <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-medium', prioridadCfg.bg, prioridadCfg.text, prioridadCfg.border)}>
              {prioridadCfg.label}
            </span>
          </div>
        </div>
      </div>

      {/* Datos de la Solicitud */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datos de la Solicitud</h4>
        <div className="space-y-2 text-sm">
          {lead.origen === 'banco' && (
            <div className="flex justify-between">
              <span className="text-muted-foreground">Producto</span>
              <span className="font-medium">{lead.productoBancario ? (PRODUCT_LABELS[lead.productoBancario] ?? lead.productoBancario) : '—'}</span>
            </div>
          )}
          {lead.origen === 'constructora' && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tipo Vivienda</span>
                <span className="font-medium">{lead.tipoVivienda ? (TIPO_VIVIENDA_LABELS[lead.tipoVivienda] ?? lead.tipoVivienda) : '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Ciudad</span>
                <span className="font-medium">{lead.ciudad || '—'}</span>
              </div>
              {(lead.presupuestoMin !== null || lead.presupuestoMax !== null) && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Presupuesto</span>
                  <span className="font-medium font-mono">
                    ${((lead.presupuestoMin ?? 0) / 1_000_000).toFixed(0)}M - ${((lead.presupuestoMax ?? 0) / 1_000_000).toFixed(0)}M
                  </span>
                </div>
              )}
            </>
          )}
          {lead.origen === 'comercio' && (
            <>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Categoría</span>
                <span className="font-medium">{lead.categoria || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subcategoría</span>
                <span className="font-medium">{lead.subcategoria || '—'}</span>
              </div>
            </>
          )}
          {lead.esClienteBanco && (
            <div className="flex items-center gap-1.5 text-emerald-400 text-xs pt-1">
              <Shield className="h-3 w-3" /> Ya es cliente de este banco
            </div>
          )}
          <div className="flex justify-between pt-1">
            <span className="text-muted-foreground">Recibido</span>
            <span className="font-mono text-xs">
              {new Date(lead.createdAt).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </span>
          </div>
        </div>
      </div>

      {/* Acciones Rápidas */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Acciones Rápidas</h4>
        <div className="flex flex-wrap gap-2">
          <Button asChild size="sm" className={cn('gap-1.5 text-xs bg-blue-600 hover:bg-blue-700', !hasTelefono && 'pointer-events-none opacity-50')}>
            <a href={`tel:${lead.clienteTelefono}`}>
              <Phone className="h-3.5 w-3.5" /> Llamar
            </a>
          </Button>
          <Button asChild size="sm" variant="outline" className={cn('gap-1.5 text-xs border-border/40', !hasTelefono && 'pointer-events-none opacity-50')}>
            <a href={toWhatsAppUrl(lead.clienteTelefono)} target="_blank" rel="noopener noreferrer">
              <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
            </a>
          </Button>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Mover Pipeline</div>
          <Select
            value={lead.estadoPipeline}
            onValueChange={(value) => {
              const estado = value as MeInteresaPipelineEstado;
              if (requiereModalDeCierre(estado)) {
                setCierreModalOpen(true);
              } else {
                onPipelineChange(estado);
              }
            }}
          >
            <SelectTrigger className="h-9 text-xs bg-card/60 border-border/40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {PIPELINE_BY_ORIGEN[lead.origen].map((estado) => (
                <SelectItem key={estado} value={estado} className="text-xs">
                  {PIPELINE_CONFIG[estado].label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Próximo Seguimiento</div>
          <div className="flex items-center gap-1.5">
            <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 text-xs border-border/40 justify-start">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {lead.proximaGestionAt
                    ? format(new Date(lead.proximaGestionAt), "d 'de' MMM", { locale: es })
                    : 'Marcar Seguimiento'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={lead.proximaGestionAt ? new Date(lead.proximaGestionAt) : undefined}
                  onSelect={(date) => {
                    if (date) onSeguimientoChange(date.toISOString());
                    setCalendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
            {lead.proximaGestionAt && (
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => onSeguimientoChange(null)}>
                <X className="h-3.5 w-3.5 text-muted-foreground" />
              </Button>
            )}
          </div>
        </div>
      </div>

      <CierreVentaModal
        open={cierreModalOpen}
        onOpenChange={setCierreModalOpen}
        origen={lead.origen}
        productoBancario={lead.productoBancario}
        onConfirm={(input) => {
          onCierreConfirmado(input);
          setCierreModalOpen(false);
        }}
      />
    </div>
  );
}
