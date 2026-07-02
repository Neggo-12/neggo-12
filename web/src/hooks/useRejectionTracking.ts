import { useCallback } from 'react';
import { toast } from 'sonner';
import { insertMetricaRechazo } from '@/core/db/repositories';
import type { OfferSector, RejectionMetric } from '@/types';

interface RejectionParams {
  offerId: string;
  sector: OfferSector;
  productType: string;
  entityName: string;
  onRejected?: () => void;
}

const DEMO_USER = {
  id: 'USR-CLIENTE-01',
  age: 34,
  gender: 'Hombre' as const,
  incomeRange: '$3M - $6M COP',
  profileType: 'Alto Patrimonio',
  city: 'Medellín',
};

/**
 * Hook de telemetría de rechazo.
 * Registra métricas demográficas en la DB cada vez que un cliente rechaza una oferta.
 */
export function useRejectionTracking() {
  const trackRejection = useCallback(
    async ({ offerId, sector, productType, entityName, onRejected }: RejectionParams) => {
      const metrica: RejectionMetric = {
        id: `REJ-${Date.now().toString(36).toUpperCase()}`,
        offerId,
        sector,
        productType,
        entityName,
        userId: DEMO_USER.id,
        userAge: DEMO_USER.age,
        userGender: DEMO_USER.gender,
        userIncomeRange: DEMO_USER.incomeRange,
        userProfileType: DEMO_USER.profileType,
        userCity: DEMO_USER.city,
        rejectedAt: new Date().toISOString(),
      };

      // Optimista: notificamos al padre inmediatamente
      onRejected?.();

      toast.info('Oferta descartada', {
        description: `Has indicado que "${productType}" de ${entityName} no te interesa. Tus preferencias ayudan a mejorar las recomendaciones.`,
      });

      // Persistencia en segundo plano
      const { error } = await insertMetricaRechazo(metrica);
      if (error) {
        console.warn('[RejectionTracking] Error persistiendo métrica:', error);
      }
    },
    [],
  );

  return { trackRejection };
}
