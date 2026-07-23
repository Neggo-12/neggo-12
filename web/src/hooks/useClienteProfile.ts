import { useEffect, useState } from 'react';
import { useAuthStore } from '@/store/useAuthStore';
import { fetchClientePerfil } from '@/core/db/repositories';

export type ClienteProfileStatus = 'loading' | 'ready' | 'error';

export interface ClienteProfile {
  name: string | null;
  /** Ciudad real (users.ciudad) — null en cuentas antiguas sin ese campo poblado. */
  ciudad: string | null;
  /** Score real (users.score_estimado) — null en cuentas antiguas sin ese campo poblado. */
  scoreEstimado: number | null;
  /** Teléfono real (users.telefono) — null en cuentas antiguas sin ese campo poblado. */
  telefono: string | null;
  status: ClienteProfileStatus;
}

/**
 * Resolves the real profile for the active client session from `users`
 * (first_name/nombre, ciudad, score_estimado) — nunca de un fixture. Fails
 * visibly: `status` es 'error' cuando no se puede resolver, así que los
 * callers no deben inventar un nombre/ciudad/score de reemplazo. `ciudad`/
 * `scoreEstimado` en null (con status 'ready') significa cuenta antigua sin
 * esos campos poblados — tratar distinto de 'error' (sesión no resuelta).
 */
export function useClienteProfile(): ClienteProfile {
  const session = useAuthStore((s) => s.session);
  const [name, setName] = useState<string | null>(null);
  const [ciudad, setCiudad] = useState<string | null>(null);
  const [scoreEstimado, setScoreEstimado] = useState<number | null>(null);
  const [telefono, setTelefono] = useState<string | null>(null);
  const [status, setStatus] = useState<ClienteProfileStatus>('loading');

  useEffect(() => {
    if (!session?.userId) {
      setStatus('error');
      return;
    }
    let cancelled = false;
    setStatus('loading');
    fetchClientePerfil(session.userId).then(({ data, error }) => {
      if (cancelled) return;
      if (data && !error) {
        setName(data.firstName || data.nombre);
        setCiudad(data.ciudad);
        setScoreEstimado(data.scoreEstimado);
        setTelefono(data.telefono);
        setStatus('ready');
      } else {
        setName(null);
        setCiudad(null);
        setScoreEstimado(null);
        setTelefono(null);
        setStatus('error');
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session?.userId]);

  return { name, ciudad, scoreEstimado, telefono, status };
}
