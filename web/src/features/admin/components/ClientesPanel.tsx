import { useState, useEffect, useCallback, useMemo } from 'react';
import { Users, UserPlus, CalendarClock, Loader2, AlertTriangle, Activity, MoonStar, MapPin, Target, MessageSquareText, Coins } from 'lucide-react';
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
import { fetchClientesAdmin, fetchClientesUsoAgregado, type ClienteAdminRow, type ClientesUsoAgregado } from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';

const SEMANAS_TENDENCIA = 6;

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleDateString('es-CO', { day: 'numeric', month: 'short', year: 'numeric' });
}

function formatUltimaActividad(lastLoginAt: string | null): string {
  if (!lastLoginAt) return 'Nunca ha iniciado sesión';
  return formatDistanceToNow(new Date(lastLoginAt), { locale: es, addSuffix: true });
}

export default function ClientesPanel() {
  const [clientes, setClientes] = useState<ClienteAdminRow[]>([]);
  const [usoAgregado, setUsoAgregado] = useState<ClientesUsoAgregado | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isDbConfigured) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const [clientesRes, usoRes] = await Promise.all([fetchClientesAdmin(), fetchClientesUsoAgregado()]);
    if (clientesRes.error) {
      setError(clientesRes.error);
    } else {
      setClientes(clientesRes.data ?? []);
    }
    if (usoRes.data) setUsoAgregado(usoRes.data);
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

  const { activos30d, nuncaIngresaron } = useMemo(() => {
    const now = Date.now();
    const DIA_MS = 24 * 60 * 60 * 1000;
    let activos = 0;
    let nunca = 0;
    for (const c of clientes) {
      if (!c.lastLoginAt) { nunca += 1; continue; }
      const diasDesdeLogin = (now - new Date(c.lastLoginAt).getTime()) / DIA_MS;
      if (diasDesdeLogin <= 30) activos += 1;
    }
    return { activos30d: activos, nuncaIngresaron: nunca };
  }, [clientes]);

  const topCiudades = useMemo(() => {
    const conteo = new Map<string, number>();
    for (const c of clientes) {
      const ciudad = c.ciudad ?? 'Sin ciudad';
      conteo.set(ciudad, (conteo.get(ciudad) ?? 0) + 1);
    }
    return [...conteo.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);
  }, [clientes]);

  const tendenciaSemanal = useMemo(() => {
    const SEMANA_MS = 7 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const buckets = Array.from({ length: SEMANAS_TENDENCIA }, (_, i) => ({
      etiqueta: i === 0 ? 'Esta semana' : `Hace ${i} semana${i > 1 ? 's' : ''}`,
      desde: now - (i + 1) * SEMANA_MS,
      hasta: now - i * SEMANA_MS,
      total: 0,
    }));
    for (const c of clientes) {
      const t = new Date(c.createdAt).getTime();
      const bucket = buckets.find((b) => t > b.desde && t <= b.hasta);
      if (bucket) bucket.total += 1;
    }
    return buckets.reverse();
  }, [clientes]);

  const maxTendencia = Math.max(1, ...tendenciaSemanal.map((b) => b.total));

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

      {/* Actividad — activos vs. inactivos */}
      <div className="grid gap-4 sm:grid-cols-2">
        <KPICard title="Activos (login últimos 30 días)" value={activos30d} icon={Activity} gradient="emerald" />
        <KPICard title="Nunca iniciaron sesión" value={nuncaIngresaron} icon={MoonStar} gradient="amber" />
      </div>

      {/* Uso real de la plataforma */}
      {usoAgregado && (
        <div className="grid gap-4 sm:grid-cols-3">
          <KPICard title="Con Meta creada" value={usoAgregado.clientesConMeta} icon={Target} gradient="blue" />
          <KPICard title="Con solicitud enviada" value={usoAgregado.clientesConSolicitud} icon={MessageSquareText} gradient="cyan" />
          <KPICard title="Con puntos" value={usoAgregado.clientesConPuntos} icon={Coins} gradient="amber" />
        </div>
      )}

      {/* Distribución por ciudad + tendencia de registros */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Top ciudades</h3>
          </div>
          {topCiudades.length === 0 ? (
            <p className="text-xs text-muted-foreground">Sin datos todavía.</p>
          ) : (
            <div className="space-y-2">
              {topCiudades.map(([ciudad, cantidad]) => (
                <div key={ciudad} className="flex items-center justify-between text-xs">
                  <span className="text-foreground">{ciudad}</span>
                  <span className="font-mono text-muted-foreground">{cantidad}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-xl border border-border/40 bg-card/40 p-4 space-y-3">
          <div className="flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold text-foreground">Tendencia de registros</h3>
          </div>
          <div className="space-y-1.5">
            {tendenciaSemanal.map((b) => (
              <div key={b.etiqueta} className="flex items-center gap-2 text-xs">
                <span className="w-24 shrink-0 text-muted-foreground truncate">{b.etiqueta}</span>
                <div className="flex-1 h-2 rounded-full bg-secondary/40 overflow-hidden">
                  <div
                    className="h-full rounded-full bg-blue-500/60"
                    style={{ width: `${(b.total / maxTendencia) * 100}%` }}
                  />
                </div>
                <span className="w-6 shrink-0 text-right font-mono text-foreground">{b.total}</span>
              </div>
            ))}
          </div>
        </div>
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
                    <TableCell className="text-sm font-medium text-foreground truncate max-w-[200px]" title={c.nombre}>{c.nombre}</TableCell>
                    <TableCell className="text-xs font-mono text-muted-foreground truncate max-w-[200px]" title={c.email}>{c.email}</TableCell>
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
