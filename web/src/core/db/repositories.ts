/**
 * Repositories — data-access layer over the shared Supabase client.
 *
 * Repositories DO NOT implement security. Row-Level Security (RLS) policies in
 * Supabase are the real boundary; these functions only apply UX-level filters
 * (e.g. by bank name, client id) on top of what RLS already permits.
 *
 * Every function returns a `{ data, error }` (or `{ error }`) envelope and never
 * throws, so callers can render graceful states. `error` is a human-readable
 * string or `null`.
 */
import { supabase } from '@/core/db/dbClient';
import type { Database, Json } from '@/integrations/supabase/types';
import { reportDbError } from '@/core/infrastructure/sentry';
import { logFalloApp } from '@/core/infrastructure/fallosApp';
import type {
  GoalMeta,
  GoalCategory,
  GoalStatus,
  PropuestaComercio,
  RejectionMetric,
  RejectionAggregate,
} from '@/types';

// ───── Row type aliases (single source of truth: generated Supabase types) ─────

export type UserRow = Database['public']['Tables']['users']['Row'];
export type ProyectoRow = Database['public']['Tables']['proyectos']['Row'];
export type LeadRow = Database['public']['Tables']['leads']['Row'];
export type SolicitudBancaRow = Database['public']['Tables']['solicitudes_banca']['Row'];
export type OfertaComercioRow = Database['public']['Tables']['ofertas_comercios']['Row'];
export type FacturaLedgerRow = Database['public']['Tables']['facturas_ledger']['Row'];
export type MetaRow = Database['public']['Tables']['metas']['Row'];
export type MetricaRechazoRow = Database['public']['Tables']['metricas_rechazo']['Row'];
export type MeInteresaSolicitudRow = Database['public']['Tables']['me_interesa_solicitudes']['Row'];
export type MeInteresaDestinatarioRow = Database['public']['Tables']['me_interesa_destinatarios']['Row'];
export type ClienteBancoProductoRow = Database['public']['Tables']['cliente_banco_productos']['Row'];
export type AceptacionPoliticaRow = Database['public']['Tables']['aceptaciones_politica']['Row'];
export type FalloAppRow = Database['public']['Tables']['fallos_app']['Row'];

// ───── Helpers ─────

const NOT_CONFIGURED = 'Base de datos no configurada.';

/**
 * Sanitiza un nombre de archivo para Storage — Supabase rechaza rutas con
 * tildes/espacios ("Invalid key"). Mismo criterio de diacríticos que
 * normalizeCiudad (lib/utils.ts): NFD + strip de marcas combinantes.
 */
export function sanitizeFileName(fileName: string): string {
  return fileName
    .normalize('NFD')
    .replace(/\p{Mn}/gu, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-zA-Z0-9.-]/g, '')
    .replace(/-+/g, '-');
}

function errMessage(error: unknown): string {
  let msg = 'Error desconocido al acceder a la base de datos.';
  if (error && typeof error === 'object' && 'message' in error) {
    const m = (error as { message?: unknown }).message;
    if (typeof m === 'string') msg = m;
  }
  reportDbError(msg, error);
  return msg;
}

/** Reporta a Sentry un "0 filas afectadas" (posible bloqueo de RLS) preservando el mensaje original al caller. */
function noRowsError(message: string): string {
  reportDbError(message);
  return message;
}

// ───── Metas (client savings goals) ─────

/** metas.status vive en español en la DB; GoalStatus (tipo de la app) está en inglés — mapeo explícito en ambas direcciones. */
const DB_STATUS_TO_GOAL_STATUS: Record<string, GoalStatus> = {
  activa: 'active',
  completada: 'completed',
  eliminada: 'deleted',
};
const GOAL_STATUS_TO_DB_STATUS: Record<GoalStatus, string> = {
  active: 'activa',
  completed: 'completada',
  deleted: 'eliminada',
};

function rowToGoalMeta(row: MetaRow): GoalMeta {
  const metadata = (row.metadata ?? null) as Record<string, string | number> | null;
  return {
    id: row.id,
    category: row.categoria as GoalCategory,
    targetAmount: Number(row.monto_objetivo),
    savedAmount: Number(row.monto_ahorrado),
    monthlyGoal: Number(row.ahorro_mensual),
    offers: [],
    ifcCertified: row.ifc_activo,
    status: DB_STATUS_TO_GOAL_STATUS[row.status] ?? 'active',
    completedAt: row.completed_at ?? undefined,
    subcategoria: row.subcategoria ?? undefined,
    metadataAdicional: metadata ?? undefined,
  };
}

export async function fetchMetas(
  clienteId: string,
): Promise<{ data: GoalMeta[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('metas')
    .select('*')
    .eq('cliente_id', clienteId);
  if (error) return { data: null, error: errMessage(error) };
  return { data: (data ?? []).map(rowToGoalMeta), error: null };
}

export async function insertMeta(
  meta: GoalMeta,
  clienteId: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from('metas').insert({
    id: meta.id,
    cliente_id: clienteId,
    categoria: meta.category,
    subcategoria: meta.subcategoria ?? null,
    monto_objetivo: meta.targetAmount,
    monto_ahorrado: meta.savedAmount,
    ahorro_mensual: meta.monthlyGoal,
    ifc_activo: meta.ifcCertified,
    metadata: meta.metadataAdicional ?? null,
  });
  return { error: error ? errMessage(error) : null };
}

export async function setMetaIFC(
  metaId: string,
  value: boolean,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('metas')
    .update({ ifc_activo: value })
    .eq('id', metaId)
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) {
    return { error: noRowsError('No se pudo actualizar: la meta no existe o no tienes permiso (RLS).') };
  }
  return { error: null };
}

/** Persiste el status real de una meta (activa/completada/eliminada — soft-delete, nunca DELETE físico). */
export async function updateMetaStatus(
  metaId: string,
  status: GoalStatus,
  opts?: { completedAt?: string; montoAhorrado?: number },
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const updates: { status: string; completed_at?: string | null; monto_ahorrado?: number } = {
    status: GOAL_STATUS_TO_DB_STATUS[status],
  };
  if (opts?.completedAt !== undefined) updates.completed_at = opts.completedAt;
  if (opts?.montoAhorrado !== undefined) updates.monto_ahorrado = opts.montoAhorrado;
  const { data, error } = await supabase
    .from('metas')
    .update(updates)
    .eq('id', metaId)
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) {
    return { error: noRowsError('No se pudo actualizar: la meta no existe o no tienes permiso (RLS).') };
  }
  return { error: null };
}

// ───── Solicitudes de banca ─────

export interface InsertSolicitudInput {
  id: string;
  productType: string;
  banks: string[];
  status: string;
}

export async function insertSolicitud(
  input: InsertSolicitudInput,
  clienteId: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from('solicitudes_banca').insert({
    id: input.id,
    cliente_id: clienteId,
    producto: input.productType,
    bancos: input.banks,
    estado: input.status,
  });
  return { error: error ? errMessage(error) : null };
}

/**
 * Fetches banking requests that include the given bank name. `organizationId`
 * is accepted for API/tenant consistency; the actual tenant isolation is
 * enforced by RLS (there is no organization column on this table).
 */
export async function fetchSolicitudesByBankName(
  bankName: string,
  organizationId?: string | null,
): Promise<{ data: SolicitudBancaRow[] | null; error: string | null }> {
  void organizationId; // isolation enforced by RLS; kept for API consistency
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('solicitudes_banca')
    .select('*')
    .contains('bancos', [bankName])
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

// ───── Ofertas de comercios ─────

/** Fetches only the offers created by this comercio (scoped by `comercio_id`, the comercio's own user id). */
export async function fetchOfertasComercios(
  comercioId: string,
): Promise<{ data: OfertaComercioRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('ofertas_comercios')
    .select('*')
    .eq('comercio_id', comercioId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

export async function insertOfertaComercio(
  propuesta: PropuestaComercio,
  comercioId: string,
  comercioNombre: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from('ofertas_comercios').insert({
    id: propuesta.id,
    comercio_id: comercioId,
    comercio_nombre: comercioNombre,
    meta_id: propuesta.oportunidadId,
    oportunidad_id: propuesta.oportunidadId,
    beneficio: propuesta.beneficio,
    descripcion: propuesta.descripcionDetallada,
    terminos: propuesta.terminosCondiciones,
    gancho_comercial: propuesta.ganchoComercial,
    facturacion_automatica: propuesta.facturacionAutomatica,
  });
  return { error: error ? errMessage(error) : null };
}

// ───── Facturas del cliente (Bóveda) ─────

export type FacturaClienteRow = Database['public']['Tables']['facturas_cliente']['Row'];

export interface FacturaClienteConOferta extends FacturaClienteRow {
  ofertas_comercios: { comercio_nombre: string | null; meta_id: string | null } | null;
}

const FACTURAS_BUCKET = 'facturas-clientes';

/**
 * El comercio declara una compra real sobre una oferta ya aceptada — sube el
 * documento a Storage (si lo hay) y llama registrar_compra_oferta(), que
 * inserta la factura y completa la meta en la misma transacción.
 */
export async function registrarCompraOferta(
  ofertaId: string,
  comercioId: string,
  monto: number,
  fechaCompra: string,
  file?: File,
): Promise<{ data: string | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };

  let documentoUrl: string | null = null;
  if (file) {
    const path = `${comercioId}/${ofertaId}-${Date.now()}-${sanitizeFileName(file.name)}`;
    const { error: uploadError } = await supabase.storage.from(FACTURAS_BUCKET).upload(path, file);
    if (uploadError) return { data: null, error: errMessage(uploadError) };
    documentoUrl = path;
  }

  const { data, error } = await supabase.rpc('registrar_compra_oferta', {
    p_oferta_id: ofertaId,
    p_monto: monto,
    p_fecha_compra: fechaCompra,
    p_documento_url: documentoUrl,
  });
  if (error) {
    const message = errMessage(error);
    logFalloApp('registrar_compra_oferta', message, error);
    return { data: null, error: message };
  }
  return { data, error: null };
}

/**
 * Facturas reales del cliente — join facturas_cliente → ofertas_comercios →
 * metas, filtrado explícitamente por cliente_id (RLS ya lo exige, pero se
 * filtra también aquí como capa de UX, mismo criterio que el resto de este archivo).
 */
export async function fetchFacturasCliente(
  clienteId: string,
): Promise<{ data: FacturaClienteConOferta[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('facturas_cliente')
    .select('*, ofertas_comercios!inner(comercio_nombre, meta_id, metas!inner(cliente_id))')
    .eq('ofertas_comercios.metas.cliente_id', clienteId)
    .order('fecha_compra', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: (data ?? []) as unknown as FacturaClienteConOferta[], error: null };
}

/**
 * documento_url guarda el path del objeto en el bucket privado, no una URL
 * pública — se firma bajo demanda, nunca se persiste la URL firmada.
 */
export async function getFacturaSignedUrl(path: string): Promise<{ url: string | null; error: string | null }> {
  if (!supabase) return { url: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase.storage.from(FACTURAS_BUCKET).createSignedUrl(path, 60 * 10);
  if (error) return { url: null, error: errMessage(error) };
  return { url: data.signedUrl, error: null };
}

/** Facturas ya registradas para un conjunto de ofertas del comercio — protegido
 * por la misma policy de SELECT (comercio dueño de la oferta). */
export async function fetchFacturasPorOfertas(
  ofertaIds: string[],
): Promise<{ data: FacturaClienteRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  if (ofertaIds.length === 0) return { data: [], error: null };
  const { data, error } = await supabase
    .from('facturas_cliente')
    .select('*')
    .in('oferta_id', ofertaIds);
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

export interface VentaComercioRow {
  id: string;
  clienteNombre: string | null;
  monto: number;
  categoria: string;
  subcategoria: string | null;
  fechaCompra: string;
}

interface FacturaClienteVentaJoin {
  id: string;
  monto: number;
  fecha_compra: string;
  ofertas_comercios: { comercio_id: string | null; meta_id: string | null } | null;
}

/**
 * Historial de ventas confirmadas del comercio — facturas_cliente de todas sus
 * ofertas. categoria/subcategoria/cliente_id NO se pueden traer vía embed a
 * `metas` (RLS de esa tabla solo permite `cliente_id = auth.uid()`, sin cláusula
 * para comercio — un embed !inner ahí descarta silenciosamente todas las filas).
 * Se resuelven aparte con resolver_metas_para_ventas_comercio(), una función
 * SECURITY DEFINER que valida ownership internamente (solo devuelve metas de
 * ofertas del comercio que llama) — no se tocó la política RLS general de metas.
 */
export async function fetchVentasComercio(
  comercioId: string,
): Promise<{ data: VentaComercioRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('facturas_cliente')
    .select('id, monto, fecha_compra, ofertas_comercios!inner(comercio_id, meta_id)')
    .eq('ofertas_comercios.comercio_id', comercioId)
    .order('fecha_compra', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  const rows = (data ?? []) as unknown as FacturaClienteVentaJoin[];

  const metaIds = Array.from(new Set(rows.map((r) => r.ofertas_comercios?.meta_id).filter((id): id is string => !!id)));
  const metaById = new Map<string, { categoria: string; subcategoria: string | null; cliente_id: string | null }>();
  if (metaIds.length > 0) {
    const { data: metas, error: metasError } = await supabase.rpc('resolver_metas_para_ventas_comercio', {
      p_meta_ids: metaIds,
    });
    if (metasError) return { data: null, error: errMessage(metasError) };
    for (const m of metas ?? []) metaById.set(m.id, m);
  }

  const clienteIds = Array.from(
    new Set(Array.from(metaById.values()).map((m) => m.cliente_id).filter((id): id is string => !!id)),
  );
  const nombreById = new Map<string, string>();
  if (clienteIds.length > 0) {
    const { data: clientes } = await supabase.from('users').select('id, nombre').in('id', clienteIds);
    for (const c of clientes ?? []) nombreById.set(c.id, c.nombre);
  }

  return {
    data: rows.map((r) => {
      const meta = r.ofertas_comercios?.meta_id ? metaById.get(r.ofertas_comercios.meta_id) : undefined;
      return {
        id: r.id,
        clienteNombre: meta?.cliente_id ? nombreById.get(meta.cliente_id) ?? null : null,
        monto: Number(r.monto),
        categoria: meta?.categoria ?? '—',
        subcategoria: meta?.subcategoria ?? null,
        fechaCompra: r.fecha_compra,
      };
    }),
    error: null,
  };
}

/** Ofertas reales sobre una meta del cliente — protegido por RLS (cliente_comercio_admin_selecciona_ofertas). */
export async function fetchOfertasParaCliente(
  metaId: string,
): Promise<{ data: OfertaComercioRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('ofertas_comercios')
    .select('*')
    .eq('meta_id', metaId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

/**
 * Acepta/rechaza una oferta — nunca por UPDATE directo, siempre vía
 * responder_oferta_comercio() (SECURITY DEFINER): valida dueño de la meta y
 * que la oferta siga 'pendiente'. No cierra la meta ni las demás ofertas
 * competidoras (decisión de negocio, sección 15.2/17).
 */
async function responderOferta(
  ofertaId: string,
  estado: 'aceptada' | 'rechazada',
  motivoRechazo?: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.rpc('responder_oferta_comercio', {
    p_oferta_id: ofertaId,
    p_estado: estado,
    p_motivo_rechazo: motivoRechazo ?? null,
  });
  if (error) {
    const message = errMessage(error);
    logFalloApp('responder_oferta_comercio', message, error);
    return { error: message };
  }
  return { error: null };
}

export function aceptarOferta(ofertaId: string): Promise<{ error: string | null }> {
  return responderOferta(ofertaId, 'aceptada');
}

export function rechazarOferta(ofertaId: string, motivo?: string): Promise<{ error: string | null }> {
  return responderOferta(ofertaId, 'rechazada', motivo);
}

export interface OportunidadComercioRow {
  metaId: string;
  subcategoria: string | null;
  montoObjetivo: number;
  montoAhorrado: number;
  ahorroMensual: number;
  createdAt: string;
}

/** Metas con IFC activo que coinciden con la categoría del comercio — vía RPC SECURITY DEFINER, nunca expone cliente_id. */
export async function fetchOportunidadesParaComercio(
  categoria: string,
): Promise<{ data: OportunidadComercioRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase.rpc('fetch_oportunidades_comercio', {
    p_categoria: categoria,
  });
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: (data ?? []).map((r) => ({
      metaId: r.meta_id,
      subcategoria: r.subcategoria,
      montoObjetivo: Number(r.monto_objetivo),
      montoAhorrado: Number(r.monto_ahorrado),
      ahorroMensual: Number(r.ahorro_mensual),
      createdAt: r.created_at,
    })),
    error: null,
  };
}

// ───── Sistema de Puntos (Nivel 1) — docs/sistema-puntos-neggo.md ─────

/** Puntos por $1.000 vigentes de un comercio — negociado > default (1). */
export async function resolverTasaPuntosComercio(
  comercioId: string,
): Promise<{ data: number | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase.rpc('resolver_tasa_puntos_comercio', { p_comercio_id: comercioId });
  if (error) return { data: null, error: errMessage(error) };
  return { data: Number(data), error: null };
}

/** Saldo actual de puntos de un cliente — SUM(puntos) sobre su ledger completo. */
export async function saldoPuntosCliente(
  clienteId: string,
): Promise<{ data: number | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase.rpc('saldo_puntos_cliente', { p_cliente_id: clienteId });
  if (error) return { data: null, error: errMessage(error) };
  return { data: Number(data), error: null };
}

/**
 * Emite puntos por una compra ya registrada — RPC SECURITY DEFINER, idempotente
 * (no duplica si ya se emitió para esa factura). Fire-and-forget en el caller:
 * nunca debe bloquear la confirmación de la venta.
 */
export async function emitirPuntosPorCompra(facturaClienteId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.rpc('emitir_puntos_por_compra', { p_factura_cliente_id: facturaClienteId });
  if (error) return { error: errMessage(error) };
  return { error: null };
}

/** Canjea puntos del cliente autenticado en un comercio/constructora — valida saldo suficiente antes de descontar. */
export async function canjearPuntos(
  comercioId: string,
  puntos: number,
): Promise<{ data: string | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase.rpc('canjear_puntos', { p_comercio_id: comercioId, p_puntos: puntos });
  if (error) return { data: null, error: errMessage(error) };
  return { data, error: null };
}

export interface PuntosMovimientoRow {
  id: string;
  tipo: 'ganado' | 'canjeado' | 'vencido';
  puntos: number;
  comercioNombre: string | null;
  fechaVencimiento: string | null;
  createdAt: string;
}

/** Historial completo de movimientos de puntos de un cliente (ganados, canjeados, vencidos), más reciente primero. */
export async function fetchPuntosMovimientosCliente(
  clienteId: string,
): Promise<{ data: PuntosMovimientoRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('puntos_movimientos')
    .select('id, tipo, puntos, comercio_origen_id, comercio_canje_id, fecha_vencimiento, created_at')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  const rows = data ?? [];

  const orgIds = Array.from(new Set(rows.map((r) => r.comercio_origen_id ?? r.comercio_canje_id).filter((id): id is string => !!id)));
  const nombreById = new Map<string, string>();
  if (orgIds.length > 0) {
    const { data: orgs } = await fetchOrganizationsByIds(orgIds);
    for (const o of orgs ?? []) nombreById.set(o.id, o.name);
  }

  return {
    data: rows.map((r) => {
      const orgId = r.comercio_origen_id ?? r.comercio_canje_id;
      return {
        id: r.id,
        tipo: r.tipo as PuntosMovimientoRow['tipo'],
        puntos: r.puntos,
        comercioNombre: orgId ? nombreById.get(orgId) ?? null : null,
        fechaVencimiento: r.fecha_vencimiento,
        createdAt: r.created_at,
      };
    }),
    error: null,
  };
}

export interface ComercioParaCanjeRow {
  id: string;
  name: string;
}

/** Comercios y constructoras aprobados — universo válido para canjear puntos (mismo filtro que canjear_puntos en BD). */
export async function fetchComerciosYConstructorasParaCanje(): Promise<{
  data: ComercioParaCanjeRow[] | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .in('type', ['comercio', 'constructora'])
    .eq('status', 'approved')
    .order('name');
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

export interface PuntosCanjeRow {
  id: string;
  clienteId: string;
  clienteNombre: string | null;
  puntos: number;
  createdAt: string;
  pagado: boolean;
}

/** Canjes recibidos por un comercio/constructora — con estado Pagado/Pendiente según puntos_liquidaciones. */
export async function fetchPuntosCanjesComercio(
  comercioId: string,
): Promise<{ data: PuntosCanjeRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('puntos_movimientos')
    .select('id, cliente_id, puntos, created_at')
    .eq('comercio_canje_id', comercioId)
    .eq('tipo', 'canjeado')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  const rows = data ?? [];
  if (rows.length === 0) return { data: [], error: null };

  const movimientoIds = rows.map((r) => r.id);
  const [{ data: liquidaciones }, { data: clientes }] = await Promise.all([
    supabase.from('puntos_liquidaciones').select('puntos_movimiento_id').in('puntos_movimiento_id', movimientoIds),
    supabase.from('users').select('id, nombre').in('id', Array.from(new Set(rows.map((r) => r.cliente_id)))),
  ]);
  const pagadoSet = new Set((liquidaciones ?? []).map((l) => l.puntos_movimiento_id));
  const nombreById = new Map((clientes ?? []).map((c) => [c.id, c.nombre]));

  return {
    data: rows.map((r) => ({
      id: r.id,
      clienteId: r.cliente_id,
      clienteNombre: nombreById.get(r.cliente_id) ?? null,
      puntos: Math.abs(r.puntos),
      createdAt: r.created_at,
      pagado: pagadoSet.has(r.id),
    })),
    error: null,
  };
}

export interface PuntosMovimientoAdminRow {
  id: string;
  tipo: 'ganado' | 'canjeado' | 'vencido';
  puntos: number;
  comercioCanjeId: string | null;
}

/** Todo el ledger de puntos_movimientos (solo campos para agregación) — uso admin, RLS permite is_platform_admin(). */
export async function fetchPuntosMovimientosAdmin(): Promise<{
  data: PuntosMovimientoAdminRow[] | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('puntos_movimientos')
    .select('id, tipo, puntos, comercio_canje_id');
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: (data ?? []).map((r) => ({
      id: r.id,
      tipo: r.tipo as PuntosMovimientoAdminRow['tipo'],
      puntos: r.puntos,
      comercioCanjeId: r.comercio_canje_id,
    })),
    error: null,
  };
}

export interface PuntosCanjeAdminRow {
  id: string;
  comercioOrganizationId: string;
  comercioNombre: string | null;
  clienteId: string;
  clienteNombre: string | null;
  puntos: number;
  createdAt: string;
  pagado: boolean;
}

/** Todos los canjes del ecosistema (cualquier comercio/constructora), con estado Pagado/Pendiente. */
export async function fetchPuntosCanjesAdmin(): Promise<{
  data: PuntosCanjeAdminRow[] | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('puntos_movimientos')
    .select('id, cliente_id, comercio_canje_id, puntos, created_at')
    .eq('tipo', 'canjeado')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  const rows = (data ?? []).filter((r): r is typeof r & { comercio_canje_id: string } => !!r.comercio_canje_id);
  if (rows.length === 0) return { data: [], error: null };

  const movimientoIds = rows.map((r) => r.id);
  const comercioIds = Array.from(new Set(rows.map((r) => r.comercio_canje_id)));
  const clienteIds = Array.from(new Set(rows.map((r) => r.cliente_id)));
  const [{ data: liquidaciones }, { data: orgs }, { data: clientes }] = await Promise.all([
    supabase.from('puntos_liquidaciones').select('puntos_movimiento_id').in('puntos_movimiento_id', movimientoIds),
    fetchOrganizationsByIds(comercioIds),
    supabase.from('users').select('id, nombre').in('id', clienteIds),
  ]);
  const pagadoSet = new Set((liquidaciones ?? []).map((l) => l.puntos_movimiento_id));
  const nombreOrgById = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  const nombreClienteById = new Map((clientes ?? []).map((c) => [c.id, c.nombre]));

  return {
    data: rows.map((r) => ({
      id: r.id,
      comercioOrganizationId: r.comercio_canje_id,
      comercioNombre: nombreOrgById.get(r.comercio_canje_id) ?? null,
      clienteId: r.cliente_id,
      clienteNombre: nombreClienteById.get(r.cliente_id) ?? null,
      puntos: Math.abs(r.puntos),
      createdAt: r.created_at,
      pagado: pagadoSet.has(r.id),
    })),
    error: null,
  };
}

/**
 * Marca un canje como pagado — INSERT append-only en puntos_liquidaciones, guardado por
 * RLS (is_platform_admin() AND pagado_por = auth.uid()::text). Mismo patrón que
 * insertTarifaComercioNegociada: sin RPC dedicada porque es un INSERT puro sin
 * transición de estado que verificar (el estado "pagado" se deriva de la existencia de la fila).
 */
export async function insertPuntosLiquidacion(input: {
  comercioOrganizationId: string;
  puntosMovimientoId: string;
  montoPagado: number;
  pagadoPor: string;
}): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('puntos_liquidaciones')
    .insert({
      comercio_organization_id: input.comercioOrganizationId,
      puntos_movimiento_id: input.puntosMovimientoId,
      monto_pagado: input.montoPagado,
      pagado_por: input.pagadoPor,
    })
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) {
    return { error: noRowsError('No se pudo registrar el pago (posible bloqueo de RLS).') };
  }
  return { error: null };
}

export interface PuntosTasaComercioAdminRow {
  comercioOrganizationId: string;
  comercioNombre: string | null;
  puntosPor1000: number;
  periodoVigenteDesde: string;
  planOrigen: string | null;
}

/** Tasa vigente (puntos por $1.000) de cada comercio que tiene alguna tasa configurada. */
export async function fetchPuntosTasasVigentesAdmin(): Promise<{
  data: PuntosTasaComercioAdminRow[] | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const periodoActual = new Date().toISOString().slice(0, 7);
  const { data, error } = await supabase
    .from('puntos_tasas_comercio')
    .select('comercio_organization_id, puntos_por_1000, periodo_vigente_desde, plan_origen, created_at')
    .lte('periodo_vigente_desde', periodoActual)
    .order('comercio_organization_id', { ascending: true })
    .order('periodo_vigente_desde', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };

  const vigentePorComercio = new Map<string, typeof data[number]>();
  for (const r of data ?? []) {
    if (!vigentePorComercio.has(r.comercio_organization_id)) vigentePorComercio.set(r.comercio_organization_id, r);
  }
  const comercioIds = Array.from(vigentePorComercio.keys());
  const { data: orgs } = await fetchOrganizationsByIds(comercioIds);
  const nombreById = new Map((orgs ?? []).map((o) => [o.id, o.name]));

  return {
    data: Array.from(vigentePorComercio.values()).map((r) => ({
      comercioOrganizationId: r.comercio_organization_id,
      comercioNombre: nombreById.get(r.comercio_organization_id) ?? null,
      puntosPor1000: Number(r.puntos_por_1000),
      periodoVigenteDesde: r.periodo_vigente_desde,
      planOrigen: r.plan_origen,
    })),
    error: null,
  };
}

// ───── Métricas de rechazo (rejection telemetry) ─────

function rowToRejectionMetric(row: MetricaRechazoRow): RejectionMetric {
  return {
    id: row.id,
    offerId: row.offer_id,
    sector: row.sector as RejectionMetric['sector'],
    productType: row.product_type,
    entityName: row.entity_name,
    userId: row.user_id ?? '',
    userAge: row.user_age,
    userGender: row.user_gender as RejectionMetric['userGender'],
    userIncomeRange: row.user_income_range,
    userProfileType: row.user_profile_type,
    userCity: row.user_city,
    rejectedAt: row.rejected_at,
  };
}

export async function insertMetricaRechazo(
  metrica: RejectionMetric,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from('metricas_rechazo').insert({
    id: metrica.id,
    offer_id: metrica.offerId,
    sector: metrica.sector,
    product_type: metrica.productType,
    entity_name: metrica.entityName,
    user_id: metrica.userId,
    user_age: metrica.userAge,
    user_gender: metrica.userGender,
    user_income_range: metrica.userIncomeRange,
    user_profile_type: metrica.userProfileType,
    user_city: metrica.userCity,
    rejected_at: metrica.rejectedAt,
  });
  return { error: error ? errMessage(error) : null };
}

/**
 * Fetches rejection metrics scoped to one entity via `entity_name` — this
 * table has no id column linking to a bank/constructora/comercio, so
 * `entity_name` is the only scoping key available without a schema change.
 */
export async function fetchMetricasRechazo(
  entityName: string,
): Promise<{ data: RejectionMetric[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('metricas_rechazo')
    .select('*')
    .eq('entity_name', entityName)
    .order('rejected_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: (data ?? []).map(rowToRejectionMetric), error: null };
}

/** Pure aggregation over rejection metrics — no I/O. */
export function computeRejectionAggregates(
  metrics: RejectionMetric[],
): RejectionAggregate {
  const bySector: Record<string, number> = {};
  const byGender: Record<string, number> = {};
  const byIncome: Record<string, number> = {};
  const productCounts: Record<string, number> = {};
  const demographicCounts: Record<string, number> = {};

  for (const m of metrics) {
    bySector[m.sector] = (bySector[m.sector] ?? 0) + 1;
    byGender[m.userGender] = (byGender[m.userGender] ?? 0) + 1;
    byIncome[m.userIncomeRange] = (byIncome[m.userIncomeRange] ?? 0) + 1;
    productCounts[m.productType] = (productCounts[m.productType] ?? 0) + 1;
    const segment = `${m.userGender} · ${m.userIncomeRange}`;
    demographicCounts[segment] = (demographicCounts[segment] ?? 0) + 1;
  }

  const topProduct = Object.entries(productCounts).sort((a, b) => b[1] - a[1])[0];
  const topDemographic = Object.entries(demographicCounts).sort(
    (a, b) => b[1] - a[1],
  )[0];

  return {
    topRejectedProduct: topProduct?.[0] ?? '—',
    topRejectedProductCount: topProduct?.[1] ?? 0,
    topDemographicSegment: topDemographic?.[0] ?? '—',
    topDemographicCount: topDemographic?.[1] ?? 0,
    totalRejections: metrics.length,
    bySector,
    byGender,
    byIncome,
  };
}

// ───── Facturas ledger ─────

export interface FacturaResumenNegocio {
  organizationId: string;
  organizationName: string;
  organizationType: 'banco' | 'constructora' | 'comercio';
  cantidadCargos: number;
  totalPendiente: number;
  totalFacturado: number;
  totalPagado: number;
}

/**
 * Resumen de facturación agrupado por negocio (vista `facturas_resumen_por_negocio`,
 * security_invoker=true — hereda el RLS de facturas_ledger, así que Admin ve
 * todos los negocios y una organización solo vería el suyo). Paginado y
 * filtrable por nombre — pensado para escalar a miles de negocios sin traer
 * el ledger completo al cliente.
 */
export async function fetchFacturasResumenPorNegocio(input: {
  search?: string;
  orderBy?: 'organization_name' | 'total_pendiente';
  offset: number;
  limit: number;
}): Promise<{ data: FacturaResumenNegocio[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  let query = supabase
    .from('facturas_resumen_por_negocio')
    .select('organization_id, organization_name, organization_type, cantidad_cargos, total_pendiente, total_facturado, total_pagado')
    .order(input.orderBy ?? 'organization_name', { ascending: input.orderBy !== 'total_pendiente' })
    .range(input.offset, input.offset + input.limit - 1);
  if (input.search) {
    query = query.ilike('organization_name', `%${input.search}%`);
  }
  const { data, error } = await query;
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: (data ?? []).map((r) => ({
      organizationId: r.organization_id,
      organizationName: r.organization_name,
      organizationType: r.organization_type as FacturaResumenNegocio['organizationType'],
      cantidadCargos: r.cantidad_cargos,
      totalPendiente: Number(r.total_pendiente),
      totalFacturado: Number(r.total_facturado),
      totalPagado: Number(r.total_pagado),
    })),
    error: null,
  };
}

export interface FacturasTotalesGlobales {
  totalCpl: number;
  totalSuccessFee: number;
  totalFacturado: number;
  totalPendiente: number;
}

/** Totales globales (vista `facturas_totales_globales`) para los 4 KPIs — independientes de la paginación/búsqueda. */
export async function fetchFacturasTotalesGlobales(): Promise<{ data: FacturasTotalesGlobales | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase.from('facturas_totales_globales').select('*').maybeSingle();
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: {
      totalCpl: Number(data?.total_cpl ?? 0),
      totalSuccessFee: Number(data?.total_success_fee ?? 0),
      totalFacturado: Number(data?.total_facturado ?? 0),
      totalPendiente: Number(data?.total_pendiente ?? 0),
    },
    error: null,
  };
}

/** Detalle de cargos individuales de un negocio — lazy-fetch, solo al expandir su fila en Admin. */
export async function fetchFacturasLedgerByOrganization(
  organizationId: string,
): Promise<{ data: FacturaLedgerRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('facturas_ledger')
    .select('*')
    .eq('organization_id', organizationId)
    .order('fecha', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

// ───── Users (admin onboarding) ─────

export async function fetchAllUsers(): Promise<{
  data: UserRow[] | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

export interface ClienteAdminRow {
  id: string;
  nombre: string;
  email: string;
  ciudad: string | null;
  createdAt: string;
  lastLoginAt: string | null;
}

/** Todos los usuarios rol='Cliente' — para la pestaña Clientes del Admin. */
export async function fetchClientesAdmin(): Promise<{
  data: ClienteAdminRow[] | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('users')
    .select('id, nombre, email, ciudad, created_at, last_login_at')
    .eq('rol', 'Cliente')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: (data ?? []).map((r) => ({
      id: r.id,
      nombre: r.nombre,
      email: r.email,
      ciudad: r.ciudad,
      createdAt: r.created_at,
      lastLoginAt: r.last_login_at,
    })),
    error: null,
  };
}

export async function fetchUsersByStatus(
  status: string,
): Promise<{ data: UserRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('status', status)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

export async function updateUserStatus(
  userId: string,
  status: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('users')
    .update({ status })
    .eq('id', userId)
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) {
    return { error: noRowsError('No se pudo actualizar: el usuario no existe o no tienes permiso (RLS).') };
  }
  return { error: null };
}

// ───── Organizations (admin approval) ─────

/** Resolves the active organization id linked to a user via `memberships`. */
export async function fetchOrganizationIdByUserId(
  userId: string,
): Promise<{ data: string | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('memberships')
    .select('organization_id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .limit(1);
  if (error) return { data: null, error: errMessage(error) };
  return { data: data?.[0]?.organization_id ?? null, error: null };
}

/** Bulk-resolves active organization ids for a list of user ids via `memberships`. */
export async function fetchOrganizationIdsByUserIds(
  userIds: string[],
): Promise<{ data: Map<string, string> | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  if (userIds.length === 0) return { data: new Map(), error: null };
  const { data, error } = await supabase.rpc('resolve_organization_ids_for_users', {
    p_user_ids: userIds,
  });
  if (error) return { data: null, error: errMessage(error) };
  const map = new Map<string, string>();
  for (const row of data ?? []) {
    if (!map.has(row.user_id)) map.set(row.user_id, row.organization_id);
  }
  return { data: map, error: null };
}

export async function updateOrganizationStatus(
  organizationId: string,
  status: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('organizations')
    .update({ status })
    .eq('id', organizationId)
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) {
    return { error: noRowsError('No se pudo actualizar la organización: no existe o no tienes permiso (RLS).') };
  }
  return { error: null };
}

/** Fetches an organization's `metadata` JSON blob (e.g. Comercio onboarding state). */
export async function fetchOrganizationMetadata(
  organizationId: string,
): Promise<{ data: Json | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('organizations')
    .select('metadata')
    .eq('id', organizationId)
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error: errMessage(error) };
  return { data: data?.metadata ?? null, error: null };
}

/** Overwrites an organization's `metadata` JSON blob. */
export async function updateOrganizationMetadata(
  organizationId: string,
  metadata: Json,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('organizations')
    .update({ metadata })
    .eq('id', organizationId)
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) {
    return { error: noRowsError('No se pudo actualizar: la organización no existe o no tienes permiso (RLS).') };
  }
  return { error: null };
}

/** Fetches an organization's `has_trust_seal` flag. */
export async function fetchOrganizationTrustSeal(
  organizationId: string,
): Promise<{ data: boolean | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('organizations')
    .select('has_trust_seal')
    .eq('id', organizationId)
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error: errMessage(error) };
  return { data: data?.has_trust_seal ?? false, error: null };
}

/** Sets an organization's `has_trust_seal` flag. */
export async function updateOrganizationTrustSeal(
  organizationId: string,
  hasTrustSeal: boolean,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('organizations')
    .update({ has_trust_seal: hasTrustSeal })
    .eq('id', organizationId)
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) {
    return { error: noRowsError('No se pudo actualizar: la organización no existe o no tienes permiso (RLS).') };
  }
  return { error: null };
}

/** Fetches an organization's core display fields (name, nit, ciudad). */
export async function fetchOrganizationCore(
  organizationId: string,
): Promise<{
  data: { name: string; nit: string | null; ciudad: string | null } | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('organizations')
    .select('name, nit, ciudad')
    .eq('id', organizationId)
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error: errMessage(error) };
  if (!data) return { data: null, error: null };
  return { data: { name: data.name, nit: data.nit, ciudad: data.ciudad }, error: null };
}

/** Sets an organization's `ciudad` — usado por el onboarding de Comercio (Fase 6). */
export async function updateOrganizationCiudad(
  organizationId: string,
  ciudad: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('organizations')
    .update({ ciudad })
    .eq('id', organizationId)
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) {
    return { error: noRowsError('No se pudo actualizar: la organización no existe o no tienes permiso (RLS).') };
  }
  return { error: null };
}

// ───── Tarifas y planes (Fase 9.2 — capa de facturación) ─────

export type TarifaBancoTipo = 'por_millon_desembolsado' | 'monto_fijo';

export interface TarifaBancoRow {
  id: string;
  clave: string;
  label: string;
  tipoTarifa: TarifaBancoTipo;
  valor: number;
}

/** Fetches the configurable Bancos rate table (editable from Admin). */
export async function fetchTarifasBancos(): Promise<{ data: TarifaBancoRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase.from('tarifas_bancos').select('id, clave, label, tipo_tarifa, valor').order('clave');
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: (data ?? []).map((r) => ({
      id: r.id,
      clave: r.clave,
      label: r.label,
      tipoTarifa: r.tipo_tarifa as TarifaBancoTipo,
      valor: Number(r.valor),
    })),
    error: null,
  };
}

/** Updates a single Bancos rate by its `clave`. */
export async function updateTarifaBanco(clave: string, valor: number): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('tarifas_bancos')
    .update({ valor, updated_at: new Date().toISOString() })
    .eq('clave', clave)
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) return { error: noRowsError('No se pudo actualizar: la tarifa no existe.') };
  return { error: null };
}

function periodoActualYYYYMM(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

export interface TarifaBancoOrganizacionRow {
  clave: string;
  tipoTarifa: TarifaBancoTipo;
  valor: number;
  periodoVigenteDesde: string;
}

/**
 * Trae la versión vigente más reciente de cada tarifa negociada de un banco
 * (periodo_vigente_desde <= mes actual). Se trae todo lo vigente ordenado
 * desc y se queda con la primera ocurrencia de cada clave — mismo patrón de
 * este archivo de nunca usar selects embebidos/vistas para algo tan chico.
 */
export async function fetchTarifasBancoOrganizacion(
  organizationId: string,
): Promise<{ data: TarifaBancoOrganizacionRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('tarifas_bancos_por_organizacion')
    .select('clave, tipo_tarifa, valor, periodo_vigente_desde')
    .eq('banco_organization_id', organizationId)
    .lte('periodo_vigente_desde', periodoActualYYYYMM())
    .order('periodo_vigente_desde', { ascending: false })
    // Desempate: esta tabla es editable in-place (no append-only, sin created_at) —
    // sin esto, dos filas de la misma clave en el mismo periodo quedan en orden no
    // determinista. Mismo fix aplicado hoy a consolidar_facturacion_mensual (backend).
    .order('updated_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  const seen = new Set<string>();
  const result: TarifaBancoOrganizacionRow[] = [];
  for (const r of data ?? []) {
    if (seen.has(r.clave)) continue;
    seen.add(r.clave);
    result.push({
      clave: r.clave,
      tipoTarifa: r.tipo_tarifa as TarifaBancoTipo,
      valor: Number(r.valor),
      periodoVigenteDesde: r.periodo_vigente_desde,
    });
  }
  return { data: result, error: null };
}

/**
 * Guarda una tarifa negociada para un banco específico. Inserta una fila
 * nueva con periodo_vigente_desde = mes actual (nunca pisa una versión
 * vieja — historial versionado, sección 9.3a). Si ya existe una fila para
 * este banco+clave+mes, actualiza esa fila del mes en curso en vez de
 * fallar por duplicado, sin tocar el historial de meses anteriores.
 */
export async function upsertTarifaBancoOrganizacion(
  organizationId: string,
  clave: string,
  tipoTarifa: TarifaBancoTipo,
  valor: number,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from('tarifas_bancos_por_organizacion').upsert(
    {
      banco_organization_id: organizationId,
      clave,
      tipo_tarifa: tipoTarifa,
      valor,
      periodo_vigente_desde: periodoActualYYYYMM(),
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'banco_organization_id,clave,periodo_vigente_desde' },
  );
  return { error: error ? errMessage(error) : null };
}

export interface PlanComercioRow {
  id: string;
  clave: 'solo_pauta' | 'balanceado' | 'solo_resultados';
  label: string;
  cpl: number;
  comisionPct: number;
}

/** Fetches the 3 configurable Comercios negotiation plans (editable from Admin). */
export async function fetchPlanesComercio(): Promise<{ data: PlanComercioRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase.from('planes_comercio').select('id, clave, label, cpl, comision_pct').order('cpl', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: (data ?? []).map((r) => ({
      id: r.id,
      clave: r.clave as PlanComercioRow['clave'],
      label: r.label,
      cpl: Number(r.cpl),
      comisionPct: Number(r.comision_pct),
    })),
    error: null,
  };
}

/** Updates a single Comercio plan's CPL and commission rate by its `clave`. */
export async function updatePlanComercio(clave: string, cpl: number, comisionPct: number): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('planes_comercio')
    .update({ cpl, comision_pct: comisionPct, updated_at: new Date().toISOString() })
    .eq('clave', clave)
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) return { error: noRowsError('No se pudo actualizar: el plan no existe.') };
  return { error: null };
}

/** Fetches a Comercio organization's negotiation plan (defaults to 'balanceado' if unset). */
export async function fetchOrganizationPlanNegociacion(
  organizationId: string,
): Promise<{ data: string | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('organizations')
    .select('plan_negociacion')
    .eq('id', organizationId)
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error: errMessage(error) };
  return { data: data?.plan_negociacion ?? 'balanceado', error: null };
}

// ───── Tarifas negociadas por comercio (append-only) ─────

export interface ComercioSelloRow {
  id: string;
  name: string;
}

/** Comercios con Sello de Confianza activo — fuente del selector en Tarifas y Planes. */
export async function fetchComerciosConSelloActivo(): Promise<{
  data: ComercioSelloRow[] | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('type', 'comercio')
    .eq('has_trust_seal', true)
    .eq('status', 'approved')
    .order('name');
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

/** CPL vigente real para un comercio — RPC: prioriza negociación vigente, fallback al plan global. */
export async function resolverCplComercio(
  comercioId: string,
): Promise<{ data: number | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase.rpc('resolver_cpl_comercio', { p_comercio_id: comercioId });
  if (error) return { data: null, error: errMessage(error) };
  return { data: Number(data), error: null };
}

export interface TarifaComercioNegociadaRow {
  id: string;
  comercioOrganizationId: string;
  cpl: number;
  comisionPct: number;
  periodoVigenteDesde: string;
  creadoPor: string;
  creadoPorNombre: string | null;
  motivo: string | null;
  createdAt: string;
  /** Clave de planes_comercio si vino de una plantilla (ej. 'balanceado'), NULL si fue un valor personalizado. */
  planOrigen: string | null;
}

/** Historial completo de tarifas negociadas de un comercio, de más reciente a más antigua por periodo de vigencia. */
export async function fetchTarifasNegociadasComercio(
  comercioId: string,
): Promise<{ data: TarifaComercioNegociadaRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('tarifas_comercio_negociadas')
    .select('id, comercio_organization_id, cpl, comision_pct, periodo_vigente_desde, creado_por, motivo, created_at, plan_origen')
    .eq('comercio_organization_id', comercioId)
    // Desempate por created_at: dos filas pueden compartir periodo_vigente_desde
    // (mismo mes) y sin esto Postgres no garantiza cuál sale primero.
    .order('periodo_vigente_desde', { ascending: false })
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  const rows = data ?? [];

  const creadorIds = Array.from(new Set(rows.map((r) => r.creado_por)));
  const nombreById = new Map<string, string>();
  if (creadorIds.length > 0) {
    const { data: creadores } = await supabase.from('users').select('id, nombre').in('id', creadorIds);
    for (const c of creadores ?? []) nombreById.set(c.id, c.nombre);
  }

  return {
    data: rows.map((r) => ({
      id: r.id,
      comercioOrganizationId: r.comercio_organization_id,
      cpl: Number(r.cpl),
      // La columna guarda una fracción (CHECK 0-1); el resto del código (planes_comercio,
      // UI) trata comisionPct como puntos porcentuales enteros (2.25 = 2.25%) — se normaliza aquí.
      comisionPct: Number(r.comision_pct) * 100,
      periodoVigenteDesde: r.periodo_vigente_desde,
      creadoPor: r.creado_por,
      creadoPorNombre: nombreById.get(r.creado_por) ?? null,
      motivo: r.motivo,
      createdAt: r.created_at,
      planOrigen: r.plan_origen,
    })),
    error: null,
  };
}

/** Asigna una nueva tarifa negociada — SIEMPRE un INSERT nuevo, la tabla es append-only (sin política UPDATE). */
export async function insertTarifaComercioNegociada(input: {
  comercioOrganizationId: string;
  cpl: number;
  comisionPct: number;
  periodoVigenteDesde: string;
  creadoPor: string;
  motivo?: string | null;
  /** Clave de planes_comercio si esta tarifa viene de aplicar una plantilla; NULL si es un valor personalizado. */
  planOrigen?: string | null;
}): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('tarifas_comercio_negociadas')
    .insert({
      comercio_organization_id: input.comercioOrganizationId,
      cpl: input.cpl,
      // input.comisionPct llega como puntos porcentuales enteros (2.25 = 2.25%); la
      // columna en BD tiene CHECK 0-1 (fracción) — se convierte aquí, no en la UI.
      comision_pct: input.comisionPct / 100,
      periodo_vigente_desde: input.periodoVigenteDesde,
      creado_por: input.creadoPor,
      motivo: input.motivo ?? null,
      plan_origen: input.planOrigen ?? null,
    })
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) {
    return { error: noRowsError('No se pudo asignar la tarifa (posible bloqueo de RLS).') };
  }
  return { error: null };
}

/**
 * Para una lista de comercios, resuelve cuáles tienen una tarifa negociada
 * VIGENTE hoy — una sola consulta (no N+1). Usado por el panel de Comercios
 * para avisar que el CPL/comisión mostrado puede venir de una negociación,
 * no del plan global.
 */
export async function fetchTarifasVigentesPorComercios(
  organizationIds: string[],
): Promise<{ data: Map<string, TarifaComercioNegociadaRow> | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  if (organizationIds.length === 0) return { data: new Map(), error: null };
  const periodoActual = new Date().toISOString().slice(0, 7);
  const { data, error } = await supabase
    .from('tarifas_comercio_negociadas')
    .select('id, comercio_organization_id, cpl, comision_pct, periodo_vigente_desde, creado_por, motivo, created_at, plan_origen')
    .in('comercio_organization_id', organizationIds)
    .lte('periodo_vigente_desde', periodoActual)
    .order('comercio_organization_id', { ascending: true })
    .order('periodo_vigente_desde', { ascending: false })
    // Desempate: sin esto, dos filas del mismo comercio en el mismo periodo
    // quedan en orden no determinista y "la vigente" podría variar entre cargas.
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };

  const vigentePorComercio = new Map<string, TarifaComercioNegociadaRow>();
  for (const r of data ?? []) {
    if (vigentePorComercio.has(r.comercio_organization_id)) continue; // ya tiene la más reciente (ordenado desc)
    vigentePorComercio.set(r.comercio_organization_id, {
      id: r.id,
      comercioOrganizationId: r.comercio_organization_id,
      cpl: Number(r.cpl),
      comisionPct: Number(r.comision_pct) * 100,
      periodoVigenteDesde: r.periodo_vigente_desde,
      creadoPor: r.creado_por,
      creadoPorNombre: null,
      motivo: r.motivo,
      createdAt: r.created_at,
      planOrigen: r.plan_origen,
    });
  }
  return { data: vigentePorComercio, error: null };
}

/**
 * Resuelve la comisión % vigente para un comercio — misma prioridad que
 * resolver_cpl_comercio (RPC): negociación vigente > plan global. A diferencia
 * del CPL, no existe un RPC para comisión, así que se resuelve aquí con la
 * misma lógica (evita drift entre ambas resoluciones).
 */
export async function resolverComisionComercio(
  comercioId: string,
): Promise<{ data: number | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const periodoActual = new Date().toISOString().slice(0, 7);
  const { data: negociadas, error } = await supabase
    .from('tarifas_comercio_negociadas')
    .select('comision_pct, periodo_vigente_desde')
    .eq('comercio_organization_id', comercioId)
    .lte('periodo_vigente_desde', periodoActual)
    .order('periodo_vigente_desde', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1);
  if (error) return { data: null, error: errMessage(error) };
  if (negociadas && negociadas.length > 0) {
    return { data: Number(negociadas[0].comision_pct) * 100, error: null };
  }
  const { data: planClave } = await fetchOrganizationPlanNegociacion(comercioId);
  const { data: planes } = await fetchPlanesComercio();
  const plan = (planes ?? []).find((p) => p.clave === (planClave ?? 'balanceado'));
  return { data: plan?.comisionPct ?? 0, error: null };
}

/** Bulk-fetches display fields (name, type, plan_negociacion) for a list of organization ids. */
export async function fetchOrganizationsByIds(
  organizationIds: string[],
): Promise<{ data: { id: string; name: string; type: string; planNegociacion: string | null }[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  if (organizationIds.length === 0) return { data: [], error: null };
  const { data, error } = await supabase.from('organizations').select('id, name, type, plan_negociacion').in('id', organizationIds);
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: (data ?? []).map((r) => ({ id: r.id, name: r.name, type: r.type, planNegociacion: r.plan_negociacion })),
    error: null,
  };
}

// ───── Negocios de Interés / Señales de interés (Sección 9.3 — negocios no registrados) ─────

export interface NegocioCuradoRow {
  id: string;
  sector: 'banco' | 'constructora' | 'comercio';
  nombre: string;
  ciudad: string | null;
}

/** Lista de Negocios de Interés (editable desde Admin) — negocios grandes conocidos, no registrados aún. */
export async function fetchNegociosCuradosBySector(
  sector: 'banco' | 'constructora' | 'comercio',
): Promise<{ data: NegocioCuradoRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('negocios_curados')
    .select('id, sector, nombre, ciudad')
    .eq('sector', sector)
    .eq('activo', true)
    .order('nombre', { ascending: true });
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: (data ?? []).map((r) => ({
      id: r.id,
      sector: r.sector as NegocioCuradoRow['sector'],
      nombre: r.nombre,
      ciudad: r.ciudad,
    })),
    error: null,
  };
}

export interface NegocioCuradoAdminRow extends NegocioCuradoRow {
  activo: boolean;
  createdAt: string;
}

/** Todos los Negocios de Interés, incluyendo inactivos — solo para el panel Admin. */
export async function fetchTodosLosNegociosCurados(): Promise<{ data: NegocioCuradoAdminRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('negocios_curados')
    .select('id, sector, nombre, ciudad, activo, created_at')
    .order('sector', { ascending: true })
    .order('nombre', { ascending: true });
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: (data ?? []).map((r) => ({
      id: r.id,
      sector: r.sector as NegocioCuradoRow['sector'],
      nombre: r.nombre,
      ciudad: r.ciudad,
      activo: r.activo,
      createdAt: r.created_at,
    })),
    error: null,
  };
}

export interface InsertNegocioCuradoInput {
  sector: 'banco' | 'constructora' | 'comercio';
  nombre: string;
  ciudad?: string;
}

/** Agrega un Negocio de Interés — Admin. La validación de ciudad obligatoria (constructora/comercio) vive en la UI. */
export async function insertNegocioCurado(
  input: InsertNegocioCuradoInput,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from('negocios_curados').insert({
    id: crypto.randomUUID(),
    sector: input.sector,
    nombre: input.nombre,
    ciudad: input.ciudad ?? null,
  });
  return { error: error ? errMessage(error) : null };
}

/** Soft-delete/reactivación — activo=false oculta el negocio del selector de clientes sin borrar señales históricas. */
export async function toggleNegocioCuradoActivo(
  id: string,
  activo: boolean,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('negocios_curados')
    .update({ activo })
    .eq('id', id)
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) {
    return { error: noRowsError('No se pudo actualizar: el negocio no existe o no tienes permiso (RLS).') };
  }
  return { error: null };
}

export interface InsertSenalInteresInput {
  clienteId: string;
  clienteNombre: string;
  clienteTelefono: string;
  sector: 'banco' | 'constructora' | 'comercio';
  /** Obligatorio para sector='banco'; opcional para constructora/comercio (señal genérica sin negocio específico). */
  negocioDeseado?: string;
  productoBancario?: string;
  tipoVivienda?: string;
  categoria?: string;
  subcategoria?: string;
  ciudad?: string;
}

/** Crea una señal de interés — el cliente eligió un Negocio de Interés (no registrado) o registró interés genérico por categoría, no un lead real. */
export async function insertSenalInteres(
  input: InsertSenalInteresInput,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from('senales_interes').insert({
    id: crypto.randomUUID(),
    cliente_id: input.clienteId,
    cliente_nombre: input.clienteNombre,
    cliente_telefono: input.clienteTelefono,
    sector: input.sector,
    negocio_deseado: input.negocioDeseado ?? null,
    producto_bancario: input.productoBancario ?? null,
    tipo_vivienda: input.tipoVivienda ?? null,
    categoria: input.categoria ?? null,
    subcategoria: input.subcategoria ?? null,
    ciudad: input.ciudad ?? null,
  });
  return { error: error ? errMessage(error) : null };
}

export interface SenalInteresDisplay {
  id: string;
  sector: 'banco' | 'constructora' | 'comercio';
  negocioDeseado: string | null;
  clienteNombre: string;
  clienteTelefono: string;
  productoBancario: string | null;
  tipoVivienda: string | null;
  categoria: string | null;
  subcategoria: string | null;
  ciudad: string | null;
  createdAt: string;
}

function mapSenalInteresRow(r: {
  id: string;
  sector: string;
  negocio_deseado: string | null;
  cliente_nombre: string;
  cliente_telefono: string;
  producto_bancario: string | null;
  tipo_vivienda: string | null;
  categoria: string | null;
  subcategoria: string | null;
  ciudad: string | null;
  created_at: string;
}): SenalInteresDisplay {
  return {
    id: r.id,
    sector: r.sector as SenalInteresDisplay['sector'],
    negocioDeseado: r.negocio_deseado,
    clienteNombre: r.cliente_nombre,
    clienteTelefono: r.cliente_telefono,
    productoBancario: r.producto_bancario,
    tipoVivienda: r.tipo_vivienda,
    categoria: r.categoria,
    subcategoria: r.subcategoria,
    ciudad: r.ciudad,
    createdAt: r.created_at,
  };
}

const SENAL_INTERES_SELECT = 'id, sector, negocio_deseado, cliente_nombre, cliente_telefono, producto_bancario, tipo_vivienda, categoria, subcategoria, ciudad, created_at';

/** Señales de interés propias de un cliente — para su historial en el portal. */
export async function fetchSenalesInteresByCliente(
  clienteId: string,
): Promise<{ data: SenalInteresDisplay[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('senales_interes')
    .select(SENAL_INTERES_SELECT)
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: (data ?? []).map(mapSenalInteresRow), error: null };
}

/** Todas las señales de interés — Admin, panel "Clientes en Espera". */
export async function fetchTodasLasSenalesInteres(): Promise<{ data: SenalInteresDisplay[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('senales_interes')
    .select(SENAL_INTERES_SELECT)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: (data ?? []).map(mapSenalInteresRow), error: null };
}

/** Nombre y teléfono reales del cliente — necesario para snapshot en senales_interes (currentUser.telefono no siempre está poblado). */
export async function fetchClienteContactInfo(
  clienteId: string,
): Promise<{ data: { nombre: string; telefono: string } | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('users')
    .select('nombre, telefono')
    .eq('id', clienteId)
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error: errMessage(error) };
  return { data: { nombre: data?.nombre ?? '', telefono: data?.telefono ?? '' }, error: null };
}

/**
 * Perfil real del cliente para el portal — first_name/nombre (poblados por
 * registrar_b2c_completo) para el saludo, y ciudad/score_estimado para el
 * matching de ofertas/proyectos. ciudad y scoreEstimado pueden venir null en
 * cuentas antiguas que se registraron antes de que esos campos existieran —
 * los callers deben tratar null como "dato no disponible", nunca inventar un
 * valor por defecto.
 */
export async function fetchClientePerfil(
  clienteId: string,
): Promise<{
  data: { nombre: string; firstName: string | null; ciudad: string | null; scoreEstimado: number | null; telefono: string | null } | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('users')
    .select('nombre, first_name, ciudad, score_estimado, telefono')
    .eq('id', clienteId)
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error: errMessage(error) };
  if (!data) return { data: null, error: null };
  return {
    data: {
      nombre: data.nombre,
      firstName: data.first_name,
      ciudad: data.ciudad,
      scoreEstimado: data.score_estimado,
      telefono: data.telefono,
    },
    error: null,
  };
}

// ───── Proyectos (constructoras) ─────

/** Fetches only the projects owned by this constructora (scoped by `constructora_id`, the constructora's own user id). */
export async function fetchProyectos(
  constructoraId: string,
): Promise<{ data: ProyectoRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('proyectos')
    .select('*')
    .eq('constructora_id', constructoraId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

export interface ProyectosMatchInput {
  ciudad: string;
  estrato?: number;
  presupuestoMin?: number;
  presupuestoMax?: number;
}

/**
 * Tolerancia de match para estrato: un proyecto hace match si su rango
 * [estrato_min, estrato_max] se solapa con [estrato-1, estrato+1] del cliente.
 */
const ESTRATO_TOLERANCIA = 1;

/**
 * Finds active projects (across all constructoras) matching a client's
 * ciudad/estrato/presupuesto — la consulta central detrás de Me Interesa →
 * Constructoras (Fase 5). Ciudad es filtro exacto obligatorio; estrato es un
 * filtro suave con tolerancia de ±1; comuna es solo informativa y no filtra
 * aquí (se muestra al ver el lead).
 */
export async function fetchProyectosMatch(
  input: ProyectosMatchInput,
): Promise<{ data: ProyectoRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  let query = supabase
    .from('proyectos')
    .select('*')
    .eq('ciudad', input.ciudad)
    .eq('estado', 'activo');

  if (input.estrato !== undefined) {
    query = query
      .lte('estrato_min', input.estrato + ESTRATO_TOLERANCIA)
      .gte('estrato_max', input.estrato - ESTRATO_TOLERANCIA);
  }
  if (input.presupuestoMax !== undefined) {
    query = query.lte('precio_min', input.presupuestoMax);
  }
  if (input.presupuestoMin !== undefined) {
    query = query.gte('precio_max', input.presupuestoMin);
  }

  const { data, error } = await query.order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

export interface InsertProyectoInput {
  id: string;
  constructoraId: string;
  constructoraNombre: string;
  nombre: string;
  ciudad: string;
  comuna?: string;
  estratoMin?: number;
  estratoMax?: number;
  tipoVivienda: string;
  unidades: number;
  precioMin: number;
  precioMax: number;
  estado: string;
  valorSeparacion?: number;
  cuotaInicialPct?: number;
  plazoCuotaInicialMeses?: number;
  bonoComercial?: string;
}

/** Creates a `proyectos` row — usado por CrearProyectoDialog.tsx (Fase 5). */
export async function insertProyecto(
  input: InsertProyectoInput,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from('proyectos').insert({
    id: input.id,
    constructora_id: input.constructoraId,
    constructora_nombre: input.constructoraNombre,
    nombre: input.nombre,
    ciudad: input.ciudad,
    comuna: input.comuna ?? null,
    estrato_min: input.estratoMin ?? null,
    estrato_max: input.estratoMax ?? null,
    tipo_vivienda: input.tipoVivienda,
    unidades: input.unidades,
    precio_min: input.precioMin,
    precio_max: input.precioMax,
    estado: input.estado,
    valor_separacion: input.valorSeparacion ?? 0,
    cuota_inicial_pct: input.cuotaInicialPct ?? 0,
    plazo_cuota_inicial_meses: input.plazoCuotaInicialMeses ?? 0,
    bono_comercial: input.bonoComercial ?? null,
  });
  return { error: error ? errMessage(error) : null };
}

// ───── Leads inmobiliarios ─────

/** Fetches only the leads owned by this constructora (scoped by `constructora_id`, the constructora's own user id). */
export async function fetchLeads(
  constructoraId: string,
): Promise<{ data: LeadRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('leads')
    .select('*')
    .eq('constructora_id', constructoraId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

export interface UpsertLeadEstadoInput {
  id: string;
  clienteRef: string;
  clienteNombre: string;
  proyectoId: string;
  constructoraId: string;
  status: string;
  asesorAsignado: string;
  canalContacto: string;
}

export async function upsertLeadEstado(
  input: UpsertLeadEstadoInput,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from('leads').upsert(
    {
      id: input.id,
      cliente_ref: input.clienteRef,
      cliente_nombre: input.clienteNombre,
      proyecto_id: input.proyectoId || null,
      constructora_id: input.constructoraId || null,
      estado: input.status,
      asesor_asignado: input.asesorAsignado,
      canal_contacto: input.canalContacto,
    },
    { onConflict: 'id' },
  );
  return { error: error ? errMessage(error) : null };
}

// ───── Me Interesa (solicitudes + destinatarios) ─────

export interface MeInteresaDestinatarioInput {
  organizationId: string;
  type: 'banco' | 'constructora' | 'comercio';
}

export interface InsertMeInteresaSolicitudInput {
  id: string;
  clienteId: string;
  origen: 'banco' | 'constructora' | 'comercio';
  productoBancario?: string;
  tipoVivienda?: string;
  comuna?: string;
  ciudad?: string;
  estratoMin?: number;
  estratoMax?: number;
  presupuestoMin?: number;
  presupuestoMax?: number;
  categoria?: string;
  subcategoria?: string;
}

/** Creates a `me_interesa_solicitudes` row. */
export async function insertMeInteresaSolicitud(
  input: InsertMeInteresaSolicitudInput,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from('me_interesa_solicitudes').insert({
    id: input.id,
    cliente_id: input.clienteId,
    origen: input.origen,
    producto_bancario: input.productoBancario ?? null,
    tipo_vivienda: input.tipoVivienda ?? null,
    comuna: input.comuna ?? null,
    ciudad: input.ciudad ?? null,
    estrato_min: input.estratoMin ?? null,
    estrato_max: input.estratoMax ?? null,
    presupuesto_min: input.presupuestoMin ?? null,
    presupuesto_max: input.presupuestoMax ?? null,
    categoria: input.categoria ?? null,
    subcategoria: input.subcategoria ?? null,
  });
  return { error: error ? errMessage(error) : null };
}

/** Bulk-inserts the destinatario rows for a solicitud. */
export async function insertMeInteresaDestinatarios(
  solicitudId: string,
  destinatarios: MeInteresaDestinatarioInput[],
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  if (destinatarios.length === 0) return { error: null };
  const rows = destinatarios.map((d) => ({
    id: crypto.randomUUID(),
    solicitud_id: solicitudId,
    organization_id: d.organizationId,
    destinatario_type: d.type,
  }));
  const { error } = await supabase.from('me_interesa_destinatarios').insert(rows);
  if (error) return { error: errMessage(error) };

  // Best-effort: cada destinatario real genera un cargo de CPL (sección 9.2).
  // El monto lo calcula registrar_cargo_cpl (SECURITY DEFINER) en Postgres —
  // el cliente nunca envía ni calcula el monto.
  await Promise.all(
    rows.map((r) =>
      supabase!.rpc('registrar_cargo_cpl', { p_destinatario_id: r.id }).then(({ error: cplError }) => {
        if (cplError) console.error('No se pudo generar el cargo de CPL:', cplError.message);
      }),
    ),
  );

  return { error: null };
}

/**
 * Bancos aprobados para el selector de Banca Privada — vía RPC
 * bancos_aprobados_publicos() (SECURITY DEFINER, expone solo id+name) en vez
 * de un SELECT directo sobre organizations, que trae columnas con PII
 * (nit, representante_legal) y se lee desde pantallas sin sesión
 * (registro, login). Callable por anon y authenticated.
 */
export async function fetchBancosAprobados(): Promise<{
  data: { id: string; name: string }[] | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase.rpc('bancos_aprobados_publicos');
  if (error) return { data: null, error: errMessage(error) };
  return { data: (data ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)), error: null };
}

export interface ComerciosMatchInput {
  ciudad?: string;
  categoria: string;
}

/**
 * Finds approved comercios matching a client's ciudad + categoría exacta —
 * la consulta central detrás de Me Interesa → Comercios (Fase 6). El store
 * (no esta función) aplica la preferencia por subcategoría, el desempate por
 * Sello de Confianza, y el sorteo final sobre este resultado.
 */
export async function fetchComerciosMatch(
  input: ComerciosMatchInput,
): Promise<{
  data: { id: string; name: string; especialidades: string[]; hasTrustSeal: boolean }[] | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  let query = supabase
    .from('organizations')
    .select('id, name, metadata, has_trust_seal')
    .eq('type', 'comercio')
    .eq('status', 'approved')
    .eq('metadata->>categoria', input.categoria);
  if (input.ciudad) query = query.eq('ciudad', input.ciudad);
  const { data, error } = await query;
  if (error) return { data: null, error: errMessage(error) };
  const result = (data ?? []).map((row) => {
    const metadata = (row.metadata ?? {}) as Record<string, unknown>;
    const especialidades = Array.isArray(metadata.especialidades)
      ? (metadata.especialidades as string[])
      : [];
    return {
      id: row.id,
      name: row.name,
      especialidades,
      hasTrustSeal: row.has_trust_seal,
    };
  });
  return { data: result, error: null };
}

// ───── Buscador de Comercios (cliente) ─────

export interface ComercioBuscadorRow {
  id: string;
  name: string;
  ciudad: string | null;
  categoria: string | null;
  afiliadoDesde: string;
  codigoNeggo: string;
}

/** Busca comercios con Sello de Confianza activo por nombre — RPC SECURITY DEFINER, solo devuelve verificados. */
export async function buscarComerciosVerificados(
  termino: string,
): Promise<{ data: ComercioBuscadorRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase.rpc('buscar_comercios_verificados', { p_termino: termino });
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: (data ?? []).map((r) => ({
      id: r.id,
      name: r.name,
      ciudad: r.ciudad,
      categoria: r.categoria,
      afiliadoDesde: r.afiliado_desde,
      codigoNeggo: r.codigo_neggo,
    })),
    error: null,
  };
}

/** Registra una búsqueda sin resultados — fire-and-forget, nunca debe bloquear la UI del cliente. */
export async function registrarBusquedaSinMatch(input: {
  termino: string;
  ciudad?: string | null;
  clienteId?: string | null;
}): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from('busquedas_sin_match').insert({
    termino: input.termino,
    ciudad: input.ciudad ?? null,
    cliente_id: input.clienteId ?? null,
  });
  if (error) return { error: errMessage(error) };
  return { error: null };
}

/** Registra el contacto de un cliente a un comercio verificado — RPC SECURITY DEFINER (valida Sello activo y cobra el CPL del plan). */
export async function registrarContactoComercio(input: {
  comercioId: string;
  descripcion: string;
  nombre: string;
  telefono: string;
  whatsapp?: string | null;
}): Promise<{ data: { contactoId: string; codigoVerificacion: string } | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data: contactoId, error } = await supabase.rpc('registrar_contacto_comercio', {
    p_comercio_id: input.comercioId,
    p_descripcion: input.descripcion,
    p_nombre: input.nombre,
    p_telefono: input.telefono,
    p_whatsapp: input.whatsapp ?? null,
  });
  if (error) return { data: null, error: errMessage(error) };
  // El trigger set_codigo_verificacion lo genera en el INSERT — el RPC solo
  // devuelve el id, así que lo recuperamos con una lectura propia (RLS ya
  // permite cliente_id = auth.uid()).
  const { data: row, error: fetchError } = await supabase
    .from('comercio_contactos')
    .select('codigo_verificacion')
    .eq('id', contactoId)
    .limit(1)
    .maybeSingle();
  if (fetchError || !row) {
    return {
      data: { contactoId, codigoVerificacion: '' },
      error: fetchError ? errMessage(fetchError) : 'No se pudo recuperar el código de verificación.',
    };
  }
  return { data: { contactoId, codigoVerificacion: row.codigo_verificacion }, error: null };
}

// ───── Solicitudes de Clientes (comercio) ─────

export interface ComercioContactoRow {
  id: string;
  clienteId: string;
  nombre: string;
  telefono: string;
  whatsapp: string | null;
  descripcion: string;
  status: 'pendiente' | 'atendido';
  createdAt: string;
  codigoVerificacion: string;
}

/** Solicitudes de clientes recibidas por un comercio a través del Buscador de Comercios. */
export async function fetchComercioContactos(
  comercioId: string,
): Promise<{ data: ComercioContactoRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('comercio_contactos')
    .select('id, cliente_id, nombre, telefono, whatsapp, descripcion, status, created_at, codigo_verificacion')
    .eq('comercio_id', comercioId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: (data ?? []).map((r) => ({
      id: r.id,
      clienteId: r.cliente_id,
      nombre: r.nombre,
      telefono: r.telefono,
      whatsapp: r.whatsapp,
      descripcion: r.descripcion,
      status: r.status as 'pendiente' | 'atendido',
      createdAt: r.created_at,
      codigoVerificacion: r.codigo_verificacion,
    })),
    error: null,
  };
}

/** Teléfono verificado de una organización (p. ej. para construir un link wa.me confiable, nunca un campo libre). */
export async function fetchOrganizationTelefono(
  organizationId: string,
): Promise<{ data: string | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('organizations')
    .select('telefono')
    .eq('id', organizationId)
    .limit(1)
    .maybeSingle();
  if (error) return { data: null, error: errMessage(error) };
  return { data: data?.telefono ?? null, error: null };
}

// ───── Mis Solicitudes (cliente, Buscador de Comercios) ─────

export interface ClienteComercioContactoRow {
  id: string;
  comercioId: string;
  descripcion: string;
  codigoVerificacion: string;
  status: 'pendiente' | 'atendido';
  createdAt: string;
}

/** Historial de contactos que un cliente ha iniciado desde el Buscador de Comercios — para recuperar el código de verificación después. */
export async function fetchClienteComercioContactos(
  clienteId: string,
): Promise<{ data: ClienteComercioContactoRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('comercio_contactos')
    .select('id, comercio_id, descripcion, codigo_verificacion, status, created_at')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: (data ?? []).map((r) => ({
      id: r.id,
      comercioId: r.comercio_id,
      descripcion: r.descripcion,
      codigoVerificacion: r.codigo_verificacion,
      status: r.status as 'pendiente' | 'atendido',
      createdAt: r.created_at,
    })),
    error: null,
  };
}

/** Marca una solicitud de cliente como atendida. UPDATE directo — RLS ya restringe a comercio_id = auth.uid(). */
export async function marcarComercioContactoAtendido(
  id: string,
  comercioId: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('comercio_contactos')
    .update({ status: 'atendido' })
    .eq('id', id)
    .eq('comercio_id', comercioId)
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) {
    return { error: 'No se pudo actualizar la solicitud (posible bloqueo de RLS).' };
  }
  return { error: null };
}

/** Pipeline de estados real de un lead de Me Interesa (sección 9.1 del roadmap). */
export type MeInteresaPipelineEstado =
  | 'pendiente'
  | 'contactado'
  | 'en_proceso'
  | 'documentacion'
  | 'viable'
  | 'aprobado'
  | 'desembolsado'
  | 'perdido'
  | 'vendido'
  | 'no_interesado';

/** Display-friendly shape for a bank's own Me Interesa leads. */
export interface MeInteresaLeadDisplay {
  destinatarioId: string;
  solicitudId: string;
  origen: 'banco' | 'constructora' | 'comercio';
  contactado: boolean;
  estadoPipeline: MeInteresaPipelineEstado;
  proximaGestionAt: string | null;
  /** Monto de venta / desembolso reportado por el negocio al cerrar el lead (sección 9.2). */
  montoCierre: number | null;
  createdAt: string;
  productoBancario: string | null;
  tipoVivienda: string | null;
  ciudad: string | null;
  comuna: string | null;
  estratoMin: number | null;
  estratoMax: number | null;
  presupuestoMin: number | null;
  presupuestoMax: number | null;
  categoria: string | null;
  subcategoria: string | null;
  clienteNombre: string;
  clienteTelefono: string;
  /** true si el cliente ya declaró tener al menos un producto con este banco. */
  esClienteBanco: boolean;
  /** Score estimado (0-1000) derivado del rango de ingresos autodeclarado en el registro. NULL para clientes registrados antes de este campo. */
  scoreEstimado: number | null;
  /** Rango de ingresos autodeclarado en el registro B2C. NULL para clientes registrados antes de este campo. */
  rangoIngresos: string | null;
}

/**
 * Fetches this organization's own Me Interesa leads. RLS already restricts this
 * to rows the caller's organization owns — this function does 3 flat queries
 * and merges them client-side, following this file's existing convention of
 * never using embedded/joined selects.
 */
export async function fetchMeInteresaLeadsByOrganization(
  organizationId: string,
): Promise<{ data: MeInteresaLeadDisplay[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };

  const { data: destinatarios, error: destError } = await supabase
    .from('me_interesa_destinatarios')
    .select('id, solicitud_id, contactado, estado_pipeline, proxima_gestion_at, monto_cierre, created_at')
    .eq('organization_id', organizationId)
    .order('created_at', { ascending: false });
  if (destError) return { data: null, error: errMessage(destError) };
  if (!destinatarios || destinatarios.length === 0) return { data: [], error: null };

  const solicitudIds = destinatarios.map((d) => d.solicitud_id);
  const { data: solicitudes, error: solError } = await supabase
    .from('me_interesa_solicitudes')
    .select('id, cliente_id, origen, producto_bancario, tipo_vivienda, ciudad, comuna, estrato_min, estrato_max, presupuesto_min, presupuesto_max, categoria, subcategoria')
    .in('id', solicitudIds);
  if (solError) return { data: null, error: errMessage(solError) };

  const clienteIds = Array.from(new Set((solicitudes ?? []).map((s) => s.cliente_id)));
  const { data: clientes, error: cliError } = await supabase
    .from('users')
    .select('id, nombre, telefono, score_estimado, rango_ingresos')
    .in('id', clienteIds);
  if (cliError) return { data: null, error: errMessage(cliError) };

  const solicitudById = new Map((solicitudes ?? []).map((s) => [s.id, s]));
  const clienteById = new Map((clientes ?? []).map((c) => [c.id, c]));

  const { data: bancoProductos, error: bpError } = await supabase
    .from('cliente_banco_productos')
    .select('cliente_id')
    .eq('organization_id', organizationId)
    .in('cliente_id', clienteIds);
  if (bpError) return { data: null, error: errMessage(bpError) };
  const clientesBancoSet = new Set((bancoProductos ?? []).map((b) => b.cliente_id));

  const result: MeInteresaLeadDisplay[] = destinatarios.map((d) => {
    const solicitud = solicitudById.get(d.solicitud_id);
    const cliente = solicitud ? clienteById.get(solicitud.cliente_id) : undefined;
    return {
      destinatarioId: d.id,
      solicitudId: d.solicitud_id,
      origen: (solicitud?.origen as MeInteresaLeadDisplay['origen']) ?? 'banco',
      contactado: d.contactado,
      estadoPipeline: (d.estado_pipeline as MeInteresaPipelineEstado) ?? 'pendiente',
      proximaGestionAt: d.proxima_gestion_at,
      montoCierre: d.monto_cierre,
      createdAt: d.created_at,
      productoBancario: solicitud?.producto_bancario ?? null,
      tipoVivienda: solicitud?.tipo_vivienda ?? null,
      ciudad: solicitud?.ciudad ?? null,
      comuna: solicitud?.comuna ?? null,
      estratoMin: solicitud?.estrato_min ?? null,
      estratoMax: solicitud?.estrato_max ?? null,
      presupuestoMin: solicitud?.presupuesto_min ?? null,
      presupuestoMax: solicitud?.presupuesto_max ?? null,
      categoria: solicitud?.categoria ?? null,
      subcategoria: solicitud?.subcategoria ?? null,
      clienteNombre: cliente?.nombre ?? 'Cliente',
      clienteTelefono: cliente?.telefono ?? '',
      esClienteBanco: solicitud ? clientesBancoSet.has(solicitud.cliente_id) : false,
      scoreEstimado: cliente?.score_estimado ?? null,
      rangoIngresos: cliente?.rango_ingresos ?? null,
    };
  });

  return { data: result, error: null };
}

/**
 * Mueve un lead de Me Interesa a un nuevo estado del pipeline (sección 9.1).
 * RLS restringe el UPDATE a filas cuyo organization_id pertenece a la
 * organización del caller — ver política en supabase/migrations/.
 */
export async function updateMeInteresaPipelineEstado(
  destinatarioId: string,
  estado: MeInteresaPipelineEstado,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('me_interesa_destinatarios')
    .update({ estado_pipeline: estado })
    .eq('id', destinatarioId)
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) {
    return { error: noRowsError('No se pudo actualizar: el lead no existe o no tienes permiso (RLS).') };
  }
  return { error: null };
}

/**
 * Programa (o limpia, pasando `null`) la próxima fecha de gestión de un lead.
 */
export async function updateMeInteresaProximaGestion(
  destinatarioId: string,
  proximaGestionAt: string | null,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('me_interesa_destinatarios')
    .update({ proxima_gestion_at: proximaGestionAt })
    .eq('id', destinatarioId)
    .select('id');
  if (error) return { error: errMessage(error) };
  if (!data || data.length === 0) {
    return { error: noRowsError('No se pudo actualizar: el lead no existe o no tienes permiso (RLS).') };
  }
  return { error: null };
}

export interface CierreLeadInput {
  destinatarioId: string;
  montoCierre: number;
  franquiciaTarjeta?: 'visa' | 'mastercard' | 'amex' | null;
}

/**
 * Mueve un lead a su estado de cierre y genera el Success Fee/comisión
 * correspondiente (sección 9.2). El estado destino y el monto del cargo los
 * resuelve íntegramente registrar_cierre_lead (SECURITY DEFINER) — el
 * cliente solo reporta el monto de cierre autodeclarado (ver 9.2.1), nunca
 * el monto del cargo.
 */
export async function closeLeadWithCharge(input: CierreLeadInput): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.rpc('registrar_cierre_lead', {
    p_destinatario_id: input.destinatarioId,
    p_monto_cierre: input.montoCierre,
    p_franquicia_tarjeta: input.franquiciaTarjeta ?? null,
  });
  if (error) {
    const message = errMessage(error);
    logFalloApp('registrar_cierre_lead', message, error);
    return { error: message };
  }
  return { error: null };
}

// ───── Facturas mensuales (Fase 9.3b/9.3c) ─────

export interface FacturaMensualRow {
  id: string;
  organizationId: string;
  periodo: string;
  montoTotal: number;
  fechaLimitePago: string;
  estado: 'pendiente_pago' | 'reportado_por_negocio' | 'confirmado_pagado';
  tarifasSnapshot: unknown;
  reportadoAt: string | null;
  confirmadoAt: string | null;
  createdAt: string;
}

/** Facturas mensuales de un negocio, más recientes primero. */
export async function fetchFacturasMensualesByOrganization(
  organizationId: string,
): Promise<{ data: FacturaMensualRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('facturas_mensuales')
    .select('id, organization_id, periodo, monto_total, fecha_limite_pago, estado, tarifas_snapshot, reportado_at, confirmado_at, created_at')
    .eq('organization_id', organizationId)
    .order('periodo', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return {
    data: (data ?? []).map((r) => ({
      id: r.id,
      organizationId: r.organization_id,
      periodo: r.periodo,
      montoTotal: Number(r.monto_total),
      fechaLimitePago: r.fecha_limite_pago,
      estado: r.estado as FacturaMensualRow['estado'],
      tarifasSnapshot: r.tarifas_snapshot,
      reportadoAt: r.reportado_at,
      confirmadoAt: r.confirmado_at,
      createdAt: r.created_at,
    })),
    error: null,
  };
}

/** Detalle de cargos individuales de una factura mensual específica. */
export async function fetchFacturasLedgerByFacturaMensual(
  facturaMensualId: string,
): Promise<{ data: FacturaLedgerRow[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('facturas_ledger')
    .select('*')
    .eq('factura_mensual_id', facturaMensualId)
    .order('fecha', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

/** El negocio marca una factura como pagada a Neggo — vía RPC (transición validada server-side). */
export async function reportarPagoFactura(facturaId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.rpc('reportar_pago_factura', { p_factura_id: facturaId });
  if (error) {
    const message = errMessage(error);
    logFalloApp('reportar_pago_factura', message, error);
    return { error: message };
  }
  return { error: null };
}

export interface FacturaMensualAdminRow {
  id: string;
  organizationId: string;
  organizationName: string;
  organizationNit: string | null;
  organizationType: 'banco' | 'constructora' | 'comercio';
  periodo: string;
  montoTotal: number;
  fechaLimitePago: string;
  estado: 'pendiente_pago' | 'reportado_por_negocio' | 'confirmado_pagado';
  reportadoAt: string | null;
  confirmadoAt: string | null;
}

/** Todas las facturas mensuales de todos los negocios — Admin. Filtrado por
 *  estado/nombre/NIT se hace client-side (volumen mucho menor que
 *  facturas_ledger: 1 fila por negocio por mes, no por cargo individual). */
export async function fetchTodasLasFacturasMensuales(): Promise<{
  data: FacturaMensualAdminRow[] | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('facturas_mensuales')
    .select('id, organization_id, periodo, monto_total, fecha_limite_pago, estado, reportado_at, confirmado_at')
    .order('periodo', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  if (!data || data.length === 0) return { data: [], error: null };

  const orgIds = Array.from(new Set(data.map((r) => r.organization_id)));
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name, nit, type')
    .in('id', orgIds);
  if (orgError) return { data: null, error: errMessage(orgError) };
  const orgById = new Map((orgs ?? []).map((o) => [o.id, o]));

  return {
    data: data.map((r) => {
      const org = orgById.get(r.organization_id);
      return {
        id: r.id,
        organizationId: r.organization_id,
        organizationName: org?.name ?? 'Desconocido',
        organizationNit: org?.nit ?? null,
        organizationType: (org?.type as FacturaMensualAdminRow['organizationType']) ?? 'comercio',
        periodo: r.periodo,
        montoTotal: Number(r.monto_total),
        fechaLimitePago: r.fecha_limite_pago,
        estado: r.estado as FacturaMensualAdminRow['estado'],
        reportadoAt: r.reportado_at,
        confirmadoAt: r.confirmado_at,
      };
    }),
    error: null,
  };
}

/** Admin confirma que el pago de una factura llegó — vía RPC (valida is_platform_admin() server-side). */
export async function confirmarPagoFactura(facturaId: string): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.rpc('confirmar_pago_factura', { p_factura_id: facturaId });
  if (error) {
    const message = errMessage(error);
    logFalloApp('confirmar_pago_factura', message, error);
    return { error: message };
  }
  return { error: null };
}

// ───── Cliente-banco-productos (registro B2C) ─────

export interface ClienteBancoProductoInput {
  organizationId: string;
  productos: string[];
}

/** Bulk-inserts a client's declared bank products (used at B2C registration). */
export async function insertClienteBancoProductos(
  clienteId: string,
  entries: ClienteBancoProductoInput[],
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const rows = entries.flatMap((entry) =>
    entry.productos.map((producto) => ({
      id: crypto.randomUUID(),
      cliente_id: clienteId,
      organization_id: entry.organizationId,
      producto,
    })),
  );
  if (rows.length === 0) return { error: null };
  const { error } = await supabase.from('cliente_banco_productos').insert(rows);
  return { error: error ? errMessage(error) : null };
}

// ───── Aceptación de la Política de Tratamiento de Datos (Ley 1581/2012) ─────

/** ¿El usuario ya aceptó esta versión de la política? Corre siempre con JWT
 * válido (usuario ya autenticado), a diferencia del intento en el registro. */
export async function checkAceptacionPolitica(
  userId: string,
  version: string,
): Promise<{ aceptada: boolean; error: string | null }> {
  if (!supabase) return { aceptada: false, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('aceptaciones_politica')
    .select('id')
    .eq('user_id', userId)
    .eq('version_politica', version)
    .limit(1);
  if (error) return { aceptada: false, error: errMessage(error) };
  return { aceptada: (data ?? []).length > 0, error: null };
}

/** Registra la aceptación — nunca se actualiza ni se borra, es prueba histórica.
 * ip_o_contexto guarda navigator.userAgent (el navegador no puede leer su
 * propia IP pública; no es una IP real, solo contexto del dispositivo). */
export async function insertAceptacionPolitica(
  userId: string,
  version: string,
): Promise<{ error: string | null }> {
  if (!supabase) return { error: NOT_CONFIGURED };
  const { error } = await supabase.from('aceptaciones_politica').insert({
    id: crypto.randomUUID(),
    user_id: userId,
    version_politica: version,
    ip_o_contexto: typeof navigator !== 'undefined' ? navigator.userAgent : null,
  });
  // 23505 = violación de UNIQUE (user_id, version_politica) — la aceptación
  // ya existía, que es exactamente la garantía que buscamos. No es un error.
  if (error && error.code === '23505') return { error: null };
  return { error: error ? errMessage(error) : null };
}

/** Display-friendly shape for a client's own Me Interesa history (cualquier origen). */
export interface MeInteresaSolicitudDisplay {
  id: string;
  origen: 'banco' | 'constructora' | 'comercio';
  productoBancario: string | null;
  tipoVivienda: string | null;
  ciudad: string | null;
  categoria: string | null;
  subcategoria: string | null;
  createdAt: string;
  destinatarios: string[];
}

/** Fetches a client's own Me Interesa solicitudes (cualquier origen), con destinatarios resueltos. */
export async function fetchMeInteresaSolicitudesByCliente(
  clienteId: string,
): Promise<{ data: MeInteresaSolicitudDisplay[] | null; error: string | null }> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data: solicitudes, error: solError } = await supabase
    .from('me_interesa_solicitudes')
    .select('id, origen, producto_bancario, tipo_vivienda, ciudad, categoria, subcategoria, created_at')
    .eq('cliente_id', clienteId)
    .order('created_at', { ascending: false });
  if (solError) return { data: null, error: errMessage(solError) };
  if (!solicitudes || solicitudes.length === 0) return { data: [], error: null };

  const solicitudIds = solicitudes.map((s) => s.id);
  const { data: destinatarios, error: destError } = await supabase
    .from('me_interesa_destinatarios')
    .select('solicitud_id, organization_id')
    .in('solicitud_id', solicitudIds);
  if (destError) return { data: null, error: errMessage(destError) };

  const orgIds = Array.from(new Set((destinatarios ?? []).map((d) => d.organization_id)));
  const { data: orgs, error: orgError } = await supabase
    .from('organizations')
    .select('id, name')
    .in('id', orgIds);
  if (orgError) return { data: null, error: errMessage(orgError) };

  const orgNameById = new Map((orgs ?? []).map((o) => [o.id, o.name]));
  const destinatariosBySolicitud = new Map<string, string[]>();
  for (const d of destinatarios ?? []) {
    const list = destinatariosBySolicitud.get(d.solicitud_id) ?? [];
    list.push(orgNameById.get(d.organization_id) ?? 'Entidad');
    destinatariosBySolicitud.set(d.solicitud_id, list);
  }

  return {
    data: solicitudes.map((s) => ({
      id: s.id,
      origen: s.origen as MeInteresaSolicitudDisplay['origen'],
      productoBancario: s.producto_bancario,
      tipoVivienda: s.tipo_vivienda,
      ciudad: s.ciudad,
      categoria: s.categoria,
      subcategoria: s.subcategoria,
      createdAt: s.created_at,
      destinatarios: destinatariosBySolicitud.get(s.id) ?? [],
    })),
    error: null,
  };
}

// ───── Salud del Sistema (Admin) ─────

/** Últimos 50 fallos de escrituras críticas + conteo de las últimas 24h. Solo Admin (RLS). */
export async function fetchFallosApp(): Promise<{
  data: FalloAppRow[] | null;
  count24h: number;
  error: string | null;
}> {
  if (!supabase) return { data: null, count24h: 0, error: NOT_CONFIGURED };

  const hace24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();

  const [{ data, error }, { count }] = await Promise.all([
    supabase.from('fallos_app').select('*').order('created_at', { ascending: false }).limit(50),
    supabase.from('fallos_app').select('*', { count: 'exact', head: true }).gte('created_at', hace24h),
  ]);

  if (error) return { data: null, count24h: 0, error: errMessage(error) };
  return { data: data ?? [], count24h: count ?? 0, error: null };
}
