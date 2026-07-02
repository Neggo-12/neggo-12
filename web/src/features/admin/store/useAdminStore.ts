import { create } from 'zustand';
import type {
  AdminEntityType,
  AuthorizationStatus,
  OnboardingRequest,
  IFCTransaction,
  EcosistemaMetrics,
  AlgorithmEquity,
  FacturaLedger,
} from '@/types';
import { FACTURAS_LEDGER } from '@/core/db/mockDb';
import { fetchFacturasLedger } from '@/core/db/repositories';

// ───── Mock: Onboarding requests pending authorization ─────

const MOCK_ONBOARDING: OnboardingRequest[] = [
  {
    id: 'ONB-001',
    entityType: 'banco',
    name: 'Bancolombia',
    detail: 'Solicitud de integración API Core Banking + Datacrédito',
    city: 'Medellín',
    nit: '890.903.938-8',
    status: 'autorizado',
    submittedAt: '2026-05-10T08:00:00Z',
    reviewedAt: '2026-05-11T14:30:00Z',
    reviewedBy: 'Admin Principal',
    contacto: {
      nombre: 'María Fernanda Gómez',
      cargo: 'Directora de Alianzas Financieras',
      correo: 'm.gomez@bancolombia.com.co',
      telefono: '+57 310 555 1234',
      estadoDocumentos: 'verificado',
    },
  },
  {
    id: 'ONB-002',
    entityType: 'banco',
    name: 'Davivienda',
    detail: 'Conexión Hipotecario Flexible + Campañas segmentadas',
    city: 'Bogotá',
    nit: '860.034.313-7',
    status: 'autorizado',
    submittedAt: '2026-05-15T09:20:00Z',
    reviewedAt: '2026-05-16T10:00:00Z',
    reviewedBy: 'Admin Principal',
    contacto: {
      nombre: 'Carlos Andrés Mejía',
      cargo: 'Gerente de Producto Hipotecario',
      correo: 'c.mejia@davivienda.com',
      telefono: '+57 315 777 8901',
      estadoDocumentos: 'verificado',
    },
  },
  {
    id: 'ONB-003',
    entityType: 'banco',
    name: 'BBVA Colombia',
    detail: 'Solicitud de integración para Libranzas y Tarjetas',
    city: 'Bogotá',
    nit: '860.003.020-1',
    status: 'autorizado',
    submittedAt: '2026-06-01T11:00:00Z',
    reviewedAt: '2026-06-02T09:15:00Z',
    reviewedBy: 'Admin Principal',
    contacto: {
      nombre: 'Laura Patricia Ríos',
      cargo: 'VP de Transformación Digital',
      correo: 'l.rios@bbva.com.co',
      telefono: '+57 320 444 5678',
      estadoDocumentos: 'verificado',
    },
  },
  {
    id: 'ONB-004',
    entityType: 'banco',
    name: 'Banco de Occidente',
    detail: 'Integración Vehículos + API de Scoring avanzado',
    city: 'Cali',
    nit: '890.300.279-4',
    status: 'pendiente',
    submittedAt: '2026-06-28T16:45:00Z',
    contacto: {
      nombre: 'Jorge Enrique Díaz',
      cargo: 'Jefe de Alianzas Digitales',
      correo: 'j.diaz@bancodeoccidente.com.co',
      telefono: '+57 318 222 3456',
      estadoDocumentos: 'pendiente',
    },
  },
  {
    id: 'ONB-005',
    entityType: 'constructora',
    name: 'Constructora Capital',
    detail: 'Solicitud de vinculación fiduciaria — Proyecto Torres del Río',
    city: 'Bogotá',
    nit: '900.456.789-2',
    status: 'pendiente',
    submittedAt: '2026-06-25T10:30:00Z',
    contacto: {
      nombre: 'Andrés Felipe Duarte',
      cargo: 'Gerente Comercial',
      correo: 'a.duarte@constructoracapital.com',
      telefono: '+57 311 888 9012',
      estadoDocumentos: 'pendiente',
    },
  },
  {
    id: 'ONB-006',
    entityType: 'constructora',
    name: 'Proyectos del Valle',
    detail: 'Verificación fiduciaria para desglose inmobiliario Villa Serena',
    city: 'Medellín',
    nit: '811.023.456-1',
    status: 'autorizado',
    submittedAt: '2026-06-10T08:00:00Z',
    reviewedAt: '2026-06-12T11:00:00Z',
    reviewedBy: 'Admin Principal',
    contacto: {
      nombre: 'Diana Carolina Ospina',
      cargo: 'Directora de Ventas',
      correo: 'd.ospina@proyectosdelvalle.com',
      telefono: '+57 314 666 7890',
      estadoDocumentos: 'verificado',
    },
  },
  {
    id: 'ONB-007',
    entityType: 'constructora',
    name: 'Grupo Inmobiliario del Caribe',
    detail: 'Registro de proyecto Centro Empresarial Norte — En espera de auditoría legal',
    city: 'Barranquilla',
    nit: '802.019.345-8',
    status: 'en-revision',
    submittedAt: '2026-06-20T14:00:00Z',
    contacto: {
      nombre: 'Roberto José Martínez',
      cargo: 'Representante Legal',
      correo: 'r.martinez@inmobiliariacaribe.com',
      telefono: '+57 300 111 2233',
      estadoDocumentos: 'pendiente',
    },
  },
  {
    id: 'ONB-008',
    entityType: 'comercio',
    name: 'Tienda Celulares Medellín',
    detail: 'Solicitud de Sello de Confianza — Categoría Celular',
    city: 'Medellín',
    nit: '901.234.567-3',
    status: 'en-revision',
    submittedAt: '2026-06-29T09:00:00Z',
    contacto: {
      nombre: 'Sandra Milena Ruiz',
      cargo: 'Gerente de Tienda',
      correo: 's.ruiz@celularesmde.com',
      telefono: '+57 313 444 5566',
      estadoDocumentos: 'pendiente',
    },
  },
  {
    id: 'ONB-009',
    entityType: 'comercio',
    name: 'Viajes Colombia Premium',
    detail: 'Registro y verificación NIT — Categoría Viaje',
    city: 'Bogotá',
    nit: '900.876.543-0',
    status: 'pendiente',
    submittedAt: '2026-06-30T11:15:00Z',
    contacto: {
      nombre: 'Paola Andrea Vargas',
      cargo: 'Directora de Operaciones',
      correo: 'p.vargas@viajespremium.co',
      telefono: '+57 316 777 8899',
      estadoDocumentos: 'pendiente',
    },
  },
  {
    id: 'ONB-010',
    entityType: 'comercio',
    name: 'Autos del Valle',
    detail: 'Solicitud de Sello de Confianza — Categoría Carro',
    city: 'Cali',
    nit: '805.012.789-4',
    status: 'autorizado',
    submittedAt: '2026-06-05T08:00:00Z',
    reviewedAt: '2026-06-07T09:30:00Z',
    reviewedBy: 'Admin Principal',
    contacto: {
      nombre: 'Hernán Darío López',
      cargo: 'Gerente General',
      correo: 'h.lopez@autosdelvalle.com',
      telefono: '+57 312 333 4455',
      estadoDocumentos: 'verificado',
    },
  },
];

// ───── Mock: IFC transactions for algorithm monitoring ─────

const MOCK_IFC_TRANSACTIONS: IFCTransaction[] = [
  {
    id: 'IFC-L1818',
    clienteIFC: 'L-1818',
    presupuesto: 4500000,
    categoria: 'Carro',
    comerciosNotificados: 12,
    propuestasRecibidas: 7,
    fechaGeneracion: '2026-06-30T14:22:00Z',
  },
  {
    id: 'IFC-L2103',
    clienteIFC: 'L-2103',
    presupuesto: 22000000,
    categoria: 'Vivienda',
    comerciosNotificados: 12,
    propuestasRecibidas: 4,
    fechaGeneracion: '2026-06-29T10:15:00Z',
  },
  {
    id: 'IFC-L3456',
    clienteIFC: 'L-3456',
    presupuesto: 48000000,
    categoria: 'Carro',
    comerciosNotificados: 12,
    propuestasRecibidas: 9,
    fechaGeneracion: '2026-06-29T16:40:00Z',
  },
  {
    id: 'IFC-L4721',
    clienteIFC: 'L-4721',
    presupuesto: 8000000,
    categoria: 'Viaje',
    comerciosNotificados: 8,
    propuestasRecibidas: 3,
    fechaGeneracion: '2026-06-30T09:05:00Z',
  },
  {
    id: 'IFC-L5892',
    clienteIFC: 'L-5892',
    presupuesto: 120000000,
    categoria: 'Vivienda',
    comerciosNotificados: 12,
    propuestasRecibidas: 6,
    fechaGeneracion: '2026-06-28T11:30:00Z',
  },
  {
    id: 'IFC-L6201',
    clienteIFC: 'L-6201',
    presupuesto: 3500000,
    categoria: 'Celular',
    comerciosNotificados: 10,
    propuestasRecibidas: 5,
    fechaGeneracion: '2026-06-30T08:00:00Z',
  },
];

// ───── Mock: Ecosystem metrics ─────

const MOCK_ECOSISTEMA: EcosistemaMetrics = {
  clientesActivos: 1847,
  bancosConectados: 6,
  constructorasRegistradas: 5,
  comerciosSuscritos: 14,
  ifcGeneradas: 342,
  propuestasEnviadas: 1218,
  tasaMatch: 78.4,
  deltaClientes: 12.3,
  deltaBancos: 0,
  deltaConstructoras: 25,
  deltaComercios: 16.7,
};

// ───── Mock: Algorithm equity distribution ─────

const MOCK_ALGORITHM: AlgorithmEquity = {
  calidad: 40,
  respuesta: 30,
  rotacion: 20,
  sorteo: 10,
};

// ───── Store ─────

interface AdminState {
  /** All onboarding requests across entities */
  onboardingRequests: OnboardingRequest[];
  /** Consolidated ecosystem metrics */
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
  authorizeEntity: (requestId: string) => void;
  rejectEntity: (requestId: string) => void;
  issueTrustSeal: (requestId: string) => void;
  /** Carga el ledger de facturación desde la tabla `facturas_ledger` */
  hydrateFacturas: () => Promise<void>;
}

export const useAdminStore = create<AdminState>((set, get) => ({
  onboardingRequests: MOCK_ONBOARDING,
  ecosistemaMetrics: MOCK_ECOSISTEMA,
  ifcTransactions: MOCK_IFC_TRANSACTIONS,
  algorithmEquity: MOCK_ALGORITHM,
  activeSection: 'resumen',
  facturas: FACTURAS_LEDGER,
  isFacturasHydrated: false,

  setActiveSection: (section) => set({ activeSection: section }),

  hydrateFacturas: async () => {
    if (get().isFacturasHydrated) return;
    set({ isFacturasHydrated: true });
    const { data } = await fetchFacturasLedger();
    if (data && data.length > 0) {
      set({ facturas: data });
    }
  },

  authorizeEntity: (requestId) =>
    set((s) => ({
      onboardingRequests: s.onboardingRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'autorizado' as AuthorizationStatus,
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'Admin Principal',
            }
          : r
      ),
    })),

  rejectEntity: (requestId) =>
    set((s) => ({
      onboardingRequests: s.onboardingRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'rechazado' as AuthorizationStatus,
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'Admin Principal',
            }
          : r
      ),
    })),

  issueTrustSeal: (requestId) =>
    set((s) => ({
      onboardingRequests: s.onboardingRequests.map((r) =>
        r.id === requestId
          ? {
              ...r,
              status: 'autorizado' as AuthorizationStatus,
              reviewedAt: new Date().toISOString(),
              reviewedBy: 'Admin Principal',
            }
          : r
      ),
    })),
}));
