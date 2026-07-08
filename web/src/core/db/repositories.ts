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
import type { Database } from '@/integrations/supabase/types';
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

/**
 * Fetches commerce offers. `organizationId` is accepted for tenant consistency;
 * RLS is the real isolation boundary.
 */
export async function fetchOfertasComercios(
  organizationId?: string | null,
): Promise<{ data: OfertaComercioRow[] | null; error: string | null }> {
  void organizationId; // isolation enforced by RLS; kept for API consistency
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('ofertas_comercios')
    .select('*')
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
 * Fetches rejection metrics. `organizationId` is accepted for tenant
 * consistency; RLS is the real isolation boundary.
 */
export async function fetchMetricasRechazo(
  organizationId?: string | null,
): Promise<{ data: RejectionMetric[] | null; error: string | null }> {
  void organizationId; // isolation enforced by RLS; kept for API consistency
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('metricas_rechazo')
    .select('*')
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
  const { error } = await supabase
    .from('users')
    .update({ status })
    .eq('id', userId);
  return { error: error ? errMessage(error) : null };
}

// ───── Proyectos (constructoras) ─────

/**
 * Fetches projects. `organizationId` is accepted for tenant consistency; RLS is
 * the real isolation boundary.
 */
export async function fetchProyectos(
  organizationId?: string | null,
): Promise<{ data: ProyectoRow[] | null; error: string | null }> {
  void organizationId; // isolation enforced by RLS; kept for API consistency
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('proyectos')
    .select('*')
    .order('created_at', { ascending: false });
  if (error) return { data: null, error: errMessage(error) };
  return { data: data ?? [], error: null };
}

// ───── Leads inmobiliarios ─────

/**
 * Fetches leads. `organizationId` is accepted for tenant consistency; RLS is
 * the real isolation boundary.
 */
export async function fetchLeads(
  organizationId?: string | null,
): Promise<{ data: LeadRow[] | null; error: string | null }> {
  void organizationId; // isolation enforced by RLS; kept for API consistency
  if (!supabase) return { data: null, error: NOT_CONFIGURED };
  const { data, error } = await supabase
    .from('leads')
    .select('*')
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
