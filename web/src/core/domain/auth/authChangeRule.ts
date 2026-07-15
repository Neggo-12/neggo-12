/**
 * Regla pura que decide si un evento de supabase.auth.onAuthStateChange
 * representa un cambio de identidad AJENO a esta pestaña (cross-tab, vía el
 * localStorage compartido de Supabase Auth) que debe forzar un logout
 * honesto — o si es parte del flujo normal de esta misma pestaña (login
 * propio, refresh de token, logout propio) que no debe reaccionar.
 *
 * Extraída de App.tsx (SessionRestoreGate) únicamente para poder testearla
 * sin levantar React/Router — el comportamiento es idéntico al original.
 */
export function shouldReactToForeignAuthChange(
  event: string,
  storeUserId: string | null,
  eventUserId: string | null,
): boolean {
  const isForeignSignOut = event === 'SIGNED_OUT' && storeUserId !== null;
  const isForeignIdentitySwap =
    event !== 'SIGNED_OUT' && storeUserId !== null && eventUserId !== null && storeUserId !== eventUserId;
  return isForeignSignOut || isForeignIdentitySwap;
}
