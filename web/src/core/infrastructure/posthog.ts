/**
 * Infrastructure — PostHog product analytics (autocapture, funnels, session
 * replay).
 *
 * No-op cuando VITE_POSTHOG_KEY no está configurada — el mismo patrón que
 * isDbConfigured/isSentryConfigured, para que la app nunca dependa de que
 * PostHog esté presente para funcionar.
 */
import posthog from 'posthog-js';
import { POSTHOG_KEY, isPostHogConfigured } from '@/core/infrastructure/env';

/** Inicializa PostHog — llamar una sola vez, antes de que la app renderice. No-op sin key configurada o fuera de producción. */
export function initPostHog(): void {
  if (!isPostHogConfigured || !import.meta.env.PROD) return;
  posthog.init(POSTHOG_KEY, {
    api_host: 'https://us.i.posthog.com',
    person_profiles: 'identified_only',
  });
}

/**
 * Asocia los eventos siguientes al usuario autenticado real, no anónimo.
 * Llamar justo después de un login/registro exitoso, o al restaurar sesión.
 * No-op sin key configurada o fuera de producción (mismo gate que initPostHog
 * — sin eso, PostHog nunca se inicializó y no hay nada que identificar).
 */
export function identifyUser(userId: string, properties?: Record<string, unknown>): void {
  if (!isPostHogConfigured || !import.meta.env.PROD) return;
  posthog.identify(userId, properties);
}

/**
 * Limpia la identidad actual — llamar en logout para evitar mezclar sesiones
 * de distintos usuarios en el mismo navegador. No-op sin key configurada o
 * fuera de producción.
 */
export function resetIdentity(): void {
  if (!isPostHogConfigured || !import.meta.env.PROD) return;
  posthog.reset();
}
