import { create } from 'zustand';
import { toast } from 'sonner';
import type {
  AdminEntityType,
  AuthorizationStatus,
  OnboardingRequest,
  IFCTransaction,
  EcosistemaMetrics,
  AlgorithmEquity,
  FacturaLedger,
} from '@/types';
import {
  fetchFacturasLedger,
  fetchUsersByStatus,
  fetchAllUsers,
  updateUserStatus,
  type UserRow,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';

// ───── Helpers ─────

/** Convierte un UserRow de Supabase en un OnboardingRequest para el panel admin */
function userToOnboardingRequest(user: UserRow): OnboardingRequest {
  const roleToEntityType: Record<string, AdminEntityType> = {
    Banco: 'banco',
    Constructora: 'constructora',
    Comercio: 'comercio',
    Admin: 'banco', // fallback
    Cliente: 'banco', // fallback
    Fiduciaria: 'banco',
  };

  return {
    id: user.id,
    entityType: roleToEntityType[user.rol] ?? 'banco',
    name: user.nombre,
    detail: `${user.rol} — ${user.email}`,
    city: user.ciudad ?? 'Sin ciudad',
    status: (user.status as AuthorizationStatus) ?? 'pendiente',
    submittedAt: user.created_at,
    contacto: {
      nombre: user.nombre,
      cargo: user.rol,
      correo: user.email,
      telefono: user.telefono ?? '',
      estadoDocumentos: user.status === 'approved' ? 'verificado' : 'pendiente',
    },
  };
}

// ───── Store ─────

interface AdminState {
  /** All onboarding requests from real Supabase `users` table */
  onboardingRequests: OnboardingRequest[];
  /** Whether the onboarding data is still loading */
  isOnboardingLoading: boolean;
  /** Whether the initial hydration attempt has completed */
  isOnboardingHydrated: boolean;
  /** Consolidated ecosystem metrics (derived from real data) */
  ecosistemaMetrics: EcosistemaMetrics;
  /** IFC transactions for algorithm audit */
  ifcTransactions: IFCTransaction[];
  /** Current algorithm equity distribution */
  algorithmEquity: AlgorithmEquity;
  /** Active admin sidebar section */
  activeSection: 'resumen' | 'autorizaciones' | 'bancos' | 'constructoras' | 'comercios' | 'analitica' | 'facturacion';
  /** Ledger de cobros CPL + Success Fee (hidratado desde la base de datos real) */
  facturas: FacturaLedger[];
  /** true después del primer intento de hidratación del ledger */
  isFacturasHydrated: boolean;

  setActiveSection: (section: AdminState['activeSection']) => void;
  /** Carga usuarios desde Supabase — solo los pendientes de aprobación + todos para vista general */
  hydrateOnboarding: () => Promise<void>;
  /** Aprueba un usuario: cambia status a 'approved' en Supabase */
  authorizeEntity: (requestId: string) => Promise<void>;
  /** Rechaza un usuario: cambia status a 'rejected' en Supabase */
  rejectEntity: (requestId: string) => Promise<void>;
  issueTrustSeal: (requestId: string) => void;
  /** Carga el ledger de facturación desde la tabla `facturas_ledger` */
  hydrateFacturas: () => Promise<void>;
}

const EMPTY_METRICS: EcosistemaMetrics = {
  clientesActivos: 0,
  bancosConectados: 0,
  constructorasRegistradas: 0,
  comerciosSuscritos: 0,
  ifcGeneradas: 0,
  propuestasEnviadas: 0,
  tasaMatch: 0,
  deltaClientes: 0,
  deltaBancos: 0,
  deltaConstructoras: 0,
  deltaComercios: 0,
};

const EMPTY_ALGORITHM: AlgorithmEquity = {
  calidad: 40,
  respuesta: 30,
  rotacion: 20,
  sorteo: 10,
};

export const useAdminStore = create<AdminState>((set, get) => ({
  onboardingRequests: [],
  isOnboardingLoading: false,
  isOnboardingHydrated: false,
  ecosistemaMetrics: EMPTY_METRICS,
  ifcTransactions: [],
  algorithmEquity: EMPTY_ALGORITHM,
  activeSection: 'resumen',
  facturas: [],
  isFacturasHydrated: false,

  setActiveSection: (section) => set({ activeSection: section }),

  hydrateOnboarding: async () => {
    if (get().isOnboardingHydrated || get().isOnboardingLoading) return;
    if (!isDbConfigured) {
      set({ isOnboardingLoading: false, isOnboardingHydrated: true });
      return;
    }
    set({ isOnboardingLoading: true });

    // Fetch all users to build the full picture
    const { data: allUsers, error } = await fetchAllUsers();
    if (error) {
      set({ isOnboardingLoading: false, isOnboardingHydrated: true });
      toast.error('Error al cargar usuarios del ecosistema', { description: error });
      return;
    }

    const users = allUsers ?? [];
    const requests = users.map(userToOnboardingRequest);

    // Compute ecosystem metrics from real data
    const clientesActivos = users.filter((u) => u.rol === 'Cliente' && u.status === 'approved').length;
    const bancosConectados = users.filter((u) => u.rol === 'Banco' && u.status === 'approved').length;
    const constructorasRegistradas = users.filter((u) => u.rol === 'Constructora' && u.status === 'approved').length;
    const comerciosSuscritos = users.filter((u) => u.rol === 'Comercio' && u.status === 'approved').length;

    set({
      onboardingRequests: requests,
      isOnboardingLoading: false,
      isOnboardingHydrated: true,
      ecosistemaMetrics: {
        ...EMPTY_METRICS,
        clientesActivos,
        bancosConectados,
        constructorasRegistradas,
        comerciosSuscritos,
      },
    });
  },

  authorizeEntity: async (requestId) => {
    const { error } = await updateUserStatus(requestId, 'approved');
    if (error) {
      toast.error('Error al aprobar entidad', { description: error });
      return;
    }
    // Actualizar estado local
    set((s) => ({
      onboardingRequests: s.onboardingRequests.map((r) =>
        r.id === requestId
          ? { ...r, status: 'autorizado' as AuthorizationStatus, reviewedAt: new Date().toISOString(), reviewedBy: 'Admin Principal' }
          : r
      ),
    }));
    toast.success('Entidad aprobada', { description: 'El usuario ya puede acceder al ecosistema Neggo.' });
  },

  rejectEntity: async (requestId) => {
    const { error } = await updateUserStatus(requestId, 'rejected');
    if (error) {
      toast.error('Error al rechazar entidad', { description: error });
      return;
    }
    set((s) => ({
      onboardingRequests: s.onboardingRequests.map((r) =>
        r.id === requestId
          ? { ...r, status: 'rechazado' as AuthorizationStatus, reviewedAt: new Date().toISOString(), reviewedBy: 'Admin Principal' }
          : r
      ),
    }));
    toast.error('Entidad rechazada');
  },

  issueTrustSeal: (requestId) =>
    set((s) => ({
      onboardingRequests: s.onboardingRequests.map((r) =>
        r.id === requestId
          ? { ...r, status: 'autorizado' as AuthorizationStatus, reviewedAt: new Date().toISOString(), reviewedBy: 'Admin Principal' }
          : r
      ),
    })),

  hydrateFacturas: async () => {
    if (get().isFacturasHydrated) return;
    set({ isFacturasHydrated: true });
    const { data } = await fetchFacturasLedger();
    if (data && data.length > 0) {
      set({ facturas: data });
    } else {
      // Sin datos en la BD: ledger vacío
      set({ facturas: [] });
    }
  },
}));
