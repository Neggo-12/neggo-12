import { ShieldCheck } from 'lucide-react';
import { usePortalStore } from '@/features/portal/store/usePortalStore';

export default function AntiPhishingBanner() {
  const securityCode = usePortalStore((s) => s.securityCode);

  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-cyan-500/15 bg-cyan-500/5 px-4 py-2">
      {/* Left — shield + label */}
      <div className="flex items-center gap-2 min-w-0">
        <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-cyan-500/10 border border-cyan-500/20">
          <ShieldCheck className="h-3.5 w-3.5 text-cyan-400" />
        </div>
        <span className="text-[11px] text-muted-foreground truncate">
          Si un asesor de Neggo te contacta, te dictará este código para verificar su identidad
        </span>
      </div>

      {/* Right — Security Code badge */}
      <div className="flex shrink-0 items-center gap-2">
        <span className="inline-flex items-center gap-1 rounded-full bg-cyan-500/10 border border-cyan-500/20 px-2 py-0.5 text-[10px] font-semibold text-cyan-400">
          <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Protegido
        </span>
        <span className="text-xs font-bold font-mono tracking-[0.1em] text-cyan-300 tabular-nums">
          {securityCode}
        </span>
      </div>
    </div>
  );
}
