import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { useAuthStore } from "@/store/useAuthStore";
import LandingHub from "./pages/LandingHub";
import LandingBancos from "./pages/LandingBancos";
import LandingConstructoras from "./pages/LandingConstructoras";
import LandingClientes from "./pages/LandingClientes";
import HomePage from "./pages/Home";
import BankDashboard from "./pages/BankDashboard";
import ConstructorasDashboard from "./pages/ConstructorasDashboard";
import ClientPortal from "./pages/ClientPortal";
import ComerciosDashboard from "./pages/ComerciosDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import RegisterCliente from "./pages/RegisterCliente";
import LoginEcosistema from "./pages/LoginEcosistema";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

function SessionRestoreGate({ children }: { children: React.ReactNode }) {
  const restoreSession = useAuthStore((s) => s.restoreSession);

  useEffect(() => {
    // Restore any persisted Supabase Auth session on app load
    void restoreSession();
  }, [restoreSession]);

  return <>{children}</>;
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <SessionRestoreGate>
        <BrowserRouter>
          <Routes>
            {/* Landing pages — no sidebar, full-width marketing */}
            <Route path="/" element={<LandingHub />} />
            <Route path="/landing/bancos" element={<LandingBancos />} />
            <Route path="/landing/constructoras" element={<LandingConstructoras />} />
            <Route path="/landing/clientes" element={<LandingClientes />} />

            {/* Workspaces — each self-contained with its own sidebar */}
            <Route path="/app" element={<HomePage />} />
            <Route path="/banca" element={<BankDashboard />} />
            <Route path="/constructoras" element={<ConstructorasDashboard />} />
            <Route path="/portal" element={<ClientPortal />} />
            <Route path="/comercios" element={<ComerciosDashboard />} />
            <Route path="/admin" element={<AdminDashboard />} />

            {/* Auth / Login */}
            <Route path="/auth/register" element={<RegisterCliente />} />
            <Route path="/login-ecosistema" element={<LoginEcosistema />} />

            {/* 404 */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </SessionRestoreGate>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
