import { useState, useEffect, useCallback } from 'react';
import { Megaphone, Loader2, AlertTriangle, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { fetchCampanasByOrganization, updateCampanaEstado, type CampanaAdminRow } from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';
import { PRODUCT_LABELS, RANGO_INGRESOS_LABELS } from '@/components/crm/leadLabels';

const ESTADO_CONFIG: Record<CampanaAdminRow['estado'], { label: string; bg: string; text: string; border: string }> = {
  activa: { label: 'Activa', bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20' },
  pausada: { label: 'Pausada', bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/20' },
  cancelada: { label: 'Cancelada', bg: 'bg-red-500/10', text: 'text-red-400', border: 'border-red-500/20' },
  finalizada: { label: 'Finalizada', bg: 'bg-slate-500/10', text: 'text-slate-400', border: 'border-slate-500/20' },
};

function segmentacionResumen(campana: CampanaAdminRow): string {
  const partes: string[] = [];
  if (campana.modoLanzamiento === 'alcance_amplio') partes.push('Alcance amplio');
  const seg = campana.segmentacion;
  if (seg.ciudades && seg.ciudades.length > 0) partes.push(seg.ciudades.join(', '));
  if (seg.producto) partes.push(PRODUCT_LABELS[seg.producto] ?? seg.producto);
  if (seg.rangoIngresos && seg.rangoIngresos.length > 0) {
    partes.push(seg.rangoIngresos.map((r) => RANGO_INGRESOS_LABELS[r] ?? r).join(', '));
  }
  if (seg.scoreMin !== undefined || seg.scoreMax !== undefined) {
    partes.push(`Score ${seg.scoreMin ?? '—'}–${seg.scoreMax ?? '—'}`);
  }
  return partes.length > 0 ? partes.join(' · ') : 'Sin filtros adicionales';
}

/** Lista + gestión de estado de campañas propias — compartido entre bancos y comercios. */
export default function CampanasListPanel({
  organizationId,
  refreshKey,
  selectedCampanaId,
  onSelectCampana,
}: {
  organizationId: string | null;
  refreshKey?: number;
  /** Campaña actualmente seleccionada (resalta la tarjeta) — mismo criterio que isActive en ProjectCard. */
  selectedCampanaId?: string | null;
  /** Al hacer clic en una tarjeta (fuera del selector de estado) — abre el mini-CRM de esa campaña. */
  onSelectCampana?: (campana: CampanaAdminRow) => void;
}) {
  const [campanas, setCampanas] = useState<CampanaAdminRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!isDbConfigured || !organizationId) { setIsLoading(false); return; }
    setIsLoading(true);
    setError(null);
    const { data, error: fetchError } = await fetchCampanasByOrganization(organizationId);
    if (fetchError) {
      setError(fetchError);
      setCampanas([]);
    } else {
      setCampanas(data ?? []);
    }
    setIsLoading(false);
  }, [organizationId]);

  useEffect(() => { void load(); }, [load, refreshKey]);

  const handleEstadoChange = useCallback(async (campanaId: string, nuevoEstado: CampanaAdminRow['estado']) => {
    const anterior = campanas.find((c) => c.id === campanaId)?.estado;
    setCampanas((prev) => prev.map((c) => (c.id === campanaId ? { ...c, estado: nuevoEstado } : c)));
    const { error } = await updateCampanaEstado(campanaId, nuevoEstado);
    if (error) {
      toast.error('No se pudo actualizar el estado de la campaña', { description: error });
      if (anterior) setCampanas((prev) => prev.map((c) => (c.id === campanaId ? { ...c, estado: anterior } : c)));
      return;
    }
    toast.success('Estado de la campaña actualizado');
  }, [campanas]);

  if (!isDbConfigured) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <AlertTriangle className="h-8 w-8 text-amber-400 mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-2">Base de datos no configurada</h3>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="h-8 w-8 text-muted-foreground animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center animate-fade-in">
        <AlertTriangle className="h-8 w-8 text-red-400 mb-3" />
        <h3 className="text-base font-semibold text-foreground mb-2">Error al cargar campañas</h3>
        <p className="text-sm text-muted-foreground mb-4 max-w-md">{error}</p>
        <Button variant="outline" size="sm" onClick={load}>Reintentar</Button>
      </div>
    );
  }

  if (campanas.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center rounded-2xl border border-border/40 bg-card/40 animate-fade-in">
        <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-emerald-500/10 border border-emerald-500/20 mb-5">
          <Megaphone className="h-8 w-8 text-emerald-400" />
        </div>
        <h3 className="text-base font-semibold text-foreground mb-2">No hay campañas activas en este momento</h3>
        <p className="text-sm text-muted-foreground max-w-md">
          Crea tu primera campaña para empezar a recibir leads calificados de clientes que buscan tus productos.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {campanas.map((campana) => {
        const cfg = ESTADO_CONFIG[campana.estado];
        const isSelected = selectedCampanaId === campana.id;
        return (
          <div
            key={campana.id}
            onClick={() => onSelectCampana?.(campana)}
            className={cn(
              'rounded-xl border p-4 space-y-2.5 transition-colors',
              onSelectCampana && 'cursor-pointer hover:border-border/60',
              isSelected ? 'border-blue-500/40 bg-blue-500/5' : 'border-border/40 bg-card/40',
            )}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <h4 className="text-sm font-semibold text-foreground truncate">{campana.titulo}</h4>
                {campana.descripcion && (
                  <p className="text-xs text-muted-foreground line-clamp-2 mt-0.5">{campana.descripcion}</p>
                )}
              </div>
              <div onClick={(e) => e.stopPropagation()}>
                <Select value={campana.estado} onValueChange={(v) => handleEstadoChange(campana.id, v as CampanaAdminRow['estado'])}>
                  <SelectTrigger className={cn('h-6 w-auto shrink-0 gap-1 rounded-full border px-2 py-0 text-[10px] font-medium', cfg.bg, cfg.text, cfg.border)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="activa" className="text-xs">Activa</SelectItem>
                    <SelectItem value="pausada" className="text-xs">Pausada</SelectItem>
                    <SelectItem value="cancelada" className="text-xs">Cancelada</SelectItem>
                    <SelectItem value="finalizada" className="text-xs">Finalizada</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
              <MapPin className="h-3 w-3" />
              <span className="truncate">{segmentacionResumen(campana)}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
