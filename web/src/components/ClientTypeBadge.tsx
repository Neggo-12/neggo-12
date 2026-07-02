import { cn } from '@/lib/utils';
import type { ClientType } from '@/types';

const typeConfig: Record<ClientType, { label: string; bg: string; text: string; border: string }> = {
  'cliente-banco': { label: 'Cliente Banco', bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20' },
  'no-cliente': { label: 'No Cliente', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
  premium: { label: 'Premium', bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  nomina: { label: 'Nómina', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  'alto-patrimonio': { label: 'Alto Patrimonio', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  riesgo: { label: 'Riesgo', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  prospecto: { label: 'Prospecto', bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/20' },
};

export default function ClientTypeBadge({ type }: { type: ClientType }) {
  const cfg = typeConfig[type];
  return (
    <span className={cn('inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium', cfg.bg, cfg.text, cfg.border)}>
      {cfg.label}
    </span>
  );
}
