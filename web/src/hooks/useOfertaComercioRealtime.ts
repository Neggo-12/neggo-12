import { useEffect } from 'react';
import { toast } from 'sonner';
import type { RealtimePostgresUpdatePayload } from '@supabase/supabase-js';
import { supabase, isDbConfigured } from '@/core/db/dbClient';
import type { Database } from '@/integrations/supabase/types';

type OfertaComercioRow = Database['public']['Tables']['ofertas_comercios']['Row'];

/** El catch queda silencioso a propósito: los navegadores bloquean audio sin
 * interacción previa del usuario — el toast sigue siendo la señal principal. */
function playNotificationSound(): void {
  new Audio('/sounds/notificacion.wav').play().catch(() => {});
}

/**
 * Notifica al comercio en tiempo real cuando un cliente acepta/rechaza una de
 * sus ofertas — sin recargar. La policy SELECT de ofertas_comercios
 * (comercio_id = auth.uid()::text) ya limita el canal a las ofertas propias
 * del comercio, verificado vía MCP antes de implementar esto.
 */
export function useOfertaComercioRealtime(comercioId: string | null, onRespuesta?: () => void): void {
  useEffect(() => {
    if (!isDbConfigured || !supabase || !comercioId) return;

    const channel = supabase
      .channel(`ofertas-comercio-${comercioId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'ofertas_comercios',
          filter: `comercio_id=eq.${comercioId}`,
        },
        (payload: RealtimePostgresUpdatePayload<OfertaComercioRow>) => {
          const nuevoEstado = payload.new.estado;
          if (nuevoEstado === payload.old?.estado) return;

          if (nuevoEstado === 'aceptada') {
            toast.success('¡Oferta aceptada!', {
              description: 'Un cliente aceptó tu oferta.',
            });
            playNotificationSound();
          } else if (nuevoEstado === 'rechazada') {
            toast.error('Oferta rechazada', {
              description: payload.new.motivo_rechazo ?? 'Un cliente rechazó tu oferta.',
            });
            playNotificationSound();
          }

          onRespuesta?.();
        },
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(channel);
    };
  }, [comercioId, onRespuesta]);
}
