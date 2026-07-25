import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { initSentry } from "@/core/infrastructure/sentry";
import { initPostHog } from "@/core/infrastructure/posthog";
import ErrorBoundary from "@/components/ErrorBoundary";

initSentry();
initPostHog();

// Vite emite este evento cuando falla la precarga de un chunk (ej. link de
// modulepreload) — distinto del error que atrapa ErrorBoundary (que cubre
// fallos dentro de un React.lazy() ya en render). Mismo caso raíz: deploy
// nuevo con la pestaña abierta. Un reload trae la versión actual. Mismo guard
// de sessionStorage que ErrorBoundary, para no entrar en loop si el chunk
// sigue sin poder cargar por otra razón (ej. sin internet).
window.addEventListener('vite:preloadError', () => {
  if (!sessionStorage.getItem('neggo_chunk_reload_attempted')) {
    sessionStorage.setItem('neggo_chunk_reload_attempted', '1');
    window.location.reload();
  }
});

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
