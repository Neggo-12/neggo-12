import { create } from 'zustand';
import { toast } from 'sonner';
import { insertOfertaComercio, fetchOrganizationMetadata, updateOrganizationMetadata, fetchOrganizationTrustSeal, updateOrganizationTrustSeal, updateOrganizationCiudad, fetchOrganizationCore } from '@/core/db/repositories';
import type { Json } from '@/integrations/supabase/types';
import { useAuthStore } from '@/store/useAuthStore';
import type {
  Comercio,
  ComercioCategory,
  SubscriptionTier,
  OportunidadIFC,
  PropuestaComercio,
} from '@/types';

interface ComercioOnboardingMetadata {
  categoria: ComercioCategory;
  especialidades: string[];
  plan: SubscriptionTier;
  onboardingComplete: true;
}

/** Resolves the real organization id for the logged-in comercio from the session. */
function getComercioOrganizationId(): string | null {
  return useAuthStore.getState().session?.organizationId ?? null;
}

// ───── Mock commerce data ─────

const DEFAULT_COMERCIO: Comercio = {
  id: '', // se sincroniza con el userId real de la sesión desde ComerciosDashboard al montar
  nombre: '',
  nit: '',
  ciudad: '',
  categoria: 'Carro' as ComercioCategory,
  especialidades: [] as string[],
  plan: 'basico' as SubscriptionTier,
  hasTrustSeal: false,
  fechaRegistro: '',
  oportunidadesRecibidas: 0,
  propuestasEnviadas: 0,
  tasaConversion: 0,
};

// ───── Mock IFC opportunities ─────

const MOCK_OPORTUNIDADES: OportunidadIFC[] = [
  {
    id: 'OP-001',
    clienteId: 'L-1818',
    categoria: 'Carro',
    ciudad: 'Medellín',
    presupuesto: 35000000,
    capacidadAhorro: 68,
    probabilidadCierre: 91,
    compraEstimadaDias: 64,
    propuestaEnviada: false,
    subcategoria: 'Hibrido',
  },
  {
    id: 'OP-002',
    clienteId: 'L-2103',
    categoria: 'Carro',
    ciudad: 'Medellín',
    presupuesto: 22000000,
    capacidadAhorro: 45,
    probabilidadCierre: 78,
    compraEstimadaDias: 120,
    propuestaEnviada: false,
    subcategoria: 'Electrico',
  },
  {
    id: 'OP-003',
    clienteId: 'L-3456',
    categoria: 'Carro',
    ciudad: 'Bogotá',
    presupuesto: 48000000,
    capacidadAhorro: 82,
    probabilidadCierre: 95,
    compraEstimadaDias: 30,
    propuestaEnviada: false,
    subcategoria: 'Gasolina',
  },
  {
    id: 'OP-004',
    clienteId: 'L-4721',
    categoria: 'Viaje',
    ciudad: 'Medellín',
    presupuesto: 8000000,
    capacidadAhorro: 55,
    probabilidadCierre: 72,
    compraEstimadaDias: 90,
    propuestaEnviada: false,
    subcategoria: 'Internacional',
    metadataAdicional: { personas: 3 },
  },
  {
    id: 'OP-005',
    clienteId: 'L-5892',
    categoria: 'Vivienda',
    ciudad: 'Bogotá',
    presupuesto: 120000000,
    capacidadAhorro: 40,
    probabilidadCierre: 88,
    compraEstimadaDias: 180,
    propuestaEnviada: false,
    subcategoria: 'Apartamento',
  },
];

// ───── Store ─────

interface ComercioState {
  /** Commerce currently logged in */
  currentComercio: Comercio;
  /** Whether the Sello de Confianza Neggo has been issued */
  hasTrustSeal: boolean;
  /** Whether the onboarding is complete */
  isOnboardingComplete: boolean;
  /** True while checking the real onboarding status from `organizations.metadata` */
  isOnboardingChecking: boolean;
  /** True once the DB check has run at least once this session */
  isOnboardingHydrated: boolean;
  /** IFC opportunities matching the commerce category + city */
  oportunidades: OportunidadIFC[];
  /** Proposals sent by this commerce */
  propuestas: PropuestaComercio[];
  /** Currently selected opportunity for proposal dialog */
  selectedOpportunityId: string | null;
  /** Whether the proposal dialog is open */
  isPropuestaDialogOpen: boolean;

  setComercio: (data: Partial<Comercio>) => void;
  /** Reads `organizations.metadata` and hydrates onboarding status from the real DB record. */
  hydrateOnboardingStatus: () => Promise<void>;
  /** Persists onboarding completion to `organizations.metadata`. Returns false (and toasts an error) if the write fails. */
  completeOnboarding: () => Promise<boolean>;
  /** Cambia el plan de suscripción — reconstruye el metadata completo para no pisar categoria/especialidades. */
  updatePlan: (plan: SubscriptionTier) => Promise<boolean>;
  activateTrustSeal: () => void;
  sendPropuesta: (propuesta: Omit<PropuestaComercio, 'id' | 'enviada' | 'fechaEnvio' | 'descripcionDetallada' | 'terminosCondiciones' | 'ganchoComercial'> & { descripcionDetallada?: string; terminosCondiciones?: string; ganchoComercial?: string }) => void;
  markPropuestaEnviada: (oportunidadId: string) => void;
  setSelectedOpportunity: (id: string | null) => void;
  setPropuestaDialogOpen: (open: boolean) => void;
}

export const useComercioStore = create<ComercioState>((set, get) => ({
  currentComercio: DEFAULT_COMERCIO,
  hasTrustSeal: false,
  isOnboardingComplete: false,
  isOnboardingChecking: false,
  isOnboardingHydrated: false,
  oportunidades: [],
  propuestas: [],
  selectedOpportunityId: null,
  isPropuestaDialogOpen: false,

  setComercio: (data) =>
    set((s) => ({ currentComercio: { ...s.currentComercio, ...data } })),

  hydrateOnboardingStatus: async () => {
    if (get().isOnboardingHydrated || get().isOnboardingChecking) return;
    const organizationId = getComercioOrganizationId();
    if (!organizationId) {
      // No se pudo resolver la organización — fail-safe: se muestra el onboarding.
      set({ isOnboardingChecking: false, isOnboardingHydrated: true });
      return;
    }
    set({ isOnboardingChecking: true });
    const [{ data, error }, trustSealRes, coreRes] = await Promise.all([
      fetchOrganizationMetadata(organizationId),
      fetchOrganizationTrustSeal(organizationId),
      fetchOrganizationCore(organizationId),
    ]);
    if (error || !data) {
      set({ isOnboardingChecking: false, isOnboardingHydrated: true });
      return;
    }
    const metadata = data as Partial<ComercioOnboardingMetadata>;
    if (metadata.onboardingComplete === true) {
      set((s) => ({
        isOnboardingComplete: true,
        hasTrustSeal: trustSealRes.data ?? true,
        isOnboardingChecking: false,
        isOnboardingHydrated: true,
        currentComercio: {
          ...s.currentComercio,
          nombre: coreRes.data?.name ?? s.currentComercio.nombre,
          nit: coreRes.data?.nit ?? s.currentComercio.nit,
          ciudad: coreRes.data?.ciudad ?? s.currentComercio.ciudad,
          categoria: metadata.categoria ?? s.currentComercio.categoria,
          especialidades: metadata.especialidades ?? s.currentComercio.especialidades,
          plan: metadata.plan ?? s.currentComercio.plan,
        },
      }));
    } else {
      set({ isOnboardingChecking: false, isOnboardingHydrated: true });
    }
  },

  completeOnboarding: async () => {
    const comercio = get().currentComercio;
    const organizationId = getComercioOrganizationId();
    if (!organizationId) {
      toast.error('No se pudo guardar tu registro', {
        description: 'No se pudo identificar tu organización. Vuelve a iniciar sesión e intenta de nuevo.',
      });
      return false;
    }
    const metadata: ComercioOnboardingMetadata = {
      categoria: comercio.categoria,
      especialidades: comercio.especialidades ?? [],
      plan: comercio.plan,
      onboardingComplete: true,
    };
    const [metadataResult, trustSealResult, ciudadResult] = await Promise.all([
      updateOrganizationMetadata(organizationId, metadata as unknown as Json),
      updateOrganizationTrustSeal(organizationId, true),
      updateOrganizationCiudad(organizationId, comercio.ciudad),
    ]);
    if (metadataResult.error || trustSealResult.error || ciudadResult.error) {
      const error = metadataResult.error ?? trustSealResult.error ?? ciudadResult.error!;
      toast.error('No se pudo guardar tu registro', {
        description: `Tu información no se guardó en el servidor: ${error}`,
      });
      return false;
    }
    set({ isOnboardingComplete: true, hasTrustSeal: true });
    return true;
  },

  updatePlan: async (plan) => {
    const organizationId = getComercioOrganizationId();
    if (!organizationId) {
      toast.error('No se pudo identificar tu organización', { description: 'Vuelve a iniciar sesión e intenta de nuevo.' });
      return false;
    }
    const comercio = get().currentComercio;
    // Reconstruye el objeto metadata COMPLETO — updateOrganizationMetadata sobrescribe
    // el blob entero, no lo mezcla, así que enviar solo { plan } borraría categoria/especialidades.
    const metadata: ComercioOnboardingMetadata = {
      categoria: comercio.categoria,
      especialidades: comercio.especialidades ?? [],
      plan,
      onboardingComplete: true,
    };
    const { error } = await updateOrganizationMetadata(organizationId, metadata as unknown as Json);
    if (error) {
      toast.error('No se pudo cambiar el plan', { description: error });
      return false;
    }
    set((s) => ({ currentComercio: { ...s.currentComercio, plan } }));
    toast.success('Plan actualizado', {
      description: `Tu suscripción ahora es ${plan === 'premium' ? 'Premium' : 'Básico'}.`,
    });
    return true;
  },

  activateTrustSeal: () => set({ hasTrustSeal: true }),

  sendPropuesta: (propuesta) => {
    const id = `PROP-${Date.now()}`;
    const nueva: PropuestaComercio = {
      ...propuesta,
      id,
      descripcionDetallada: propuesta.descripcionDetallada ?? '',
      terminosCondiciones: propuesta.terminosCondiciones ?? '',
      ganchoComercial: propuesta.ganchoComercial ?? '',
      enviada: true,
      fechaEnvio: new Date().toISOString(),
    };
    set((s) => ({
      propuestas: [...s.propuestas, nueva],
      currentComercio: {
        ...s.currentComercio,
        propuestasEnviadas: s.currentComercio.propuestasEnviadas + 1,
      },
    }));
    // Persistencia real en la tabla `ofertas_comercios`
    const comercio = get().currentComercio;
    void insertOfertaComercio(nueva, comercio.id, comercio.nombre).then(({ error }) => {
      if (error) {
        toast.error('La propuesta se envió localmente pero falló la sincronización', {
          description: error,
        });
      }
    });
  },

  markPropuestaEnviada: (oportunidadId) =>
    set((s) => ({
      oportunidades: s.oportunidades.map((op) =>
        op.id === oportunidadId ? { ...op, propuestaEnviada: true } : op
      ),
    })),

  setSelectedOpportunity: (id) => set({ selectedOpportunityId: id }),
  setPropuestaDialogOpen: (open) => set({ isPropuestaDialogOpen: open }),
}));

// ───── Helper: filter opportunities later when commerce is registered ─────

export function filterOportunidades(
  oportunidades: OportunidadIFC[],
  categoria: ComercioCategory | undefined,
  ciudad: string | undefined
): OportunidadIFC[] {
  if (!categoria || !ciudad) return [];
  return oportunidades.filter(
    (op) => op.categoria === categoria && op.ciudad.toLowerCase() === ciudad.toLowerCase()
  );
}

// ───── Empty opportunities for production (no mock data injected) ─────
const EMPTY_OPORTUNIDADES: OportunidadIFC[] = [];

export { EMPTY_OPORTUNIDADES as MOCK_OPORTUNIDADES };
