import { useState, useEffect, useCallback } from 'react';
import { ScrollText, Loader2, AlertTriangle, ShieldAlert, CheckCircle2, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  fetchAuditLogReciente, fetchUltimoSnapshotAdvisors,
  type AuditLogRow, type SeguridadAdvisorsSnapshotRow,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';

function formatFecha(iso: string): string {
  return new Date(iso).toLocaleString('es-CO', {
    day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

/** event_type viene como 'dominio.accion' (ej: 'puntos.canjeado') — se muestra legible. */
function formatEventType(eventType: string): string {
  return eventType.replace(/[._]/g, ' ');
}

interface HallazgoResumen {
  name: string;
  title: string;
  level: string;
  count: number;
  estado: string;
}

/**
 * Panel "Auditoría" del Admin — consolida telemetría de seguridad ya existente
 * en un solo lugar, sin servidor nuevo (alternativa liviana a un SIEM tipo
 * Wazuh, que requeriría infraestructura propia que no encaja con la
 * arquitectura serverless de Neggo):
 *  - audit_log: rastro real de acciones sensibles (dinero/estado), activado en
 *    esta misma sesión — antes existía la tabla pero nada le escribía.
 *  - seguridad_advisors_snapshot: última fotografía de los advisors de
 *    seguridad de Supabase, tomada por la revisión periódica externa (no se
 *    puede consultar en vivo desde el navegador — requiere credenciales de
 *    gestión que el cliente de la app nunca tiene).
 * "Salud del Sistema" (fallos_app) es un panel aparte ya existente — no se
 * duplica acá.
 */
export default function AuditoriaPanel() {
  const [eventos, setEventos] = useState<AuditLogRow[]>([]);
  const [snapshot, setSnapshot] = useState<SeguridadAdvisorsSnapshotRow | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isDbConfigured) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const [{ data: eventosData, error: eventosError }, { data: snapshotData, error: snapshotError }] =
      await Promise.all([fetchAuditLogReciente(), fetchUltimoSnapshotAdvisors()]);

    if (eventosError) { setError(eventosError); }
    else if (snapshotError) { setError(snapshotError); }
    else {
      setEventos(eventosData ?? []);
      setSnapshot(snapshotData);
    }
    setIsLoading(false);
  }, []);

  useEffect(() => { void load(); }, [load]);

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
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar Auditoría</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>Reintentar</Button>
      </div>
    );
  }

  const hallazgos = (snapshot?.hallazgos as unknown as HallazgoResumen[] | null) ?? [];

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h2 className="text-lg font-bold tracking-tight text-foreground flex items-center gap-2">
          <ScrollText className="h-5 w-5 text-indigo-400" />
          Auditoría
        </h2>
        <p className="text-xs text-muted-foreground mt-0.5">
          Rastro de acciones sensibles (dinero/estado) + estado de advisors de seguridad — consolidado sin servidor nuevo.
        </p>
      </div>

      {/* ── Snapshot de advisors ── */}
      <div className="rounded-2xl border border-border/40 bg-card/60 p-5 space-y-4">
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className={
              snapshot && snapshot.security_warnings_count > 0
                ? 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-amber-500/10 border-amber-500/20'
                : 'flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border bg-emerald-500/10 border-emerald-500/20'
            }>
              {snapshot && snapshot.security_warnings_count > 0
                ? <ShieldAlert className="h-4 w-4 text-amber-400" />
                : <CheckCircle2 className="h-4 w-4 text-emerald-400" />}
            </div>
            <div>
              <h4 className="text-sm font-semibold text-foreground">Advisors de seguridad (Supabase)</h4>
              {snapshot ? (
                <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                  <Clock className="h-2.5 w-2.5" /> Última revisión: {formatFecha(snapshot.checked_at)}
                </p>
              ) : (
                <p className="text-[10px] text-muted-foreground">Todavía no hay ninguna revisión registrada.</p>
              )}
            </div>
          </div>
          {snapshot && (
            <Badge className="bg-amber-500/10 text-amber-400 border-amber-500/20 text-[10px] font-mono">
              {snapshot.security_warnings_count} hallazgos
            </Badge>
          )}
        </div>

        {snapshot?.notas && (
          <p className="text-xs text-muted-foreground leading-relaxed border-t border-border/30 pt-3">{snapshot.notas}</p>
        )}

        {hallazgos.length > 0 && (
          <div className="space-y-1.5 border-t border-border/30 pt-3">
            {hallazgos.map((h) => (
              <div key={h.name} className="flex items-start gap-2 text-xs">
                <Badge variant="outline" className="text-[9px] font-mono shrink-0 mt-0.5">{h.count}×</Badge>
                <div className="min-w-0">
                  <p className="text-foreground font-medium">{h.title}</p>
                  <p className="text-muted-foreground">{h.estado}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* ── audit_log reciente ── */}
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-2">Actividad reciente (últimas 50)</h3>
        {eventos.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center rounded-2xl border border-border/40 bg-card/40">
            <ScrollText className="h-8 w-8 text-muted-foreground mb-3" />
            <h4 className="text-sm font-semibold text-foreground mb-1">Sin actividad registrada todavía</h4>
            <p className="text-xs text-muted-foreground max-w-sm">
              Acá aparecerán las acciones sensibles (canjes de puntos, cierres de leads, pagos confirmados, etc.) a medida que ocurran.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-border/40 bg-card/60 overflow-hidden">
            <div className="overflow-x-auto scrollbar-thin">
              <table className="w-full text-xs">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/40">
                    <th className="px-4 py-3 font-medium">Evento</th>
                    <th className="px-4 py-3 font-medium">Usuario</th>
                    <th className="px-4 py-3 font-medium">Organización</th>
                    <th className="px-4 py-3 font-medium">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/20">
                  {eventos.map((e) => (
                    <tr key={e.id}>
                      <td className="px-4 py-3">
                        <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 text-[10px] font-mono capitalize">
                          {formatEventType(e.event_type)}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-foreground">{e.email ?? e.user_id ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground font-mono">{e.organization_id ?? '—'}</td>
                      <td className="px-4 py-3 text-muted-foreground">{formatFecha(e.created_at)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
