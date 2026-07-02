import { cn } from '@/lib/utils';
import { CheckCircle2, XCircle } from 'lucide-react';

interface BankClientBadgeProps {
  isClient: boolean;
}

export default function BankClientBadge({ isClient }: BankClientBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md border px-2 py-0.5 text-xs font-medium',
        isClient
          ? 'border-emerald-500/20 bg-emerald-500/10 text-emerald-400'
          : 'border-red-500/20 bg-red-500/10 text-red-400'
      )}
    >
      {isClient ? (
        <>
          <CheckCircle2 className="h-3 w-3" />
          Cliente
        </>
      ) : (
        <>
          <XCircle className="h-3 w-3" />
          No Cliente
        </>
      )}
    </span>
  );
}
