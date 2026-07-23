import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, UserPlus, CalendarClock, Loader2, AlertTriangle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { es } from 'date-fns/locale';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import KPICard from '@/components/KPICard';
import { fetchClientesAdmin, type ClienteAdminRow } from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatUltimaActividad(lastLoginAt: string | null): string {
  if (!lastLoginAt) return 'Nunca ha iniciado sesión';
  return formatDistanceToNow(new Date(lastLoginAt), { locale: es, addSuffix: true });
}

export default function ClientesPanel() {
  const [clientes, setClientes] = useState<ClienteAdminRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isDbConfigured) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchClientesAdmin();
    if (fetchError) {
      setError(fetchError);
    } else {
      setClientes(data ?? []);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

  const { total, nuevos7d, nuevos30d } = useMemo(() => {
    const now = Date.now();
    const DIA_MS = 24 * 60 * 60 * 1000;
    let c7 = 0;
    let c30 = 0;
    for (const c of clientes) {
      const edadDias = (now - new Date(c.createdAt).getTime()) / DIA_MS;
      if (edadDias <= 7) c7 += 1;
      if (edadDias <= 30) c30 += 1;
    }
    return { total: clientes.length, nuevos7d: c7, nuevos30d: c30 };
  }, [clientes]);

  if (!isDbConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <AlertTriangle className="h-8 w-8 text-amber-400 mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-2">Base de datos no configurada</h3>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar Clientes</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>Reintentar</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground">Clientes</h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Usuarios B2C registrados en el ecosistema — rol Cliente
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <KPICard title="Total de Clientes" value={total} icon={Users} gradient="cyan" />
        <KPICard title="Nuevos (7 días)" value={nuevos7d} icon={UserPlus} gradient="emerald" />
        <KPICard title="Nuevos (30 días)" value={nuevos30d} icon={CalendarClock} gradient="blue" />
      </div>

      <div className="rounded-xl border border-border/40 overflow-hidden">
        {clientes.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-muted-foreground">No hay clientes registrados todavía.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead>Nombre</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead className="hidden md:table-cell">Ciudad</TableHead>
                  <TableHead className="hidden md:table-cell">Fecha de Registro</TableHead>
                  <TableHead>Última Actividad</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clientes.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="text-sm font-medium text-foreground">{c.nombre}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground">{c.email}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{c.ciudad ?? '—'}</TableCell>
                    <TableCell className="hidden md:table-cell text-xs text-muted-foreground">{formatFecha(c.createdAt)}</TableCell>
                    <TableCell className={c.lastLoginAt ? 'text-xs text-muted-foreground' : 'text-xs text-amber-400'}>
                      {formatUltimaActividad(c.lastLoginAt)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </div>
    </div>
  );
}
