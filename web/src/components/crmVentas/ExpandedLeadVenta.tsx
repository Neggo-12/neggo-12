import { useState } from 'react';
import {
  Phone, MessageCircle, Globe, Copy, Send, Sparkles, CalendarClock,
  ClipboardCheck, ExternalLink, Building2, MapPin, ArrowRightCircle, Hash,
} from 'lucide-react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { CrmVentasLeadDisplay, CrmVentasEtapa, CrmVentasCambiarEtapaExtra, CrmVentasPlanElegido } from '@/core/db/repositories';
import { ETAPAS_MANUALES, ETAPA_VENTA_CONFIG, TIPO_PERFIL_LABELS } from './etapaVentaConfig';
import EtapaVentaBadge from './EtapaVentaBadge';
import CerrarTratoModal from './CerrarTratoModal';

/** wa.me con el número del PROSPECTO (nunca el de Neggo) y el mensaje precargado — Jhey siempre
 * revisa y presiona Enviar él mismo dentro de WhatsApp; esto solo evita retipear el mensaje. */
function toWhatsAppUrl(celular: string, mensaje: string): string {
  const digits = celular.replace(/\D/g, '');
  const withCountryCode = digits.startsWith('57') && digits.length > 10 ? digits : `57${digits}`;
  return `https://wa.me/${withCountryCode}?text=${encodeURIComponent(mensaje)}`;
}

async function copyToClipboard(text: string, label: string) {
  try {
    await navigator.clipboard.writeText(text);
    toast.success(`${label} copiado`);
  } catch {
    toast.error('No se pudo copiar', { description: 'El navegador bloqueó el acceso al portapapeles.' });
  }
}

/** Fecha + hora exacta — a diferencia de fecha_alta/fecha_proxima_accion (solo día), fecha_envio
 * y fecha_respuesta necesitan la hora para poder calcular el seguimiento a 24-48h. */
function formatFechaHora(iso: string): string {
  return format(new Date(iso), "d 'de' MMM, HH:mm", { locale: es });
}

interface ExpandedLeadVentaProps {
  lead: CrmVentasLeadDisplay;
  onMarcarEnviado: () => void;
  onGuardarRespuesta: (respuesta: string) => void;
  onCambiarEtapa: (etapa: CrmVentasEtapa, extra?: CrmVentasCambiarEtapaExtra) => void;
}

export default function ExpandedLeadVenta({ lead, onMarcarEnviado, onGuardarRespuesta, onCambiarEtapa }: ExpandedLeadVentaProps) {
  const [respuestaDraft, setRespuestaDraft] = useState(lead.respuestaReal ?? '');
  const [agendarOpen, setAgendarOpen] = useState(false);
  const [cerrarModalOpen, setCerrarModalOpen] = useState(false);

  const respuestaDirty = respuestaDraft.trim() !== (lead.respuestaReal ?? '').trim();
  const puedeGuardarRespuesta = respuestaDraft.trim().length > 0 && respuestaDirty;

  const handleMoverEtapa = (etapa: CrmVentasEtapa) => {
    if (etapa === 'Agendado') {
      setAgendarOpen(true);
      return;
    }
    if (etapa === 'Cerrado - ganado') {
      setCerrarModalOpen(true);
      return;
    }
    onCambiarEtapa(etapa);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4">
      {/* Datos de contacto */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Datos de Contacto</h4>
          <button
            onClick={() => copyToClipboard(lead.id, 'ID')}
            className="inline-flex items-center gap-1 text-[10px] font-mono text-muted-foreground hover:text-foreground"
            title="Copiar ID — mismo identificador que en el documento original"
          >
            <Hash className="h-2.5 w-2.5" /> {lead.id}
          </button>
        </div>

        <div className="space-y-2 text-sm">
          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Celular / WhatsApp</div>
            {lead.celularWhatsapp ? (
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-mono text-foreground">{lead.celularWhatsapp}</span>
                <div className="flex items-center gap-1">
                  <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
                    <a href={`tel:${lead.celularWhatsapp}`} aria-label="Llamar"><Phone className="h-3.5 w-3.5 text-muted-foreground" /></a>
                  </Button>
                  {lead.mensajeArmado && (
                    <Button asChild size="sm" variant="ghost" className="h-7 w-7 p-0">
                      <a href={toWhatsAppUrl(lead.celularWhatsapp, lead.mensajeArmado)} target="_blank" rel="noopener noreferrer" aria-label="Abrir WhatsApp">
                        <MessageCircle className="h-3.5 w-3.5 text-emerald-400" />
                      </a>
                    </Button>
                  )}
                </div>
              </div>
            ) : (
              <span className="text-xs text-muted-foreground">Sin dato</span>
            )}
          </div>

          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Página web</div>
            {lead.paginaWeb ? (
              <a
                href={lead.paginaWeb.startsWith('http') ? lead.paginaWeb : `https://${lead.paginaWeb}`}
                target="_blank" rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline break-all"
              >
                <Globe className="h-3 w-3 shrink-0" /> {lead.paginaWeb} <ExternalLink className="h-2.5 w-2.5 shrink-0" />
              </a>
            ) : (
              <span className="text-xs text-muted-foreground">Sin dato</span>
            )}
          </div>

          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Contacto (perfil / link)</div>
            <span className="text-xs text-foreground break-all">{lead.contacto || '—'}</span>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Tipo de perfil</div>
              <span className="text-xs font-medium text-foreground">{TIPO_PERFIL_LABELS[lead.tipoPerfil]}</span>
            </div>
            <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Categoría</div>
              <span className="text-xs font-medium text-foreground">{lead.categoria || '—'}</span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 rounded-lg bg-card/60 border border-border/30 p-2.5">
            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" /> {lead.ciudadZona || 'Ciudad/zona sin dato'}
            </div>
            {lead.cuentaGrande && (
              <Badge variant="outline" className="text-[9px] gap-1 border-amber-500/30 bg-amber-500/10 text-amber-400">
                <Building2 className="h-2.5 w-2.5" /> Cuenta grande
              </Badge>
            )}
          </div>

          {lead.ganchoPersonalizacion && (
            <div className="rounded-lg bg-card/40 border border-border/20 p-2.5">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Gancho de personalización</div>
              <p className="text-xs text-muted-foreground italic leading-relaxed">{lead.ganchoPersonalizacion}</p>
            </div>
          )}
        </div>
      </div>

      {/* Mensaje y respuesta */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Mensaje &amp; Respuesta</h4>

        {lead.mensajeArmado && (
          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Mensaje armado</span>
              <Button size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-[10px]" onClick={() => copyToClipboard(lead.mensajeArmado!, 'Mensaje')}>
                <Copy className="h-3 w-3" /> Copiar
              </Button>
            </div>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-32 overflow-y-auto">{lead.mensajeArmado}</p>
          </div>
        )}

        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Envío</span>
          <Badge variant="outline" className={cn('text-[10px]', lead.estadoEnvio === 'Enviado' ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400' : 'border-slate-500/30 bg-slate-500/10 text-slate-400')}>
            {lead.estadoEnvio}
          </Badge>
          {lead.fechaEnvio && (
            <span className="text-[10px] text-muted-foreground font-mono">{formatFechaHora(lead.fechaEnvio)}</span>
          )}
          {lead.estadoEnvio === 'Pendiente de envío' && (
            <Button size="sm" className="h-7 gap-1 text-[11px] bg-blue-600 hover:bg-blue-500" onClick={onMarcarEnviado}>
              <Send className="h-3 w-3" /> Marcar enviado
            </Button>
          )}
        </div>

        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Respuesta real del negocio</span>
            {lead.fechaRespuesta && (
              <span className="text-[10px] text-muted-foreground font-mono">{formatFechaHora(lead.fechaRespuesta)}</span>
            )}
          </div>
          <Textarea
            value={respuestaDraft}
            onChange={(e) => setRespuestaDraft(e.target.value)}
            placeholder="Pegar acá exactamente lo que respondió el negocio..."
            className="min-h-[72px] text-xs bg-card/60 border-border/40"
          />
          <Button
            size="sm"
            variant="outline"
            disabled={!puedeGuardarRespuesta}
            className="h-7 gap-1 text-[11px] border-border/40"
            onClick={() => onGuardarRespuesta(respuestaDraft.trim())}
          >
            <ClipboardCheck className="h-3 w-3" /> Guardar respuesta
          </Button>
        </div>

        {lead.respuestaSugerida && (
          <div className="rounded-lg border border-purple-500/25 bg-purple-500/5 p-2.5 space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-wider text-purple-400 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> Respuesta sugerida (Ventas)
              </span>
              <Button size="sm" variant="ghost" className="h-6 gap-1 px-1.5 text-[10px] text-purple-400 hover:text-purple-300" onClick={() => copyToClipboard(lead.respuestaSugerida!, 'Respuesta sugerida')}>
                <Copy className="h-3 w-3" /> Copiar
              </Button>
            </div>
            <p className="text-xs text-foreground leading-relaxed whitespace-pre-wrap max-h-36 overflow-y-auto">{lead.respuestaSugerida}</p>
          </div>
        )}
      </div>

      {/* Pipeline */}
      <div className="space-y-3">
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Pipeline</h4>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Etapa actual</div>
          <EtapaVentaBadge etapa={lead.etapa} />
        </div>

        <div>
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1.5">Mover a etapa manual</div>
          <div className="flex items-center gap-1.5">
            <Select onValueChange={(v) => handleMoverEtapa(v as CrmVentasEtapa)}>
              <SelectTrigger className="h-9 text-xs bg-card/60 border-border/40">
                <SelectValue placeholder="Agendado / Cerrado / Perdido / Descartado" />
              </SelectTrigger>
              <SelectContent>
                {ETAPAS_MANUALES.map((etapa) => (
                  <SelectItem key={etapa} value={etapa} className="text-xs">
                    {ETAPA_VENTA_CONFIG[etapa].label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Popover open={agendarOpen} onOpenChange={setAgendarOpen}>
              <PopoverTrigger asChild>
                <button type="button" tabIndex={-1} aria-hidden="true" className="h-9 w-0 opacity-0" />
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <div className="p-2 text-[11px] text-muted-foreground border-b border-border/30 flex items-center gap-1.5">
                  <CalendarClock className="h-3 w-3" /> Fecha de la próxima acción
                </div>
                <Calendar
                  mode="single"
                  selected={lead.fechaProximaAccion ? new Date(lead.fechaProximaAccion) : undefined}
                  onSelect={(date) => {
                    if (!date) return;
                    onCambiarEtapa('Agendado', { fechaProximaAccion: date.toISOString().slice(0, 10) });
                    setAgendarOpen(false);
                  }}
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {lead.fechaProximaAccion && (
          <div className="rounded-lg bg-card/60 border border-border/30 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1 flex items-center gap-1">
              <ArrowRightCircle className="h-3 w-3" /> Próxima acción
            </div>
            <div className="text-xs font-medium text-foreground font-mono">
              {new Date(lead.fechaProximaAccion + 'T00:00:00').toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
            {lead.proximaAccion && <p className="text-xs text-muted-foreground mt-1">{lead.proximaAccion}</p>}
          </div>
        )}

        {lead.etapa === 'Cerrado - ganado' && (lead.planElegido || lead.valorMensualEstimado !== null) && (
          <div className="rounded-lg border border-emerald-500/25 bg-emerald-500/5 p-2.5 space-y-1 text-xs">
            <div className="flex justify-between"><span className="text-muted-foreground">Plan</span><span className="font-medium text-emerald-400">{lead.planElegido ?? '—'}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Valor mensual est.</span><span className="font-mono font-medium text-emerald-400">{lead.valorMensualEstimado !== null ? `$${lead.valorMensualEstimado.toLocaleString('es-CO')}` : '—'}</span></div>
          </div>
        )}

        {lead.notas && (
          <div className="rounded-lg bg-card/40 border border-border/20 p-2.5">
            <div className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">Notas</div>
            <p className="text-[11px] text-muted-foreground leading-relaxed max-h-28 overflow-y-auto whitespace-pre-wrap">{lead.notas}</p>
          </div>
        )}

        <div className="rounded-lg bg-card/40 border border-border/20 p-2 text-[10px] text-muted-foreground flex items-center gap-1">
          <ArrowRightCircle className="h-3 w-3 shrink-0" /> Última gestión: <span className="font-mono text-foreground">{formatFechaHora(lead.updatedAt)}</span>
        </div>

        <div className="flex justify-between text-[10px] text-muted-foreground pt-1">
          <span>Alta: {new Date(lead.fechaAlta).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          {lead.origen && <span className="truncate max-w-[50%]" title={lead.origen}>{lead.origen}</span>}
        </div>
      </div>

      <CerrarTratoModal
        open={cerrarModalOpen}
        onOpenChange={setCerrarModalOpen}
        nombreNegocio={lead.nombreNegocio}
        onConfirm={(input: { planElegido: CrmVentasPlanElegido; valorMensualEstimado: number }) => {
          onCambiarEtapa('Cerrado - ganado', { planElegido: input.planElegido, valorMensualEstimado: input.valorMensualEstimado });
          setCerrarModalOpen(false);
        }}
      />
    </div>
  );
}
