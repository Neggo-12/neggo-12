import { Component, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logFalloApp } from '@/core/infrastructure/fallosApp';
import { reportReactError } from '@/core/infrastructure/sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  isRecoveringFromDeploy: boolean;
}

/**
 * Un chunk de React.lazy que falla al cargar casi siempre es porque hubo un
 * deploy nuevo mientras la pestaña estaba abierta — los archivos cambian de
 * nombre (hash) en cada build, así que el que el navegador tiene en memoria
 * ya no existe en el servidor. Era el 13/23 de los fallos reales registrados
 * en fallos_app (25 jul 2026) — no es un bug de lógica, es ruido esperado de
 * cada deploy que se puede resolver solo con un reload.
 */
const CHUNK_LOAD_ERROR_PATTERN = /Failed to fetch dynamically imported module|error loading dynamically imported module|Importing a module script failed/i;
const CHUNK_RELOAD_FLAG_KEY = 'neggo_chunk_reload_attempted';

/**
 * Red de seguridad de último recurso — sin esto, cualquier error no
 * manejado en el árbol de React (ej. un chunk de React.lazy que falla al
 * cargar porque hubo un deploy nuevo mientras el navegador tenía la pestaña
 * descargada de memoria) desmonta toda la app y deja la pantalla en blanco,
 * sin ningún aviso. Nunca silenciosa: registra en fallos_app y Sentry antes
 * de mostrar la pantalla de recuperación.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, isRecoveringFromDeploy: false };

  static getDerivedStateFromError(): Partial<ErrorBoundaryState> {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    const message = error instanceof Error ? error.message : 'Error desconocido no manejado';
    logFalloApp('error_boundary', message, error);
    reportReactError(error, info.componentStack);

    // Auto-recuperación: un solo reload alcanza para traer la versión nueva.
    // Guardado en sessionStorage para no entrar en loop si el error persiste
    // por otra razón (ej. sin internet) — ahí sí se muestra la pantalla normal
    // con el botón manual, en vez de recargar en bucle.
    if (CHUNK_LOAD_ERROR_PATTERN.test(message) && !sessionStorage.getItem(CHUNK_RELOAD_FLAG_KEY)) {
      sessionStorage.setItem(CHUNK_RELOAD_FLAG_KEY, '1');
      this.setState({ isRecoveringFromDeploy: true });
      window.location.reload();
    }
  }

  render() {
    if (this.state.isRecoveringFromDeploy) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <RefreshCw className="h-7 w-7 text-muted-foreground animate-spin" />
          <p className="max-w-sm text-sm text-muted-foreground">Actualizando a la última versión…</p>
        </div>
      );
    }
    if (this.state.hasError) {
      return (
        <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background p-6 text-center">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-red-500/10 border border-red-500/20">
            <AlertTriangle className="h-7 w-7 text-red-400" />
          </div>
          <h1 className="text-lg font-semibold text-foreground">Algo salió mal</h1>
          <p className="max-w-sm text-sm text-muted-foreground">
            Ocurrió un error inesperado. Recarga la página para continuar.
          </p>
          <Button onClick={() => window.location.reload()}>Recargar</Button>
        </div>
      );
    }
    return this.props.children;
  }
}
