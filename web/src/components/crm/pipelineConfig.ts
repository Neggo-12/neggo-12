import type { MeInteresaLeadDisplay, MeInteresaPipelineEstado } from '@/core/db/repositories';

/** Orden del pipeline de leads de Me Interesa — sección 9.1 del roadmap. */
export const PIPELINE_ORDER: MeInteresaPipelineEstado[] = [
  'pendiente', 'contactado', 'en_proceso', 'documentacion',
  'viable', 'aprobado', 'desembolsado', 'perdido',
];

/** Pipeline corto de Comercios — reemplaza los 8 estados genéricos para este sector. */
export const PIPELINE_COMERCIO: MeInteresaPipelineEstado[] = [
  'pendiente', 'contactado', 'vendido', 'no_interesado',
];

/** Qué subconjunto de estados aplica a cada sector — usado por el selector "Mover Pipeline". */
export const PIPELINE_BY_ORIGEN: Record<MeInteresaLeadDisplay['origen'], MeInteresaPipelineEstado[]> = {
  banco: PIPELINE_ORDER,
  constructora: PIPELINE_ORDER,
  comercio: PIPELINE_COMERCIO,
};

/**
 * Estado terminal que cierra un lead por sector — el evento que dispara el
 * success fee en la Fase 9.2 (docs/negocio-me-interesa-metas.md, sección 9.2).
 * No se usa todavía; queda preparado para esa fase.
 */
export const ESTADOS_CIERRE: Record<MeInteresaLeadDisplay['origen'], MeInteresaPipelineEstado> = {
  banco: 'desembolsado',
  constructora: 'desembolsado',
  comercio: 'vendido',
};

export const PIPELINE_CONFIG: Record<MeInteresaPipelineEstado, { label: string; bg: string; text: string; border: string }> = {
  pendiente: { label: 'Pendiente', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  contactado: { label: 'Contactado', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  en_proceso: { label: 'En Proceso', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  documentacion: { label: 'Documentación', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  viable: { label: 'Viable', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
  aprobado: { label: 'Aprobado', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  desembolsado: { label: 'Desembolsado', bg: 'bg-green-600/10', text: 'text-green-400', border: 'border-green-600/20' },
  perdido: { label: 'Perdido', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  vendido: { label: 'Vendido', bg: 'bg-green-600/10', text: 'text-green-400', border: 'border-green-600/20' },
  no_interesado: { label: 'No Interesado', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
};

export type Prioridad = 'alta' | 'media' | 'baja' | 'sin_datos';

export const PRIORIDAD_CONFIG: Record<Prioridad, { label: string; bg: string; text: string; border: string }> = {
  alta: { label: 'Alta', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  media: { label: 'Media', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  baja: { label: 'Baja', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  sin_datos: { label: 'Sin datos', bg: 'bg-slate-500/10', text: 'text-slate-500', border: 'border-slate-500/20' },
};

/** Prioridad automática a partir del score estimado (fórmula rango→score en authService.ts). */
export function calcularPrioridad(scoreEstimado: number | null): Prioridad {
  if (scoreEstimado === null) return 'sin_datos';
  if (scoreEstimado >= 720) return 'alta';
  if (scoreEstimado >= 600) return 'media';
  return 'baja';
}
