import { create } from 'zustand';
import { toast } from 'sonner';
import type { GoalMeta } from '@/types';
import { MOCK_GOALS } from '@/features/portal/data/mock';
import {
  fetchMetas,
  insertMeta,
  insertSolicitud,
  setMetaIFC,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';

// ───── Tab types ─────

export type PortalTab =
  | 'finanzas'
  | 'control-financiero'
  | 'ofertas'
  | 'oportunidades-inmobiliarias'
  | 'metas'
  | 'facturas'
  | 'solicitudes'
  | 'feedback';

// ───── Client type ─────

export interface PortalClient {
  id: string;
  name: string;
  type: string;
  city: string;
  score: number;
}

// ───── Solicitud types ─────

export type SolicitudProductType =
  | 'compra-cartera'
  | 'credito-hipotecario'
  | 'cdt'
  | 'libre-inversion';

export interface SolicitudCliente {
  id: string;
  productType: SolicitudProductType;
  banks: string[];
  status: 'Pendiente de contacto por el banco' | 'En revisión' | 'Aprobada';
  createdAt: string;
}

// ───── Deterministic 6-digit security code ─────

function generateSecurityCode(clientId: string): string {
  let hash = 0;
  for (let i = 0; i < clientId.length; i++) {
    hash = ((hash << 5) - hash + clientId.charCodeAt(i)) | 0;
  }
  const code = ((Math.abs(hash) % 900000) + 100000).toString();
  return `${code.slice(0, 3)} ${code.slice(3, 6)}`;
}

// ───── Store ─────

/** ID del cliente demo en la tabla `users` de la base de datos real */
const CLIENTE_DB_ID = 'USR-CLIENTE-01';

interface PortalState {
  /** Currently selected navigation tab */
  activeTab: PortalTab;
  /** Controls the "Nueva Solicitud" creation dialog */
  isNuevaSolicitudOpen: boolean;
  /** Mock client currently logged in */
  currentClient: PortalClient;
  /** Deterministic 6-digit security code based on client ID */
  securityCode: string;
  /** Submitted solicitudes history */
  solicitudes: SolicitudCliente[];
  /** Metas de ahorro del cliente (hidratadas desde la base de datos real) */
  metas: GoalMeta[];
  /** true mientras se cargan las metas desde la base de datos */
  isMetasLoading: boolean;
  /** true después del primer intento de hidratación */
  isMetasHydrated: boolean;
  /** Último error de sincronización con la base de datos */
  dbError: string | null;

  setActiveTab: (tab: PortalTab) => void;
  setNuevaSolicitudOpen: (open: boolean) => void;
  /** Registra la solicitud localmente y la persiste en la base de datos real */
  addSolicitud: (solicitud: SolicitudCliente) => void;
  /** Hidrata las metas del cliente desde la base de datos real */
  hydrateMetas: () => Promise<void>;
  /** Crea una meta (optimista) y la persiste en la base de datos real */
  addMeta: (meta: GoalMeta) => Promise<boolean>;
  /** Activa/desactiva el Sello IFC de una meta y persiste el cambio */
  toggleMetaIFC: (metaId: string) => Promise<void>;
  /** Soft-delete de una meta (marca status como deleted) */
  deleteMeta: (metaId: string) => Promise<void>;
  /** Marca una meta como completada con animación */
  completeMeta: (metaId: string) => Promise<void>;
}

const DEFAULT_CLIENT: PortalClient = {
  id: 'L-1818',
  name: 'Jhon Edison Florez',
  type: 'Alto Patrimonio',
  city: 'Medellín',
  score: 726,
};

/**
 * Combina las metas de la base de datos con las ofertas mock existentes
 * (las ofertas de comercios se mantienen del catálogo local por id de meta).
 */
function mergeMetasWithOffers(dbMetas: GoalMeta[]): GoalMeta[] {
  return dbMetas.map((meta) => {
    const mockMatch = MOCK_GOALS.find((g) => g.id === meta.id);
    return mockMatch ? { ...meta, offers: mockMatch.offers } : meta;
  });
}

export const usePortalStore = create<PortalState>((set, get) => ({
  activeTab: 'finanzas',
  isNuevaSolicitudOpen: false,
  currentClient: DEFAULT_CLIENT,
  securityCode: generateSecurityCode(DEFAULT_CLIENT.id),
  solicitudes: [],
  metas: MOCK_GOALS,
  isMetasLoading: false,
  isMetasHydrated: false,
  dbError: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setNuevaSolicitudOpen: (open) => set({ isNuevaSolicitudOpen: open }),

  addSolicitud: (solicitud) => {
    set((state) => ({ solicitudes: [solicitud, ...state.solicitudes] }));
    // Persistencia real (fire-and-forget con manejo de error)
    void insertSolicitud(
      {
        id: solicitud.id,
        productType: solicitud.productType,
        banks: solicitud.banks,
        status: solicitud.status,
      },
      CLIENTE_DB_ID,
    ).then(({ error }) => {
      if (error) {
        set({ dbError: error });
        toast.error('La solicitud se guardó localmente pero falló la sincronización', {
          description: error,
        });
      }
    });
  },

  hydrateMetas: async () => {
    if (get().isMetasHydrated || get().isMetasLoading || !isDbConfigured) {
      if (!isDbConfigured) set({ isMetasHydrated: true });
      return;
    }
    set({ isMetasLoading: true });
    const { data, error } = await fetchMetas(CLIENTE_DB_ID);
    if (error) {
      set({ isMetasLoading: false, isMetasHydrated: true, dbError: error });
      return;
    }
    if (data && data.length > 0) {
      set({
        metas: mergeMetasWithOffers(data),
        isMetasLoading: false,
        isMetasHydrated: true,
        dbError: null,
      });
    } else {
      set({ isMetasLoading: false, isMetasHydrated: true });
    }
  },

  addMeta: async (meta) => {
    // Optimista: aparece de inmediato en la UI
    set((state) => ({ metas: [...state.metas, meta] }));
    const { error } = await insertMeta(meta, CLIENTE_DB_ID);
    if (error) {
      set({ dbError: error });
      toast.error('La meta se creó localmente pero falló la sincronización', {
        description: error,
      });
      return false;
    }
    return true;
  },

  toggleMetaIFC: async (metaId) => {
    const current = get().metas.find((m) => m.id === metaId);
    if (!current) return;
    const nextValue = !current.ifcCertified;
    // Optimista
    set((state) => ({
      metas: state.metas.map((m) =>
        m.id === metaId ? { ...m, ifcCertified: nextValue } : m,
      ),
    }));
    const { error } = await setMetaIFC(metaId, nextValue);
    if (error) {
      // Revertir si la base de datos rechazó el cambio
      set((state) => ({
        metas: state.metas.map((m) =>
          m.id === metaId ? { ...m, ifcCertified: !nextValue } : m,
        ),
        dbError: error,
      }));
      toast.error('No se pudo sincronizar el Sello IFC', { description: error });
    }
  },

  deleteMeta: async (metaId) => {
    // Optimista: marcamos deleted
    set((state) => ({
      metas: state.metas.map((m) =>
        m.id === metaId ? { ...m, status: 'deleted' as const } : m,
      ),
    }));
    toast.success('Meta eliminada', {
      description: 'La meta fue removida de tu lista activa.',
    });
  },

  completeMeta: async (metaId) => {
    const now = new Date().toISOString();
    // Optimista: marcamos completed
    set((state) => ({
      metas: state.metas.map((m) =>
        m.id === metaId
          ? { ...m, status: 'completed' as const, completedAt: now, savedAmount: m.targetAmount }
          : m,
      ),
    }));
    toast.success('¡Meta Lograda! 🎉', {
      description: 'Felicidades, tu meta ha sido marcada como cumplida.',
    });
  },
}));
