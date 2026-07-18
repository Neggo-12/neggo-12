/**
 * Infrastructure — Sentry error monitoring.
 *
 * No-op cuando VITE_SENTRY_DSN no está configurado o fuera de producción —
 * el mismo patrón que isDbConfigured, para que la app nunca dependa de que
 * Sentry esté presente para funcionar.
 */
import * as Sentry from '@sentry/react';
import { SENTRY_DSN, isSentryConfigured } from '@/core/infrastructure/env';

/** Inicializa Sentry — llamar una sola vez, antes de que la app renderice. No-op fuera de producción o sin DSN. */
export function initSentry(): void {
  if (!isSentryConfigured || !import.meta.env.PROD) return;
  Sentry.init({
    dsn: SENTRY_DSN,
    environment: import.meta.env.MODE,
  });
}

/**
 * Reporta a Sentry un error de base de datos/RLS con contexto, sin alterar el
 * mensaje legible que ya se retorna al caller. No-op cuando Sentry no está activo.
 */
export function reportDbError(message: string, rawError?: unknown): void {
  if (!isSentryConfigured || !import.meta.env.PROD) return;
  const error = rawError instanceof Error ? rawError : new Error(message);
  Sentry.captureException(error, {
    tags: { source: 'repositories' },
    extra: { message, rawError },
  });
}

/**
 * Reporta a Sentry un error no manejado capturado por el Error Boundary de
 * React (ej. un chunk lazy que falla al cargar tras un deploy nuevo mientras
 * la pestaña estaba descargada de memoria). No-op cuando Sentry no está activo.
 */
export function reportReactError(error: unknown, componentStack?: string | null): void {
  if (!isSentryConfigured || !import.meta.env.PROD) return;
  const err = error instanceof Error ? error : new Error(String(error));
  Sentry.captureException(err, {
    tags: { source: 'error-boundary' },
    extra: { componentStack },
  });
}
