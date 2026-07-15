/**
 * Infrastructure — registro centralizado de fallos de escrituras críticas.
 *
 * Complementa a Sentry (externo, no visible in-app): esta tabla es la que el
 * Admin revisa dentro de Neggo mismo ("Salud del Sistema"). Solo instrumenta
 * escrituras críticas (RPCs de dinero/registro, INSERTs de solicitudes) —
 * nunca lecturas.
 */
import { supabase } from '@/core/db/dbClient';

/**
 * Fire-and-forget: nunca se espera (no bloquea el flujo que falló) y nunca
 * lanza — si el log mismo falla, silencio total. No puede empeorar el error
 * original que se está reportando.
 */
export function logFalloApp(contexto: string, mensaje: string, detalle?: unknown): void {
  if (!supabase) return;
  try {
    void supabase
      .from('fallos_app')
      .insert({
        contexto,
        mensaje,
        detalle: detalle !== undefined ? (detalle as never) : null,
        url_path: typeof window !== 'undefined' ? window.location.pathname : null,
      })
      .then(
        () => {},
        () => {},
      );
  } catch {
    // Silencio total — el logging de fallos nunca debe generar un fallo nuevo.
  }
}
