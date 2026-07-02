import { useState, useEffect, useCallback } from 'react';
import {
  Building2, Clock, FileText, Search, Shield, Sparkles,
  Loader2, AlertTriangle,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  fetchSolicitudesByBankName,
  type SolicitudBancaRow,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';
import type { UsuarioDB } from '@/types';

// ───── Product type labels ─────

const PRODUCT_LABELS: Record<string, string> = {
  'compra-cartera': 'Compra de Cartera',
  'credito-hipotecario': 'Crédito Hipotecario',
  'cdt': 'CDT',
  'libre-inversion': 'Libre Inversión',
};

// ───── Status badge config ─────

const STATUS_CONFIG: Record<string, { bg: string; text: string; border: string }> = {
  'Pendiente de contacto por el banco': {
    bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20',
  },
  'En revisión': {
    bg: 'bg-blue-500/10', text: 'text-blue-400', border: 'border-blue-500/20',
  },
  'Aprobada': {
    bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20',
  },
};

export default function SolicitudesTab({ bankName, bankUser }: { bankName: string; bankUser: UsuarioDB | null }) {
  const [solicitudes, setSolicitudes] = useState<SolicitudBancaRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const loadSolicitudes = useCallback(async () => {
    if (!isDbConfigured || !bankName) {
      setIsLoading(false);
      return;
    }
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchSolicitudesByBankName(bankName);
    if (fetchError) {
      setError(fetchError);
      setSolicitudes([]);
    } else {
      setSolicitudes(data ?? []);
    }
    setIsLoading(false);
  }, [bankName]);

  useEffect(() => {
    loadSolicitudes();
  }, [loadSolicitudes]);

  const filtered = solicitudes.filter((s) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      s.id.toLowerCase().includes(q) ||
      s.producto.toLowerCase().includes(q) ||
      s.bancos.some((b) => b.toLowerCase().includes(q))
    );
  });

  // ───── DB not configured empty state ─────
  if (!isDbConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-500/10 border border-amber-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-amber-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Base de datos no configurada</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Configura las variables de entorno <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VITE_SUPABASE_URL</code> y{' '}
          <code className="text-xs bg-muted px-1.5 py-0.5 rounded">VITE_SUPABASE_ANON_KEY</code> para activar la persistencia real.
        </p>
      </div>
    );
  }

  // ───── Loading state ─────
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <Loader2 className="h-10 w-10 text-primary animate-spin mb-4" />
        <p className="text-sm font-medium text-muted-foreground">Cargando solicitudes de clientes...</p>
      </div>
    );
  }

  // ───── Error state ─────
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20 mb-5">
          <AlertTriangle className="h-8 w-8 text-red-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar solicitudes</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={loadSolicitudes}>
          Reintentar
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      {/* Bank identity header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 p-4 rounded-xl border border-border/40 bg-card/40">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/10 border border-emerald-500/20">
            <Building2 className="h-5 w-5 text-emerald-400" />
          </div>
          <div>
            <h2 className="text-base font-semibold text-foreground">
              {bankUser?.nombre ?? bankName}
            </h2>
            <p className="text-xs text-muted-foreground">
              {bankUser?.id ? `ID: ${bankUser.id}` : ''} · {bankUser?.ciudad ?? ''}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1.5">
            <Shield className="h-3.5 w-3.5 text-emerald-400" />
            <span className="text-xs font-medium text-emerald-400">Sesión Activa</span>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Solicitudes recibidas</div>
            <div className="text-lg font-bold text-foreground font-mono">{solicitudes.length}</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Buscar por ID, producto o banco..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9 bg-card/60 border-border/40 text-sm"
        />
      </div>

      {/* Solicitudes table */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-border/40 bg-card/40 animate-fade-in">
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
            <FileText className="h-8 w-8 text-emerald-400" />
          </div>
          <h3 className="text-base font-semibold text-foreground mb-2">
            {search ? 'No se encontraron solicitudes' : 'No tienes solicitudes de clientes en este momento'}
          </h3>
          <p className="text-sm text-muted-foreground max-w-md">
            {search
              ? 'Intenta ajustar tu término de búsqueda.'
              : 'Cuando un cliente envíe una solicitud a tu entidad, aparecerá aquí automáticamente.'}
          </p>
        </div>
      ) : (
        <div className="rounded-xl border border-border/40 bg-card/40 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border/40 bg-card/60">
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">ID Solicitud</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Producto</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Bancos Solicitados</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Estado</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Fecha</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30">
                {filtered.map((sol) => {
                  const statusCfg = STATUS_CONFIG[sol.estado] ?? STATUS_CONFIG['Pendiente de contacto por el banco'];
                  return (
                    <tr key={sol.id} className="group transition-colors hover:bg-card/60">
                      <td className="px-4 py-3">
                        <span className="font-mono text-xs text-muted-foreground">{sol.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant="outline" className="text-xs border-border/40 bg-secondary/40">
                          {PRODUCT_LABELS[sol.producto] ?? sol.producto}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {sol.bancos.map((b) => (
                            <span
                              key={b}
                              className={cn(
                                'inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium',
                                b === bankName
                                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                                  : 'bg-secondary/40 text-muted-foreground border-border/30',
                              )}
                            >
                              {b}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn('inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-medium', statusCfg.bg, statusCfg.text, statusCfg.border)}>
                          <Clock className="h-2.5 w-2.5" />
                          {sol.estado}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-xs text-muted-foreground">
                          {new Date(sol.created_at).toLocaleDateString('es-CO', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* KPI summary footer */}
      {filtered.length > 0 && (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Total Solicitudes', value: solicitudes.length, icon: FileText, color: 'text-emerald-400', bg: 'bg-emerald-500/10' },
            {
              label: 'Pendientes',
              value: solicitudes.filter((s) => s.estado === 'Pendiente de contacto por el banco').length,
              icon: Clock,
              color: 'text-amber-400',
              bg: 'bg-amber-500/10',
            },
            {
              label: 'En Revisión',
              value: solicitudes.filter((s) => s.estado === 'En revisión').length,
              icon: Search,
              color: 'text-blue-400',
              bg: 'bg-blue-500/10',
            },
            {
              label: 'Aprobadas',
              value: solicitudes.filter((s) => s.estado === 'Aprobada').length,
              icon: Sparkles,
              color: 'text-purple-400',
              bg: 'bg-purple-500/10',
            },
          ].map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border/40 bg-card/40 p-4">
              <div className="flex items-center gap-2 mb-2">
                <div className={cn('flex h-7 w-7 items-center justify-center rounded-md', stat.bg)}>
                  <stat.icon className={cn('h-3.5 w-3.5', stat.color)} />
                </div>
              </div>
              <div className="text-xl font-bold text-foreground font-mono">{stat.value}</div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium">{stat.label}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
