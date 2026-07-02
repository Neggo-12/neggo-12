import { create } from 'zustand';
import { toast } from 'sonner';
import { insertOfertaComercio } from '@/core/db/repositories';
import type {
  Comercio,
  ComercioCategory,
  SubscriptionTier,
  OportunidadIFC,
  PropuestaComercio,
} from '@/types';

// ───── Mock commerce data ─────

const DEFAULT_COMERCIO: Comercio = {
  id: 'COM-001',
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
  /** IFC opportunities matching the commerce category + city */
  oportunidades: OportunidadIFC[];
  /** Proposals sent by this commerce */
  propuestas: PropuestaComercio[];
  /** Currently selected opportunity for proposal dialog */
  selectedOpportunityId: string | null;
  /** Whether the proposal dialog is open */
  isPropuestaDialogOpen: boolean;

  setComercio: (data: Partial<Comercio>) => void;
  completeOnboarding: () => void;
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
  oportunidades: [],
  propuestas: [],
  selectedOpportunityId: null,
  isPropuestaDialogOpen: false,

  setComercio: (data) =>
    set((s) => ({ currentComercio: { ...s.currentComercio, ...data } })),

  completeOnboarding: () =>
    set({
      isOnboardingComplete: true,
      hasTrustSeal: true,
    }),

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
