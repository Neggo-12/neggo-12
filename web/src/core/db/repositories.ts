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
import type {
  GoalMeta,
  GoalCategory,
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

// ───── Helpers ─────

const NOT_CONFIGURED = 'Base de datos no configurada.';

function errMessage(error: unknown): string {
  if (error && typeof error === 'object' && 'message' in error) {
    const msg = (error as { message?: unknown }).message;
    if (typeof msg === 'string') return msg;
  }
  return 'Error desconocido al acceder a la base de datos.';
}

// ───── Metas (client savings goals) ─────

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
    status: 'active',
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
  const { error } = await supabase
    .from('metas')
    .update({ ifc_activo: value })
    .eq('id', metaId);
  return { error: error ? errMessage(error) : null };
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
    oportunidad_id: propuesta.oportunidadId,
    beneficio: propuesta.beneficio,
    descripcion: propuesta.descripcionDetallada,
    terminos: propuesta.terminosCondiciones,
    gancho_comercial: propuesta.ganchoComercial,
    facturacion_automatica: propuesta.facturacionAutomatica,
  });
  return { error: error ? errMessage(error) : null };
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

export async function fetchFacturasLedger(): Promise<{
  data: FacturaLedgerRow[] | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('facturas_ledger')
    .select('*')
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
    return { error: 'No se pudo actualizar: el usuario no existe o no tienes permiso (RLS).' };
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
    return { error: 'No se pudo actualizar la organización: no existe o no tienes permiso (RLS).' };
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
    return { error: 'No se pudo actualizar: la organización no existe o no tienes permiso (RLS).' };
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
    return { error: 'No se pudo actualizar: la organización no existe o no tienes permiso (RLS).' };
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
    return { error: 'No se pudo actualizar: la organización no existe o no tienes permiso (RLS).' };
  }
  return { error: null };
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
  return { error: error ? errMessage(error) : null };
}

/** Fetches approved banks (`organizations` with `type='banco'`) for the Banca Privada selector. */
export async function fetchBancosAprobados(): Promise<{
  data: { id: string; name: string }[] | null;
  error: string | null;
}> {
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name')
    .eq('type', 'banco')
    .eq('status', 'approved')
    .order('name', { ascending: true });
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

export interface ComerciosMatchInput {
  ciudad: string;
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
  const { data, error } = await supabase
    .from('organizations')
    .select('id, name, metadata, has_trust_seal')
    .eq('type', 'comercio')
    .eq('status', 'approved')
    .eq('ciudad', input.ciudad)
    .eq('metadata->>categoria', input.categoria);
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
    .select('id, solicitud_id, contactado, estado_pipeline, proxima_gestion_at, created_at')
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
    return { error: 'No se pudo actualizar: el lead no existe o no tienes permiso (RLS).' };
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
    return { error: 'No se pudo actualizar: el lead no existe o no tienes permiso (RLS).' };
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
