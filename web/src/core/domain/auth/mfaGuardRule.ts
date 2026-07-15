/**
 * Regla pura que decide si un guard de ruta (RequireAdmin/RequireRole) debe
 * denegar acceso por MFA, dado el assurance level real de la sesión.
 *
 * Solo deniega cuando el usuario YA tiene un factor TOTP verificado
 * (nextLevel === 'aal2') pero no ha completado el challenge en esta sesión
 * (currentLevel === 'aal1'). Si nextLevel === 'aal1' (sin factor inscrito
 * todavía), el rol basta — la inscripción es opcional en esta fase por
 * diseño, y exigir aal2 incondicionalmente crearía un huevo-y-gallina: nadie
 * sin factor podría llegar nunca a "Seguridad" para inscribirse.
 *
 * Misma regla que ya usa login() en authService.ts para decidir si exige el
 * challenge — extraída aquí para poder testearla sin red ni React.
 */
export function shouldDenyForMfa(currentLevel: string | null, nextLevel: string | null): boolean {
  return nextLevel === 'aal2' && currentLevel === 'aal1';
}
