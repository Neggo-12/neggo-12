import { create } from 'zustand';
import { toast } from 'sonner';
import type {
  AdminEntityType,
  AuthorizationStatus,
  OnboardingRequest,
  IFCTransaction,
  EcosistemaMetrics,
  AlgorithmEquity,
} from '@/types';
import {
  fetchUsersByStatus,
  fetchAllUsers,
  updateUserStatus,
  fetchOrganizationIdByUserId,
  updateOrganizationStatus,
  type UserRow,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';

// ───── Status mapping: DB values → UI AuthorizationStatus ─────

/**
 * The login flow inserts `status: "pending_approval"` into the `users` table.
 * The admin UI uses Spanish labels: 'pendiente', 'autorizado', 'rechazado', 'en-revision'.
 * This function bridges the two so the admin panel sees pending registrations.
 */
const DB_STATUS_TO_UI: Record<string, AuthorizationStatus> = {
  pending_approval: 'pendiente',
  approved: 'autorizado',
  rejected: 'rechazado',
  pendiente: 'pendiente',
  autorizado: 'autorizado',
  rechazado: 'rechazado',
  'en-revision': 'en-revision',
};

function mapDbStatus(raw: string | null | undefined): AuthorizationStatus {
  if (!raw) return 'pendiente';
  return DB_STATUS_TO_UI[raw] ?? 'pendiente';
}

// ───── Helpers ─────

/** Convierte un UserRow de Supabase en un OnboardingRequest para el panel admin */
function userToOnboardingRequest(user: UserRow): OnboardingRequest {
  const roleToEntityType: Record<string, AdminEntityType> = {
    Banco: 'banco',
    Constructora: 'constructora',
    Comercio: 'comercio',
    Admin: 'banco', // fallback
    Fiduciaria: 'banco',
  };

  const uiStatus = mapDbStatus(user.status);

  return {
    id: user.id,
    entityType: roleToEntityType[user.rol] ?? 'banco',
    rol: user.rol,
    name: user.nombre,
    detail: `${user.rol} — ${user.email}`,
    city: user.ciudad ?? 'Sin ciudad',
    numeroDocumento: user.numero_documento ?? undefined,
    status: uiStatus,
    submittedAt: user.created_at,
    contacto: {
      nombre: user.nombre,
      cargo: user.rol,
      correo: user.email,
      telefono: user.telefono ?? '',
      estadoDocumentos: uiStatus === 'autorizado' ? 'verificado' : 'pendiente',
    },
  };
}

// ───── Store ─────

interface AdminState {
  /** All onboarding requests from real Supabase `users` table + Zustand fallback */
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
  activeSection: 'resumen' | 'autorizaciones' | 'bancos' | 'constructoras' | 'comercios' | 'clientes' | 'analitica' | 'facturacion' | 'tarifas' | 'conciliacion' | 'senales-interes' | 'seguridad' | 'salud-sistema';
  /** organizationId de un comercio a preseleccionar al entrar a "Tarifas y Planes" — puente entre el badge de Comercios y el panel de tarifas negociadas. */
  tarifasPreseleccionComercioId: string | null;

  setActiveSection: (section: AdminState['activeSection']) => void;
  setTarifasPreseleccionComercioId: (organizationId: string | null) => void;
  /** Carga usuarios desde Supabase — re-fetch en cada montaje para datos frescos */
  hydrateOnboarding: () => Promise<void>;
  /** Forza un re-fetch completo (ignora el flag de hidratación) */
  refreshOnboarding: () => Promise<void>;
  /** Aprueba un usuario: cambia status a 'approved' en Supabase */
  authorizeEntity: (requestId: string) => Promise<void>;
  /** Rechaza un usuario: cambia status a 'rejected' en Supabase */
  rejectEntity: (requestId: string) => Promise<void>;
  issueTrustSeal: (requestId: string) => void;
  /** Fallback: añade una solicitud pendiente al store en memoria (cuando Supabase no responde) */
  addPendingRequest: (request: OnboardingRequest) => void;
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
  tarifasPreseleccionComercioId: null,

  setActiveSection: (section) => set({ activeSection: section }),
  setTarifasPreseleccionComercioId: (organizationId) => set({ tarifasPreseleccionComercioId: organizationId }),

  hydrateOnboarding: async () => {
    // Re-fetch en cada montaje para datos frescos (sin caché vieja)
    if (get().isOnboardingLoading) return;
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
    // Los Cliente (B2C) no pasan por autorización institucional — no deben
    // aparecer en la consola de Autorizaciones ni en las pestañas Bancos/
    // Constructoras/Comercios.
    const requests = users.filter((u) => u.rol !== 'Cliente').map(userToOnboardingRequest);

    // Merge with any pending requests added via fallback (addPendingRequest)
    // that haven't been persisted to Supabase yet
    const existingFallback = get().onboardingRequests.filter(
      (r) => !users.some((u) => u.id === r.id)
    );
    const mergedRequests = [...requests, ...existingFallback];

    // Compute ecosystem metrics from real data
    const clientesActivos = users.filter((u) => u.rol === 'Cliente' && u.status === 'approved').length;
    const bancosConectados = users.filter((u) => u.rol === 'Banco' && u.status === 'approved').length;
    const constructorasRegistradas = users.filter((u) => u.rol === 'Constructora' && u.status === 'approved').length;
    const comerciosSuscritos = users.filter((u) => u.rol === 'Comercio' && u.status === 'approved').length;

    set({
      onboardingRequests: mergedRequests,
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

  refreshOnboarding: async () => {
    // Forza re-fetch ignorando el flag de hidratación
    set({ isOnboardingHydrated: false });
    await get().hydrateOnboarding();
  },

  addPendingRequest: (request) => {
    // Evita duplicados por ID
    const exists = get().onboardingRequests.some((r) => r.id === request.id);
    if (exists) return;
    set((s) => ({
      onboardingRequests: [request, ...s.onboardingRequests],
    }));
  },

  authorizeEntity: async (requestId) => {
    const { error } = await updateUserStatus(requestId, 'approved');
    if (error) {
      toast.error('Error al aprobar entidad', { description: error });
      return;
    }

    // Activa también la organización vinculada (si el usuario maestro pertenece a una).
    const { data: organizationId, error: orgLookupError } = await fetchOrganizationIdByUserId(requestId);
    if (orgLookupError) {
      toast.error('Usuario aprobado, pero no se pudo verificar su organización', { description: orgLookupError });
    } else if (organizationId) {
      const { error: orgError } = await updateOrganizationStatus(organizationId, 'approved');
      if (orgError) {
        toast.error('Usuario aprobado, pero falló activar la organización', { description: orgError });
      }
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

    // Rechaza también la organización vinculada (si el usuario maestro pertenece a una).
    const { data: organizationId, error: orgLookupError } = await fetchOrganizationIdByUserId(requestId);
    if (orgLookupError) {
      toast.error('Usuario rechazado, pero no se pudo verificar su organización', { description: orgLookupError });
    } else if (organizationId) {
      const { error: orgError } = await updateOrganizationStatus(organizationId, 'rejected');
      if (orgError) {
        toast.error('Usuario rechazado, pero falló actualizar la organización', { description: orgError });
      }
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
}));
