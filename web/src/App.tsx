import { useEffect, useState, useCallback } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Button } from "@/components/ui/button";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Link, useLocation } from "react-router-dom";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { supabase } from "@/core/db/dbClient";
import { checkAceptacionPolitica, insertAceptacionPolitica } from "@/core/db/repositories";
import { POLITICA_VERSION, POLITICA_RUTA } from "@/core/domain/legal/politica";
import { logFalloApp } from "@/core/infrastructure/fallosApp";
import { shouldReactToForeignAuthChange } from "@/core/domain/auth/authChangeRule";
import LandingHub from "./pages/LandingHub";
import LandingBancos from "./pages/LandingBancos";
import LandingConstructoras from "./pages/LandingConstructoras";
import LandingClientes from "./pages/LandingClientes";
import CorporativoComercios from "./pages/CorporativoComercios";
import BankDashboard from "./pages/BankDashboard";
import ConstructorasDashboard from "./pages/ConstructorasDashboard";
import ClientPortal from "./pages/ClientPortal";
import ComerciosDashboard from "./pages/ComerciosDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import AdminSignup from "./pages/AdminSignup";
import LoginEcosistema from "./pages/LoginEcosistema";
import NotFound from "./pages/NotFound";
import PoliticaDatos from "./pages/PoliticaDatos";
import RequireAdmin from "@/components/RequireAdmin";
import RequireRole from "@/components/RequireRole";

const queryClient = new QueryClient();

function SessionRestoreGate({ children }: { children: React.ReactNode }) {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    // Restore any persisted Supabase Auth session on app load
    void restoreSession();
  }, [restoreSession]);

  // Supabase Auth shares ONE session per browser via localStorage — logging
  // into a different account in another tab silently swaps the JWT under
  // every open tab (supabase-js syncs across tabs via storage events). This
  // listener is the app's only defense: if the real authenticated user ever
  // differs from what this tab's store believes, never keep operating with a
  // stale identity — force an honest, clean reload back to login instead.
  //
  // Comparison rule (no "is this my own login" flag needed):
  //   - storeUserId is null whenever this tab hasn't established (or has
  //     cleared) its own identity — a fresh SIGNED_IN here is a normal login,
  //     never a mismatch, regardless of event timing.
  //   - TOKEN_REFRESHED never changes the user id, so it never matches either.
  //   - A SIGNED_OUT while storeUserId is still non-null means someone
  //     (this tab or another) really signed out — logout() in useAuthStore
  //     clears the store BEFORE calling signOut() precisely so a normal
  //     logout never trips this.
  useEffect(() => {
    if (!supabase) return;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, newSession) => {
      const storeUserId = useAuthStore.getState().session?.userId ?? null;
      const eventUserId = newSession?.user?.id ?? null;

      if (!shouldReactToForeignAuthChange(event, storeUserId, eventUserId)) return;

      useAuthStore.setState({ session: null });
      toast.error('Tu sesión cambió', {
        description: 'Se inició sesión con otra cuenta en este navegador. Vuelve a iniciar sesión.',
      });
      setTimeout(() => {
        window.location.href = '/login-ecosistema';
      }, 2000);
    });

    return () => subscription.unsubscribe();
  }, []);

  return <>{children}</>;
}

/**
 * Garantía real de prueba de aceptación (Ley 1581 de 2012) — el registro
 * (registerB2C/registerB2B) es "mejor esfuerzo" porque puede correr sin sesión
 * si el correo requiere confirmación. Esta verificación corre siempre con JWT
 * válido, así que también cubre usuarios que se registraron antes de que
 * existiera esta política. Bloquea la app con un aviso hasta que acepte.
 */
function PoliticaAcceptanceGate({ children }: { children: React.ReactNode }) {
  const session = useAuthStore((s) => s.session);
  const location = useLocation();
  const [needsAcceptance, setNeedsAcceptance] = useState(false);
  const [isChecking, setIsChecking] = useState(false);
  const [isAccepting, setIsAccepting] = useState(false);

  useEffect(() => {
    if (!session?.userId) {
      setNeedsAcceptance(false);
      return;
    }
    setIsChecking(true);
    void checkAceptacionPolitica(session.userId, POLITICA_VERSION).then(({ aceptada }) => {
      setNeedsAcceptance(!aceptada);
      setIsChecking(false);
    });
  }, [session?.userId]);

  const handleAceptar = useCallback(async () => {
    if (!session?.userId) return;
    setIsAccepting(true);
    const { error } = await insertAceptacionPolitica(session.userId, POLITICA_VERSION);
    setIsAccepting(false);
    if (error) {
      logFalloApp('aceptar_politica', error);
      toast.error("No se pudo registrar tu aceptación", { description: error });
      return;
    }
    setNeedsAcceptance(false);
  }, [session?.userId]);

  // Escape de emergencia — si este gate llega a atraparse en cualquier estado
  // roto futuro (ej. una fila de users inconsistente), el usuario nunca debe
  // quedar sin salida: puede cerrar sesión y volver a intentar desde cero.
  const handleCerrarSesion = useCallback(async () => {
    await useAuthStore.getState().logout();
    window.location.href = "/login-ecosistema";
  }, []);

  const showGate = !isChecking && needsAcceptance && location.pathname !== POLITICA_RUTA;

  return (
    <>
      {children}
      {showGate && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
          <div className="w-full max-w-md space-y-4 rounded-2xl border border-border/60 bg-card p-6">
            <h2 className="text-base font-semibold text-foreground">
              Actualizamos nuestra Política de Tratamiento de Datos
            </h2>
            <p className="text-sm text-muted-foreground">
              Para continuar usando Neggo necesitamos que aceptes nuestra{" "}
              <Link to={POLITICA_RUTA} target="_blank" className="underline text-foreground hover:text-primary">
                Política de Tratamiento de Datos Personales
              </Link>
              , conforme a la Ley 1581 de 2012.
            </p>
            <Button onClick={handleAceptar} disabled={isAccepting} className="w-full">
              {isAccepting ? "Guardando..." : "Acepto y continúo"}
            </Button>
            <Button
              onClick={handleCerrarSesion}
              variant="ghost"
              className="w-full text-muted-foreground hover:text-foreground"
            >
              Cerrar sesión
            </Button>
          </div>
        </div>
      )}
    </>
  );
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SessionRestoreGate>
        <BrowserRouter>
          <PoliticaAcceptanceGate>
          <Routes>
            {/* Documento público — Política de Tratamiento de Datos Personales */}
            <Route path="/politica-de-datos" element={<PoliticaDatos />} />

            {/* Landing pages — no sidebar, full-width marketing */}
            <Route path="/" element={<LandingHub />} />
            <Route path="/landing/bancos" element={<LandingBancos />} />
            <Route path="/landing/constructoras" element={<LandingConstructoras />} />
            <Route path="/landing/clientes" element={<LandingClientes />} />

            {/* Sector fijo con auth embebida — Comercios (público, previo a login) */}
            <Route path="/corporativo/comercios" element={<CorporativoComercios />} />

            {/* Workspaces — each self-contained with its own sidebar */}
            <Route
              path="/banca"
              element={
                <RequireRole allowedRoles={["Banco"]}>
                  <BankDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/constructoras"
              element={
                <RequireRole allowedRoles={["Constructora"]}>
                  <ConstructorasDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/portal"
              element={
                <RequireRole allowedRoles={["Cliente"]}>
                  <ClientPortal />
                </RequireRole>
              }
            />
            <Route
              path="/comercios"
              element={
                <RequireRole allowedRoles={["Comercio"]}>
                  <ComerciosDashboard />
                </RequireRole>
              }
            />
            <Route
              path="/admin"
              element={
                <RequireAdmin>
                  <AdminDashboard />
                </RequireAdmin>
              }
            />

            {/* Auth / Login */}
            <Route path="/login-ecosistema" element={<LoginEcosistema />} />

            {/* Unlinked — reachable only by typing the URL. Creates the base
                account for the master admin; never grants the Admin role. */}
            <Route path="/admin-signup" element={<AdminSignup />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
          </PoliticaAcceptanceGate>
        </BrowserRouter>
      </SessionRestoreGate>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
