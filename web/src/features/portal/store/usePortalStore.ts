import { create } from 'zustand';
import { toast } from 'sonner';
import type { GoalMeta } from '@/types';
import { MOCK_GOALS, type BudgetCategory } from '@/features/portal/data/mock';
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
  registrarEventoUsoCliente,
  fetchPresupuestoCategorias,
  insertPresupuestoCategoria,
  updatePresupuestoCategoriaGasto,
  deletePresupuestoCategoria,
  uploadRecibo,
  procesarRecibo,
  fetchMovimientosOcrPendientes,
  confirmarMovimientoOcr,
  descartarMovimientoOcr,
  type MeInteresaDestinatarioDisplay,
  type MovimientoOcr,
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
  | 'buscar-comercios'
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
  /** Destinatarios reales (nombre + código de verificación anti-phishing), solo para mostrar en el historial */
  destinatarios: MeInteresaDestinatarioDisplay[];
  status: SolicitudStatus;
  createdAt: string;
}

export interface SolicitudConstructoraCliente {
  id: string;
  origen: 'constructora';
  tipoVivienda: string;
  ciudad: string;
  destinatarios: MeInteresaDestinatarioDisplay[];
  status: SolicitudStatus;
  createdAt: string;
}

export interface SolicitudComercioCliente {
  id: string;
  origen: 'comercio';
  categoria: string;
  subcategoria?: string;
  destinatarios: MeInteresaDestinatarioDisplay[];
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
  /** Presente solo cuando la solicitud nace del CTA "Me interesa" sobre una campaña puntual (Ofertas) — `bancos` ya trae el destinatario resuelto. */
  campanaId?: string;
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
  /**
   * Presente solo cuando la solicitud nace del CTA "Me interesa este proyecto"
   * sobre una tarjeta puntual — en ese caso se salta el match amplio por
   * ciudad/estrato/presupuesto y el destinatario es SIEMPRE esa única
   * constructora, sin importar si otras también tendrían match.
   */
  proyecto?: { id: string; constructoraUserId: string; constructoraNombre: string };
}

/** Input para crear una solicitud a comercios — el match a UN solo comercio se resuelve internamente. */
export interface AddSolicitudComercioInput {
  id: string;
  categoria: string;
  subcategoria?: string;
  ciudad: string;
  /**
   * Presente solo cuando la solicitud nace del CTA "Me interesa" sobre una
   * campaña puntual (Ofertas) — en ese caso se salta el match amplio por
   * categoría/ciudad y el destinatario es SIEMPRE ese comercio.
   */
  campana?: { id: string; organizationId: string; organizationNombre: string };
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
  /** Categorías de Mi Presupuesto del mes actual (hidratadas desde la base de datos real) */
  presupuestoCategorias: BudgetCategory[];
  /** true mientras se cargan las categorías de presupuesto */
  isPresupuestoLoading: boolean;
  /** true después del primer intento de hidratación del presupuesto */
  isPresupuestoHydrated: boolean;
  /** Recibos/facturas subidos y ya procesados por OCR, pendientes de revisión del cliente */
  movimientosOcrPendientes: MovimientoOcr[];
  /** true mientras se cargan los movimientos OCR pendientes */
  isMovimientosOcrLoading: boolean;
  /** true después del primer intento de hidratación de movimientos OCR */
  isMovimientosOcrHydrated: boolean;
  /** true mientras se sube/procesa una foto de recibo (subida + OCR) */
  isProcesandoRecibo: boolean;
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
  /** Hidrata las categorías de Mi Presupuesto del mes actual desde la base de datos real */
  hydratePresupuesto: () => Promise<void>;
  /** Crea una categoría de presupuesto (optimista) y la persiste en la base de datos real */
  addPresupuestoCategoria: (categoria: BudgetCategory) => Promise<boolean>;
  /** Suma un gasto a una categoría existente (optimista) */
  registrarGastoCategoria: (categoriaId: string, monto: number) => Promise<void>;
  /** Elimina una categoría de presupuesto (hard delete — no es un registro financiero sensible) */
  eliminarPresupuestoCategoria: (categoriaId: string) => Promise<void>;
  /** Hidrata los movimientos OCR pendientes de revisión desde la base de datos real */
  hydrateMovimientosOcr: () => Promise<void>;
  /** Sube la foto del recibo y dispara el OCR server-side; agrega el resultado a la cola de revisión */
  subirYProcesarRecibo: (file: File) => Promise<boolean>;
  /**
   * El cliente confirma un movimiento OCR con la categoría elegida: actualiza
   * el estado a 'confirmado' y SOLO entonces suma el gasto real a
   * presupuesto_categorias, vía registrarGastoCategoria.
   */
  confirmarMovimientoOcrEnCategoria: (movimientoId: string, categoriaId: string, monto: number) => Promise<void>;
  /** Descarta un movimiento OCR (ej. lectura incorrecta o recibo duplicado) sin afectar el presupuesto */
  descartarMovimientoOcrPendiente: (movimientoId: string) => Promise<void>;
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
  presupuestoCategorias: [],
  isPresupuestoLoading: false,
  isPresupuestoHydrated: false,
  movimientosOcrPendientes: [],
  isMovimientosOcrLoading: false,
  isMovimientosOcrHydrated: false,
  isProcesandoRecibo: false,
  dbError: null,

  setActiveTab: (tab) => {
    set({ activeTab: tab });
    // Fire-and-forget: alimenta el ranking de "secciones más usadas" en Admin.
    void registrarEventoUsoCliente({ tipoEvento: 'cambio_seccion', seccion: tab });
  },
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
      // codigoVerificacion aún no existe — lo genera el trigger de BD al insertar
      // el destinatario, unos milisegundos después. hydrateSolicitudes lo trae real.
      destinatarios: input.bancos.map((b) => ({ nombre: b.nombre, codigoVerificacion: null })),
      status: 'Pendiente de contacto',
      createdAt: new Date().toISOString(),
    };
    set((state) => ({ solicitudes: [solicitud, ...state.solicitudes] }));

    const { error: solError } = await insertMeInteresaSolicitud({
      id: input.id,
      clienteId,
      origen: 'banco',
      productoBancario: input.productType,
      campanaId: input.campanaId,
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

    const nombreByUserId = new Map<string, string>();
    const constructoraUserIds: string[] = [];

    if (input.proyecto) {
      // CTA "Me interesa este proyecto" — destinatario único, ya conocido por la
      // tarjeta que disparó la solicitud. Nunca se abre a otras constructoras.
      nombreByUserId.set(input.proyecto.constructoraUserId, input.proyecto.constructoraNombre);
      constructoraUserIds.push(input.proyecto.constructoraUserId);
    } else {
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
      for (const p of proyectos ?? []) {
        if (p.constructora_id && !nombreByUserId.has(p.constructora_id)) {
          nombreByUserId.set(p.constructora_id, p.constructora_nombre ?? 'Constructora');
          constructoraUserIds.push(p.constructora_id);
        }
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
      destinatarios: destinatarios.map((d) => ({ nombre: d.nombre, codigoVerificacion: null })),
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
      proyectoId: input.proyecto?.id,
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

    let destinatarios: { organizationId: string; nombre: string }[];

    if (input.campana) {
      // CTA "Me interesa" sobre una campaña puntual — destinatario único, ya
      // conocido por la tarjeta que disparó la solicitud. Nunca se abre a otros comercios.
      destinatarios = [{ organizationId: input.campana.organizationId, nombre: input.campana.organizationNombre }];
    } else {
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
      destinatarios = elegido ? [{ organizationId: elegido.id, nombre: elegido.name }] : [];
    }

    const solicitud: SolicitudCliente = {
      id: input.id,
      origen: 'comercio',
      categoria: input.categoria,
      subcategoria: input.subcategoria,
      destinatarios: destinatarios.map((d) => ({ nombre: d.nombre, codigoVerificacion: null })),
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
      campanaId: input.campana?.id,
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

  hydratePresupuesto: async () => {
    if (get().isPresupuestoHydrated || get().isPresupuestoLoading) return;
    const clienteId = getClienteId();
    if (!isDbConfigured || !clienteId) {
      set({ isPresupuestoLoading: false, isPresupuestoHydrated: true, presupuestoCategorias: [] });
      return;
    }
    set({ isPresupuestoLoading: true });
    const { data, error } = await fetchPresupuestoCategorias(clienteId);
    if (error) {
      set({ isPresupuestoLoading: false, isPresupuestoHydrated: true, dbError: error });
      return;
    }
    set({
      presupuestoCategorias: data ?? [],
      isPresupuestoLoading: false,
      isPresupuestoHydrated: true,
      dbError: null,
    });
  },

  addPresupuestoCategoria: async (categoria) => {
    const clienteId = getClienteId();
    if (!clienteId) {
      toast.error('No se pudo identificar tu sesión', { description: 'Vuelve a iniciar sesión e intenta de nuevo.' });
      return false;
    }
    // Optimista: aparece de inmediato en la UI
    set((state) => ({ presupuestoCategorias: [...state.presupuestoCategorias, categoria] }));
    const { error } = await insertPresupuestoCategoria(categoria, clienteId);
    if (error) {
      set((state) => ({
        presupuestoCategorias: state.presupuestoCategorias.filter((c) => c.id !== categoria.id),
        dbError: error,
      }));
      logFalloApp('insertPresupuestoCategoria', error);
      toast.error('No se pudo crear la categoría', { description: error });
      return false;
    }
    return true;
  },

  registrarGastoCategoria: async (categoriaId, monto) => {
    const current = get().presupuestoCategorias.find((c) => c.id === categoriaId);
    if (!current) return;
    const nuevoGastado = current.spent + monto;
    // Optimista
    set((state) => ({
      presupuestoCategorias: state.presupuestoCategorias.map((c) =>
        c.id === categoriaId ? { ...c, spent: nuevoGastado } : c,
      ),
    }));
    const { error } = await updatePresupuestoCategoriaGasto(categoriaId, nuevoGastado);
    if (error) {
      // Revertir si la base de datos rechazó el cambio
      set((state) => ({
        presupuestoCategorias: state.presupuestoCategorias.map((c) =>
          c.id === categoriaId ? { ...c, spent: current.spent } : c,
        ),
        dbError: error,
      }));
      toast.error('No se pudo registrar el gasto', { description: error });
      return;
    }
    toast.success('Gasto registrado', { description: `Se sumó a "${current.name}".` });
  },

  eliminarPresupuestoCategoria: async (categoriaId) => {
    const current = get().presupuestoCategorias.find((c) => c.id === categoriaId);
    if (!current) return;
    // Optimista
    set((state) => ({
      presupuestoCategorias: state.presupuestoCategorias.filter((c) => c.id !== categoriaId),
    }));
    const { error } = await deletePresupuestoCategoria(categoriaId);
    if (error) {
      // Revertir si la base de datos rechazó el cambio
      set((state) => ({ presupuestoCategorias: [...state.presupuestoCategorias, current] }));
      toast.error('No se pudo eliminar la categoría', { description: error });
      return;
    }
    toast.success('Categoría eliminada');
  },

  hydrateMovimientosOcr: async () => {
    if (get().isMovimientosOcrHydrated || get().isMovimientosOcrLoading) return;
    const clienteId = getClienteId();
    if (!isDbConfigured || !clienteId) {
      set({ isMovimientosOcrLoading: false, isMovimientosOcrHydrated: true, movimientosOcrPendientes: [] });
      return;
    }
    set({ isMovimientosOcrLoading: true });
    const { data, error } = await fetchMovimientosOcrPendientes(clienteId);
    if (error) {
      set({ isMovimientosOcrLoading: false, isMovimientosOcrHydrated: true, dbError: error });
      return;
    }
    set({
      movimientosOcrPendientes: data ?? [],
      isMovimientosOcrLoading: false,
      isMovimientosOcrHydrated: true,
      dbError: null,
    });
  },

  subirYProcesarRecibo: async (file) => {
    const clienteId = getClienteId();
    if (!clienteId) {
      toast.error('No se pudo identificar tu sesión', { description: 'Vuelve a iniciar sesión e intenta de nuevo.' });
      return false;
    }
    set({ isProcesandoRecibo: true });

    const { path, error: uploadError } = await uploadRecibo(clienteId, file);
    if (uploadError || !path) {
      set({ isProcesandoRecibo: false, dbError: uploadError });
      logFalloApp('uploadRecibo', uploadError ?? 'sin path');
      toast.error('No se pudo subir la foto del recibo', { description: uploadError ?? undefined });
      return false;
    }

    const { data: movimiento, error: procesarError } = await procesarRecibo(path);
    if (procesarError || !movimiento) {
      set({ isProcesandoRecibo: false, dbError: procesarError });
      toast.error('No se pudo leer el recibo automáticamente', {
        description: procesarError ?? 'Podés intentar de nuevo o cargarlo manualmente.',
      });
      return false;
    }

    set((state) => ({
      movimientosOcrPendientes: [movimiento, ...state.movimientosOcrPendientes],
      isProcesandoRecibo: false,
    }));
    toast.success('Recibo procesado', {
      description: movimiento.comercioExtraido
        ? `Detectamos "${movimiento.comercioExtraido}" — revisalo antes de confirmar.`
        : 'No detectamos todos los datos — completalos antes de confirmar.',
    });
    return true;
  },

  confirmarMovimientoOcrEnCategoria: async (movimientoId, categoriaId, monto) => {
    const current = get().movimientosOcrPendientes.find((m) => m.id === movimientoId);
    if (!current) return;
    // Optimista: sale de la cola de pendientes de inmediato
    set((state) => ({
      movimientosOcrPendientes: state.movimientosOcrPendientes.filter((m) => m.id !== movimientoId),
    }));
    const { error } = await confirmarMovimientoOcr(movimientoId, categoriaId);
    if (error) {
      // Revertir: vuelve a la cola de pendientes
      set((state) => ({
        movimientosOcrPendientes: [current, ...state.movimientosOcrPendientes],
        dbError: error,
      }));
      toast.error('No se pudo confirmar el recibo', { description: error });
      return;
    }
    // Solo ahora impacta el presupuesto real — misma acción que "Registrar gasto" manual.
    await get().registrarGastoCategoria(categoriaId, monto);
  },

  descartarMovimientoOcrPendiente: async (movimientoId) => {
    const current = get().movimientosOcrPendientes.find((m) => m.id === movimientoId);
    if (!current) return;
    set((state) => ({
      movimientosOcrPendientes: state.movimientosOcrPendientes.filter((m) => m.id !== movimientoId),
    }));
    const { error } = await descartarMovimientoOcr(movimientoId);
    if (error) {
      set((state) => ({
        movimientosOcrPendientes: [current, ...state.movimientosOcrPendientes],
        dbError: error,
      }));
      toast.error('No se pudo descartar el recibo', { description: error });
      return;
    }
    toast.success('Recibo descartado');
  },
}));
