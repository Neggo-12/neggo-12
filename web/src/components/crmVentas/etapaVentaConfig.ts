import type { CrmVentasEtapa, CrmVentasCanal, CrmVentasTipoPerfil, CrmVentasPlanElegido } from '@/core/db/repositories';

/** Las 7 etapas del pipeline, en el orden real del flujo (docs/spec-crm-ventas-admin.md, sección 4). */
export const ETAPA_VENTA_ORDER: CrmVentasEtapa[] = [
  'Pendiente de envío',
  'En seguimiento',
  'Respondió',
  'Agendado',
  'Cerrado - ganado',
  'Perdido',
  'Descartado',
];

/**
 * Las únicas 4 etapas a las que Jhey puede mover un lead manualmente desde el
 * dropdown de la fila expandida (sección 7 del spec). Las otras 3 son
 * automáticas: las dispara `crm_ventas_marcar_enviado` / `crm_ventas_registrar_respuesta`,
 * nunca un cambio de etapa directo.
 */
export const ETAPAS_MANUALES: CrmVentasEtapa[] = ['Agendado', 'Cerrado - ganado', 'Perdido', 'Descartado'];

export const ETAPA_VENTA_CONFIG: Record<
  CrmVentasEtapa,
  { label: string; fullLabel: string; bg: string; text: string; border: string }
> = {
  'Pendiente de envío': {
    label: 'Pendiente de envío', fullLabel: 'Pendiente de envío',
    bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20',
  },
  'En seguimiento': {
    label: 'En seguimiento', fullLabel: 'En seguimiento — esperando respuesta',
    bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20',
  },
  'Respondió': {
    label: 'Respondió', fullLabel: 'Respondió — lista para agente de Ventas',
    bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20',
  },
  'Agendado': {
    label: 'Agendado', fullLabel: 'Agendado',
    bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20',
  },
  'Cerrado - ganado': {
    label: 'Cerrado - ganado', fullLabel: 'Cerrado - ganado',
    bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20',
  },
  'Perdido': {
    label: 'Perdido', fullLabel: 'Perdido',
    bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20',
  },
  'Descartado': {
    label: 'Descartado', fullLabel: 'Descartado',
    bg: 'bg-zinc-500/10', text: 'text-zinc-400', border: 'border-zinc-500/20',
  },
};

export const CANAL_LABELS: Record<CrmVentasCanal, string> = {
  Instagram: 'Instagram',
  LinkedIn: 'LinkedIn',
  Facebook: 'Facebook',
  Web: 'Web',
  Email: 'Email',
  WhatsApp: 'WhatsApp',
};

export const TIPO_PERFIL_LABELS: Record<CrmVentasTipoPerfil, string> = {
  'Comercio directo': 'Comercio directo',
  'Conector': 'Conector',
  'Banco-Constructora': 'Banco / Constructora',
};

/** Los 3 planes reales de Neggo — únicos valores válidos al cerrar un trato (docs/marketing-neggo.md, sección 5.1). */
export const PLAN_ELEGIDO_OPTIONS: { value: CrmVentasPlanElegido; label: string }[] = [
  { value: 'Solo Pauta', label: 'Solo Pauta — $12.000/lead, 0% comisión' },
  { value: 'Balanceado', label: 'Balanceado — $6.000/lead + 2,25% comisión' },
  { value: 'Solo Resultados', label: 'Solo Resultados — $0 adelantado + 4,1% comisión' },
];
