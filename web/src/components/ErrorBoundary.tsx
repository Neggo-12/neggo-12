import { Component, type ReactNode } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { logFalloApp } from '@/core/infrastructure/fallosApp';
import { reportReactError } from '@/core/infrastructure/sentry';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
}

/**
 * Red de seguridad de último recurso — sin esto, cualquier error no
 * manejado en el árbol de React (ej. un chunk de React.lazy que falla al
 * cargar porque hubo un deploy nuevo mientras el navegador tenía la pestaña
 * descargada de memoria) desmonta toda la app y deja la pantalla en blanco,
 * sin ningún aviso. Nunca silenciosa: registra en fallos_app y Sentry antes
 * de mostrar la pantalla de recuperación.
 */
export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false };

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  componentDidCatch(error: unknown, info: { componentStack?: string | null }) {
    const message = error instanceof Error ? error.message : 'Error desconocido no manejado';
    logFalloApp('error_boundary', message, error);
    reportReactError(error, info.componentStack);
  }

  render() {
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
