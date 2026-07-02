import { cn } from '@/lib/utils';
import type { LeadStatus } from '@/types';

const statusConfig: Record<LeadStatus, { label: string; bg: string; text: string; border: string; glow: string }> = {
  pendiente: { label: 'Pendiente', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20', glow: 'shadow-slate-500/10' },
  contactado: { label: 'Contactado', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20', glow: 'shadow-blue-500/10' },
  'en-proceso': { label: 'En Proceso', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20', glow: 'shadow-amber-500/10' },
  documentacion: { label: 'Documentación', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20', glow: 'shadow-purple-500/10' },
  viable: { label: 'Viable', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20', glow: 'shadow-cyan-500/10' },
  aprobado: { label: 'Aprobado', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', glow: 'shadow-emerald-500/10' },
  desembolsado: { label: 'Desembolsado', bg: 'bg-green-600/10', text: 'text-green-400', border: 'border-green-600/20', glow: 'shadow-green-500/10' },
  perdido: { label: 'Perdido', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20', glow: 'shadow-red-500/10' },
};

export default function LeadStatusBadge({ status }: { status: LeadStatus }) {
  const cfg = statusConfig[status];
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium', cfg.bg, cfg.text, cfg.border, cfg.glow)}>
      <span className={cn('h-1.5 w-1.5 rounded-full', cfg.text.replace('text-', 'bg-'))} />
      {cfg.label}
    </span>
  );
}
