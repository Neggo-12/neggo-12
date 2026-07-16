import { create } from 'zustand';
import { toast } from 'sonner';
import type { GoalMeta } from '@/types';
import { MOCK_GOALS } from '@/features/portal/data/mock';
import {
  fetchMetas,
  insertMeta,
  setMetaIFC,
  updateMetaStatus,
  insertMeInteresaSolicitud,
  insertMeInteresaDestinatarios,
  fetchMeInteresaSolicitudesByCliente,
  fetchProyectosMatch,
  fetchOrganizationIdsByUserIds,
  fetchComerciosMatch,
  insertSenalInteres,
  fetchSenalesInteresByCliente,
  fetchClienteContactInfo,
} from '@/core/db/repositories';
import { isDbConfigured } from '@/core/db/dbClient';
import { useAuthStore } from '@/store/useAuthStore';
import { logFalloApp } from '@/core/infrastructure/fallosApp';

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

// ───── Solicitud types ─────

export type SolicitudProductType =
  | 'compra-cartera'
  | 'credito-hipotecario'
  | 'cdt'
  | 'libre-inversion'
  | 'retanqueo'
  | 'tarjeta-credito';

type SolicitudStatus = 'Pendiente de contacto' | 'Sin destinatarios disponibles' | 'Señal de interés registrada';

export interface SolicitudBancoCliente {
  id: string;
  origen: 'banco';
  productType: SolicitudProductType;
  /** Nombres de los destinatarios, solo para mostrar en el historial */
  destinatarios: string[];
  status: SolicitudStatus;
  createdAt: string;
}

export interface SolicitudConstructoraCliente {
  id: string;
  origen: 'constructora';
  tipoVivienda: string;
  ciudad: string;
  destinatarios: string[];
  status: SolicitudStatus;
  createdAt: string;
}

export interface SolicitudComercioCliente {
  id: string;
  origen: 'comercio';
  categoria: string;
  subcategoria?: string;
  destinatarios: string[];
  status: SolicitudStatus;
  createdAt: string;
}

/** Señal de interés: el cliente eligió un negocio curado (no registrado) — sin destinatarios reales. */
export interface SolicitudSenalInteresCliente {
  id: string;
  origen: 'senal-interes';
  sector: 'banco' | 'constructora' | 'comercio';
  /** Null cuando el cliente registró interés genérico (constructora/comercio) sin elegir un Negocio de Interés específico. */
  negocioDeseado: string | null;
  categoria?: string;
  tipoVivienda?: string;
  ciudad?: string;
  status: SolicitudStatus;
  createdAt: string;
}

/** Unión discriminada — un solo historial, ahora 4 formas de solicitud (Fase 5/6/9.3). */
export type SolicitudCliente =
  | SolicitudBancoCliente
  | SolicitudConstructoraCliente
  | SolicitudComercioCliente
  | SolicitudSenalInteresCliente;

/** Input para crear una solicitud a bancos — carga el organizationId real de cada banco. */
export interface AddSolicitudBancoInput {
  id: string;
  productType: SolicitudProductType;
  bancos: { organizationId: string; nombre: string }[];
}

/** Input para crear una solicitud a constructoras — el match se resuelve internamente. */
export interface AddSolicitudConstructoraInput {
  id: string;
  tipoVivienda: string;
  comuna?: string;
  ciudad: string;
  estrato?: number;
  presupuestoMin?: number;
  presupuestoMax?: number;
}

/** Input para crear una solicitud a comercios — el match a UN solo comercio se resuelve internamente. */
export interface AddSolicitudComercioInput {
  id: string;
  categoria: string;
  subcategoria?: string;
  ciudad: string;
}

/** Input para registrar una señal de interés — el cliente eligió un negocio curado, no uno real. */
export interface AddSenalInteresInput {
  id: string;
  sector: 'banco' | 'constructora' | 'comercio';
  /** Obligatorio para sector='banco'; opcional para constructora/comercio. */
  negocioDeseado?: string;
  productoBancario?: string;
  tipoVivienda?: string;
  categoria?: string;
  subcategoria?: string;
  ciudad?: string;
}

// ───── Store ─────

/** Resuelve el id real del cliente autenticado desde la sesión — nunca un id demo hardcodeado. */
function getClienteId(): string | null {
  return useAuthStore.getState().session?.userId ?? null;
}

interface PortalState {
  /** Currently selected navigation tab */
  activeTab: PortalTab;
  /** Controls the "Nueva Solicitud" creation dialog */
  isNuevaSolicitudOpen: boolean;
  /** Submitted solicitudes history */
  solicitudes: SolicitudCliente[];
  /** true mientras se cargan las solicitudes desde la base de datos */
  isSolicitudesLoading: boolean;
  /** true después del primer intento de hidratación de solicitudes */
  isSolicitudesHydrated: boolean;
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
  /** Registra una solicitud a bancos y la persiste en la base de datos real */
  addSolicitudBanco: (input: AddSolicitudBancoInput) => Promise<boolean>;
  /** Busca constructoras con match real y registra la solicitud */
  addSolicitudConstructora: (input: AddSolicitudConstructoraInput) => Promise<boolean>;
  /** Busca UN comercio con match real (categoría+ciudad, preferencia por especialidad/Sello) y registra la solicitud */
  addSolicitudComercio: (input: AddSolicitudComercioInput) => Promise<boolean>;
  /** Registra una señal de interés (negocio curado, no registrado) y la persiste en la base de datos real */
  addSenalInteres: (input: AddSenalInteresInput) => Promise<boolean>;
  /** Hidrata el historial de solicitudes del cliente desde la base de datos real */
  hydrateSolicitudes: () => Promise<void>;
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
  solicitudes: [],
  isSolicitudesLoading: false,
  isSolicitudesHydrated: false,
  metas: [],
  isMetasLoading: false,
  isMetasHydrated: false,
  dbError: null,

  setActiveTab: (tab) => set({ activeTab: tab }),
  setNuevaSolicitudOpen: (open) => set({ isNuevaSolicitudOpen: open }),

  addSolicitudBanco: async (input) => {
    const clienteId = getClienteId();
    if (!clienteId) {
      toast.error('No se pudo identificar tu sesión', { description: 'Vuelve a iniciar sesión e intenta de nuevo.' });
      return false;
    }
    const solicitud: SolicitudCliente = {
      id: input.id,
      origen: 'banco',
      productType: input.productType,
      destinatarios: input.bancos.map((b) => b.nombre),
      status: 'Pendiente de contacto',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ solicitudes: [solicitud, ...state.solicitudes] }));

    const { error: solError } = await insertMeInteresaSolicitud({
      id: input.id,
      clienteId,
      origen: 'banco',
      productoBancario: input.productType,
    });
    if (solError) {
      set({ dbError: solError });
      logFalloApp('insertMeInteresaSolicitud:banco', solError);
      toast.error('La solicitud se guardó localmente pero falló la sincronización', { description: solError });
      return false;
    }

    const { error: destError } = await insertMeInteresaDestinatarios(
      input.id,
      input.bancos.map((b) => ({ organizationId: b.organizationId, type: 'banco' as const })),
    );
    if (destError) {
      set({ dbError: destError });
      toast.error('La solicitud se guardó pero no llegó a los bancos', { description: destError });
      return false;
    }
    return true;
  },

  addSolicitudConstructora: async (input) => {
    const clienteId = getClienteId();
    if (!clienteId) {
      toast.error('No se pudo identificar tu sesión', { description: 'Vuelve a iniciar sesión e intenta de nuevo.' });
      return false;
    }

    const { data: proyectos, error: matchError } = await fetchProyectosMatch({
      ciudad: input.ciudad,
      estrato: input.estrato,
      presupuestoMin: input.presupuestoMin,
      presupuestoMax: input.presupuestoMax,
    });
    if (matchError) {
      toast.error('No se pudo buscar constructoras', { description: matchError });
      return false;
    }

    const nombreByUserId = new Map<string, string>();
    const constructoraUserIds: string[] = [];
    for (const p of proyectos ?? []) {
      if (p.constructora_id && !nombreByUserId.has(p.constructora_id)) {
        nombreByUserId.set(p.constructora_id, p.constructora_nombre ?? 'Constructora');
        constructoraUserIds.push(p.constructora_id);
      }
    }

    let destinatarios: { organizationId: string; nombre: string }[] = [];
    if (constructoraUserIds.length > 0) {
      const { data: orgIdMap, error: orgMapError } = await fetchOrganizationIdsByUserIds(constructoraUserIds);
      if (orgMapError) {
        toast.error('No se pudo resolver las constructoras', { description: orgMapError });
        return false;
      }
      destinatarios = Array.from((orgIdMap ?? new Map()).entries()).map(([userId, organizationId]) => ({
        organizationId,
        nombre: nombreByUserId.get(userId) ?? 'Constructora',
      }));
    }

    const solicitud: SolicitudCliente = {
      id: input.id,
      origen: 'constructora',
      tipoVivienda: input.tipoVivienda,
      ciudad: input.ciudad,
      destinatarios: destinatarios.map((d) => d.nombre),
      status: destinatarios.length > 0 ? 'Pendiente de contacto' : 'Sin destinatarios disponibles',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ solicitudes: [solicitud, ...state.solicitudes] }));

    const { error: solError } = await insertMeInteresaSolicitud({
      id: input.id,
      clienteId,
      origen: 'constructora',
      tipoVivienda: input.tipoVivienda,
      comuna: input.comuna,
      ciudad: input.ciudad,
      estratoMin: input.estrato,
      estratoMax: input.estrato,
      presupuestoMin: input.presupuestoMin,
      presupuestoMax: input.presupuestoMax,
    });
    if (solError) {
      set({ dbError: solError });
      logFalloApp('insertMeInteresaSolicitud:constructora', solError);
      toast.error('La solicitud se guardó localmente pero falló la sincronización', { description: solError });
      return false;
    }

    if (destinatarios.length > 0) {
      const { error: destError } = await insertMeInteresaDestinatarios(
        input.id,
        destinatarios.map((d) => ({ organizationId: d.organizationId, type: 'constructora' as const })),
      );
      if (destError) {
        set({ dbError: destError });
        toast.error('La solicitud se guardó pero no llegó a las constructoras', { description: destError });
        return false;
      }
    }

    return true;
  },

  addSolicitudComercio: async (input) => {
    const clienteId = getClienteId();
    if (!clienteId) {
      toast.error('No se pudo identificar tu sesión', { description: 'Vuelve a iniciar sesión e intenta de nuevo.' });
      return false;
    }

    const { data: comercios, error: matchError } = await fetchComerciosMatch({
      ciudad: input.ciudad,
      categoria: input.categoria,
    });
    if (matchError) {
      toast.error('No se pudo buscar comercios', { description: matchError });
      return false;
    }

    // Preferencia suave por subcategoría, luego desempate por Sello de Confianza, luego sorteo.
    let pool = comercios ?? [];
    if (input.subcategoria) {
      const conEspecialidad = pool.filter((c) => c.especialidades.includes(input.subcategoria!));
      if (conEspecialidad.length > 0) pool = conEspecialidad;
    }
    const conSello = pool.filter((c) => c.hasTrustSeal);
    if (conSello.length > 0) pool = conSello;
    const elegido = pool.length > 0 ? pool[Math.floor(Math.random() * pool.length)] : null;
    const destinatarios = elegido ? [{ organizationId: elegido.id, nombre: elegido.name }] : [];

    const solicitud: SolicitudCliente = {
      id: input.id,
      origen: 'comercio',
      categoria: input.categoria,
      subcategoria: input.subcategoria,
      destinatarios: destinatarios.map((d) => d.nombre),
      status: destinatarios.length > 0 ? 'Pendiente de contacto' : 'Sin destinatarios disponibles',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ solicitudes: [solicitud, ...state.solicitudes] }));

    const { error: solError } = await insertMeInteresaSolicitud({
      id: input.id,
      clienteId,
      origen: 'comercio',
      categoria: input.categoria,
      subcategoria: input.subcategoria,
      ciudad: input.ciudad,
    });
    if (solError) {
      set({ dbError: solError });
      logFalloApp('insertMeInteresaSolicitud:comercio', solError);
      toast.error('La solicitud se guardó localmente pero falló la sincronización', { description: solError });
      return false;
    }

    if (destinatarios.length > 0) {
      const { error: destError } = await insertMeInteresaDestinatarios(
        input.id,
        destinatarios.map((d) => ({ organizationId: d.organizationId, type: 'comercio' as const })),
      );
      if (destError) {
        set({ dbError: destError });
        toast.error('La solicitud se guardó pero no llegó al comercio', { description: destError });
        return false;
      }
    }

    return true;
  },

  addSenalInteres: async (input) => {
    const clienteId = getClienteId();
    if (!clienteId) {
      toast.error('No se pudo identificar tu sesión', { description: 'Vuelve a iniciar sesión e intenta de nuevo.' });
      return false;
    }

    const { data: contacto, error: contactoError } = await fetchClienteContactInfo(clienteId);
    if (contactoError || !contacto) {
      toast.error('No se pudo registrar tu interés', { description: contactoError ?? 'No se pudo obtener tu información de contacto.' });
      return false;
    }

    const solicitud: SolicitudCliente = {
      id: input.id,
      origen: 'senal-interes',
      sector: input.sector,
      negocioDeseado: input.negocioDeseado ?? null,
      categoria: input.categoria,
      tipoVivienda: input.tipoVivienda,
      ciudad: input.ciudad,
      status: 'Señal de interés registrada',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ solicitudes: [solicitud, ...state.solicitudes] }));

    const { error } = await insertSenalInteres({
      clienteId,
      clienteNombre: contacto.nombre,
      clienteTelefono: contacto.telefono,
      sector: input.sector,
      negocioDeseado: input.negocioDeseado,
      productoBancario: input.productoBancario,
      tipoVivienda: input.tipoVivienda,
      categoria: input.categoria,
      subcategoria: input.subcategoria,
      ciudad: input.ciudad,
    });
    if (error) {
      set({ dbError: error });
      logFalloApp('insertSenalInteres', error);
      toast.error('No se pudo registrar tu interés', { description: error });
      return false;
    }
    return true;
  },

  hydrateSolicitudes: async () => {
    if (get().isSolicitudesHydrated || get().isSolicitudesLoading) return;
    const clienteId = getClienteId();
    if (!isDbConfigured || !clienteId) {
      set({ isSolicitudesLoading: false, isSolicitudesHydrated: true });
      return;
    }
    set({ isSolicitudesLoading: true });
    const [{ data, error }, { data: senales, error: senalesError }] = await Promise.all([
      fetchMeInteresaSolicitudesByCliente(clienteId),
      fetchSenalesInteresByCliente(clienteId),
    ]);
    if (error || !data) {
      set({ isSolicitudesLoading: false, isSolicitudesHydrated: true });
      return;
    }
    const solicitudesReales: SolicitudCliente[] = data.map((s): SolicitudCliente => {
      const status: SolicitudStatus =
        s.destinatarios.length > 0 ? 'Pendiente de contacto' : 'Sin destinatarios disponibles';
      if (s.origen === 'constructora') {
        return {
          id: s.id,
          origen: 'constructora',
          tipoVivienda: s.tipoVivienda ?? '',
          ciudad: s.ciudad ?? '',
          destinatarios: s.destinatarios,
          status,
          createdAt: s.createdAt,
        };
      }
      if (s.origen === 'comercio') {
        return {
          id: s.id,
          origen: 'comercio',
          categoria: s.categoria ?? '',
          subcategoria: s.subcategoria ?? undefined,
          destinatarios: s.destinatarios,
          status,
          createdAt: s.createdAt,
        };
      }
      return {
        id: s.id,
        origen: 'banco',
        productType: (s.productoBancario ?? 'compra-cartera') as SolicitudProductType,
        destinatarios: s.destinatarios,
        status,
        createdAt: s.createdAt,
      };
    });
    const solicitudesSenales: SolicitudCliente[] = (senalesError ? [] : senales ?? []).map((s): SolicitudCliente => ({
      id: s.id,
      origen: 'senal-interes',
      sector: s.sector,
      negocioDeseado: s.negocioDeseado,
      categoria: s.categoria ?? undefined,
      tipoVivienda: s.tipoVivienda ?? undefined,
      ciudad: s.ciudad ?? undefined,
      status: 'Señal de interés registrada',
      createdAt: s.createdAt,
    }));
    set({
      solicitudes: [...solicitudesReales, ...solicitudesSenales].sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
      ),
      isSolicitudesLoading: false,
      isSolicitudesHydrated: true,
    });
  },

  hydrateMetas: async () => {
    if (get().isMetasHydrated || get().isMetasLoading) return;
    const clienteId = getClienteId();
    if (!isDbConfigured || !clienteId) {
      // Sin base de datos o sin sesión: mostrar estado vacío real, no mock
      set({ isMetasLoading: false, isMetasHydrated: true, metas: [] });
      return;
    }
    set({ isMetasLoading: true });
    const { data, error } = await fetchMetas(clienteId);
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
      // Tabla vacía: metas en blanco (sin inyectar mock)
      set({ isMetasLoading: false, isMetasHydrated: true, metas: [] });
    }
  },

  addMeta: async (meta) => {
    const clienteId = getClienteId();
    if (!clienteId) {
      toast.error('No se pudo identificar tu sesión', { description: 'Vuelve a iniciar sesión e intenta de nuevo.' });
      return false;
    }
    // Optimista: aparece de inmediato en la UI
    set((state) => ({ metas: [...state.metas, meta] }));
    const { error } = await insertMeta(meta, clienteId);
    if (error) {
      set({ dbError: error });
      logFalloApp('insertMeta', error);
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
    const current = get().metas.find((m) => m.id === metaId);
    if (!current) return;
    // Optimista: marcamos deleted
    set((state) => ({
      metas: state.metas.map((m) =>
        m.id === metaId ? { ...m, status: 'deleted' as const } : m,
      ),
    }));
    const { error } = await updateMetaStatus(metaId, 'deleted');
    if (error) {
      // Revertir si la base de datos rechazó el cambio
      set((state) => ({
        metas: state.metas.map((m) => (m.id === metaId ? { ...m, status: current.status } : m)),
      }));
      toast.error('No se pudo eliminar la meta', { description: error });
      return;
    }
    toast.success('Meta eliminada', {
      description: 'La meta fue removida de tu lista activa.',
    });
  },

  completeMeta: async (metaId) => {
    const current = get().metas.find((m) => m.id === metaId);
    if (!current) return;
    const now = new Date().toISOString();
    // Optimista: marcamos completed
    set((state) => ({
      metas: state.metas.map((m) =>
        m.id === metaId
          ? { ...m, status: 'completed' as const, completedAt: now, savedAmount: m.targetAmount }
          : m,
      ),
    }));
    const { error } = await updateMetaStatus(metaId, 'completed', {
      completedAt: now,
      montoAhorrado: current.targetAmount,
    });
    if (error) {
      // Revertir si la base de datos rechazó el cambio
      set((state) => ({
        metas: state.metas.map((m) =>
          m.id === metaId
            ? { ...m, status: current.status, completedAt: current.completedAt, savedAmount: current.savedAmount }
            : m,
        ),
      }));
      toast.error('No se pudo completar la meta', { description: error });
      return;
    }
    toast.success('¡Meta Lograda! 🎉', {
      description: 'Felicidades, tu meta ha sido marcada como cumplida.',
    });
  },
}));
