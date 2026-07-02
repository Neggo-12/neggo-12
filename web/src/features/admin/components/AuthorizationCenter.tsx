import { useAdminStore } from '@/features/admin/store/useAdminStore';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import {
  Building2,
  Home,
  ShoppingBag,
  ShieldCheck,
  ShieldAlert,
  Clock,
  CheckCircle2,
  XCircle,
  Ban,
} from 'lucide-react';
import type { OnboardingRequest, AdminEntityType } from '@/types';
import { useState } from 'react';

// ───── Status config ─────

const statusConfig: Record<string, { label: string; icon: typeof CheckCircle2; className: string }> = {
  autorizado: { label: 'Autorizado', icon: CheckCircle2, className: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  pendiente: { label: 'Pendiente', icon: Clock, className: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  'en-revision': { label: 'En Revisión', icon: ShieldAlert, className: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
  rechazado: { label: 'Rechazado', icon: XCircle, className: 'text-red-400 bg-red-500/10 border-red-500/20' },
};

const entityIcons: Record<AdminEntityType, typeof Building2> = {
  banco: Building2,
  constructora: Home,
  comercio: ShoppingBag,
};

const entityLabels: Record<AdminEntityType, string> = {
  banco: 'Banco',
  constructora: 'Constructora',
  comercio: 'Comercio',
};

// ───── Component ─────

export default function AuthorizationCenter() {
  const {
    onboardingRequests,
    authorizeEntity,
    rejectEntity,
    issueTrustSeal,
  } = useAdminStore();

  const [filter, setFilter] = useState<'todos' | 'pendiente' | 'en-revision' | 'autorizado'>('todos');

  const filtered = filter === 'todos'
    ? onboardingRequests
    : onboardingRequests.filter((r) => r.status === filter);

  const counts = {
    todos: onboardingRequests.length,
    pendiente: onboardingRequests.filter((r) => r.status === 'pendiente' || r.status === 'en-revision').length,
    autorizado: onboardingRequests.filter((r) => r.status === 'autorizado').length,
  };

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header + filter pills */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">
            Consola de Autorizaciones
          </h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            Gestión de solicitudes de ingreso al ecosistema Neggo
          </p>
        </div>
        <div className="flex items-center gap-1.5">
          {(['todos', 'pendiente', 'autorizado'] as const).map((f) => {
            const count = f === 'todos' ? counts.todos : f === 'pendiente' ? counts.pendiente : counts.autorizado;
            return (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  'inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium transition-all',
                  filter === f
                    ? 'bg-primary/10 text-primary border border-primary/20'
                    : 'text-muted-foreground hover:text-foreground border border-transparent hover:border-border/40'
                )}
              >
                {f === 'todos' ? 'Todos' : f === 'pendiente' ? 'Pendientes' : 'Autorizados'}
                <span className="font-mono text-[10px] opacity-70">{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Table */}
      <div className="rounded-xl border border-border/40 overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[200px]">Entidad</TableHead>
              <TableHead className="w-[80px]">Tipo</TableHead>
              <TableHead className="hidden md:table-cell">Ciudad</TableHead>
              <TableHead className="hidden lg:table-cell">NIT</TableHead>
              <TableHead className="hidden md:table-cell">Solicitud</TableHead>
              <TableHead>Estado</TableHead>
              <TableHead className="text-right">Acción</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((row) => (
              <OnboardingRow
                key={row.id}
                row={row}
                onAuthorize={authorizeEntity}
                onReject={rejectEntity}
                onIssueSeal={issueTrustSeal}
              />
            ))}
            {filtered.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground text-sm">
                  Sin solicitudes en este filtro
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

// ───── Row component ─────

function OnboardingRow({
  row,
  onAuthorize,
  onReject,
  onIssueSeal,
}: {
  row: OnboardingRequest;
  onAuthorize: (id: string) => void;
  onReject: (id: string) => void;
  onIssueSeal: (id: string) => void;
}) {
  const status = statusConfig[row.status];
  const StatusIcon = status.icon;
  const EntityIcon = entityIcons[row.entityType];

  return (
    <TableRow className="group">
      <TableCell>
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-card border border-border/40">
            <EntityIcon className="h-3.5 w-3.5 text-muted-foreground" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-foreground truncate">{row.name}</p>
            <p className="text-[11px] text-muted-foreground truncate">{row.detail}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span className="text-xs text-muted-foreground">{entityLabels[row.entityType]}</span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-xs text-muted-foreground">{row.city}</span>
      </TableCell>
      <TableCell className="hidden lg:table-cell">
        <span className="text-xs font-mono text-muted-foreground">{row.nit ?? '—'}</span>
      </TableCell>
      <TableCell className="hidden md:table-cell">
        <span className="text-xs text-muted-foreground">
          {new Date(row.submittedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short', year: 'numeric' })}
        </span>
      </TableCell>
      <TableCell>
        <span
          className={cn(
            'inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold border',
            status.className
          )}
        >
          <StatusIcon className="h-3 w-3" />
          {status.label}
        </span>
      </TableCell>
      <TableCell className="text-right">
        {row.status === 'pendiente' || row.status === 'en-revision' ? (
          <div className="flex items-center justify-end gap-1.5">
            {row.entityType === 'comercio' && row.status === 'en-revision' ? (
              <>
                <button
                  onClick={() => onIssueSeal(row.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  <ShieldCheck className="h-3 w-3" />
                  Emitir Sello
                </button>
                <button
                  onClick={() => onReject(row.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-red-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  <Ban className="h-3 w-3" />
                  Rechazar
                </button>
              </>
            ) : (
              <>
                <button
                  onClick={() => onAuthorize(row.id)}
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-500/10 px-2.5 py-1.5 text-[10px] font-semibold text-emerald-400 border border-emerald-500/20 hover:bg-emerald-500/20 transition-colors"
                >
                  <CheckCircle2 className="h-3 w-3" />
                  {row.entityType === 'banco' ? 'Autorizar Acceso' : row.entityType === 'constructora' ? 'Autorizar Acceso' : 'Emitir Sello'}
                </button>
                <button
                  onClick={() => onReject(row.id)}
                  className="inline-flex items-center justify-center rounded-lg bg-red-500/10 p-1.5 text-red-400 border border-red-500/20 hover:bg-red-500/20 transition-colors"
                >
                  <Ban className="h-3 w-3" />
                </button>
              </>
            )}
          </div>
        ) : row.status === 'autorizado' ? (
          <span className="text-[10px] font-medium text-muted-foreground">
            {row.reviewedAt
              ? new Date(row.reviewedAt).toLocaleDateString('es-CO', { day: '2-digit', month: 'short' })
              : '—'}
          </span>
        ) : (
          <span className="text-[10px] text-muted-foreground">—</span>
        )}
      </TableCell>
    </TableRow>
  );
}
