export type ProductType =
  | 'llamada'
  | 'credito'
  | 'cdt'
  | 'tarjeta'
  | 'compra-cartera'
  | 'hipotecario'
  | 'libranza'
  | 'vehiculo'
  | 'inversion';

export type ClientType =
  | 'cliente-banco'
  | 'no-cliente'
  | 'premium'
  | 'nomina'
  | 'alto-patrimonio'
  | 'riesgo'
  | 'prospecto';

export type LeadStatus =
  | 'pendiente'
  | 'contactado'
  | 'en-proceso'
  | 'documentacion'
  | 'viable'
  | 'aprobado'
  | 'desembolsado'
  | 'perdido';

export type Priority = 'baja' | 'media' | 'alta' | 'maxima';

export type RiskLevel = 'alto' | 'medio' | 'bajo' | 'minimo';

export type CampaignType =
  | 'cdt'
  | 'hipotecario'
  | 'compra-cartera'
  | 'tarjetas'
  | 'libranzas'
  | 'vehiculos'
  | 'inversiones';

export type FeedbackType = 'felicitacion' | 'problema' | 'sugerencia' | 'mala-atencion';

export type FeedbackStatus = 'nuevo' | 'en-proceso' | 'resuelto' | 'escalado';

export interface Lead {
  id: string;
  name: string;
  phone: string;
  email: string;
  product: ProductType;
  clientType: ClientType;
  score: number;
  priority: Priority;
  status: LeadStatus;
  lastActivity: string;
  assignedTo: string;
  city: string;
  bank: string;
  isBankClient: boolean;
  campaign?: string;
  income?: number;
  notes?: string;
  createdAt: string;
}

export interface KPIData {
  totalSolicitudes: number;
  convertidas: number;
  tasaConversion: number;
  scorePromedio: number;
  altaPrioridad: number;
  leadsRiesgo: number;
  deltaSolicitudes: number;
  deltaConversion: number;
  deltaScore: number;
  deltaPrioridad: number;
}

export type CampaignOfferStatus = 'active' | 'rejected';

export interface Campaign {
  id: string;
  name: string;
  type: CampaignType;
  bank: string;
  offerStatus?: CampaignOfferStatus;
  impressions: number;
  ctr: number;
  leadsGenerated: number;
  conversions: number;
  avgScore: number;
  budget: number;
  spent: number;
  startDate: string;
  endDate: string;
  status: 'activa' | 'pausada' | 'finalizada';
  cities: string[];
  tasa: string;
  minScore: number;
  maxScore: number;
}

export type FeedbackDestinatario = 'banco' | 'constructora' | 'comercio';

export interface Feedback {
  id: string;
  clientName: string;
  type: FeedbackType;
  status: FeedbackStatus;
  rating: number;
  comment: string;
  bank: string;
  /** Entidad destinataria del feedback */
  destinatario: FeedbackDestinatario;
  /** Nombre de la entidad destinataria específica */
  destinatarioName: string;
  /** ID de la entidad destinataria */
  destinatarioId: string;
  createdAt: string;
  respondedAt?: string;
  response?: string;
  satisfactionScore?: number;
}

export type ProjectVisibility = 'publico-general' | 'perfilado-core';

export type ProjectOfferStatus = 'active' | 'rejected';

export interface ProyectoConstructora {
  id: string;
  name: string;
  city: string;
  offerStatus?: ProjectOfferStatus;
  units: number;
  priceRangeMin: number;
  priceRangeMax: number;
  leadsGenerated: number;
  hipotecarioInterest: number;
  avgScore: number;
  conversionRate: number;
  status: 'activo' | 'vendido' | 'pausado';
  constructora: string;
  tipoVivienda: 'apartamento' | 'casa' | 'local' | 'oficina';
  /** Valor de separación en COP */
  valorSeparacion: number;
  /** Porcentaje de cuota inicial requerida (ej: 30) */
  cuotaInicialPct: number;
  /** Plazo máximo en meses para pagar la cuota inicial */
  plazoCuotaInicialMeses: number;
  /** Aplica a subsidio de Caja de Compensación */
  subsidioCajaCompensacion: boolean;
  /** Aplica a subsidio Mi Casa Ya */
  subsidioMiCasaYa: boolean;
  /** Bono o promoción comercial destacada */
  bonoComercial: string;
  /** Rango de área construida (ej: "Desde 52m² hasta 78m²") */
  areaConstruida: string;
  /** Número de alcobas */
  alcobas: number;
  /** Número de baños */
  banos: number;
  /** Incluye parqueadero */
  parqueadero: boolean;
  /** Costo por Lead Certificado (CPL Híbrido) en COP */
  cplCosto: number;
  /** Tasa de éxito comercial (Success Fee) como porcentaje sobre el valor del inmueble */
  successFeePct: number;
  /** Modo Lanzamiento Especial: habilita preventa exprés con reserva digital */
  modoLanzamiento: boolean;
  /** Unidades disponibles para reserva 100% digital en modo lanzamiento */
  unidadesLanzamiento: number;
  /** ID de la constructora matriz para atribución de ventas cruzadas */
  constructoraId: string;
  /** Visibilidad: público general o perfilado por score/ingresos */
  visibilidad: ProjectVisibility;
  /** Ingreso mínimo mensual requerido (solo si visibilidad es perfilado-core) */
  ingresoMinimo?: number;
  /** Score FIS mínimo requerido (solo si visibilidad es perfilado-core) */
  scoreFisMinimo?: number;
}

export interface LeadInmobiliario {
  id: string;
  name: string;
  phone: string;
  email: string;
  capacidadCompra: number;
  score: number;
  hipotecarioInterest: boolean;
  ingresosEstimados: number;
  city: string;
  tipoVivienda: string;
  priority: Priority;
  proyecto: string;
  proyectoId: string;
  status: LeadStatus;
  lastActivity: string;
  assignedTo: string;
  isBankClient: boolean;
  createdAt: string;
  /** ID del cliente para atribución de ventas */
  clienteId: string;
  /** ID de la constructora matriz para token de atribución */
  constructoraId: string;
}

export interface PipelineStatus {
  label: string;
  value: number;
  total: number;
  color: string;
}

export interface SystemStatus {
  label: string;
  status: 'operativo' | 'degradado' | 'critico' | 'mantenimiento';
  latency: string;
  uptime: string;
}

export interface AnalyticMetric {
  label: string;
  value: number;
  previousValue: number;
  delta: number;
  format?: 'number' | 'percent' | 'currency';
}

// ───── Portal Goal (Meta) types ─────

export type GoalCategory =
  | 'Celular'
  | 'Viaje'
  | 'Vivienda'
  | 'Carro'
  | 'Moto'
  | 'Computador'
  | 'Remodelación';

export type OfferStatus = 'active' | 'rejected';

export interface PartnerOffer {
  id: string;
  commerceName: string;
  benefit: string;
  securityBadge: string;
  savingsEstimate: number;
  completionMonths: number;
  confidenceLevel: number;
  status?: OfferStatus;
}

export type GoalStatus = 'active' | 'deleted' | 'completed';

export interface GoalMeta {
  id: string;
  category: GoalCategory;
  targetAmount: number;
  savedAmount: number;
  monthlyGoal: number;
  offers: PartnerOffer[];
  ifcCertified: boolean;
  status: GoalStatus;
  completedAt?: string;
  /** Subcategoría dinámica (ej: 'Eléctrico' para Carro, 'iPhone' para Celular) */
  subcategoria?: string;
  /** Metadata adicional (ej: { personas: 3 } para Viaje) */
  metadataAdicional?: Record<string, string | number>;
}

// ───── Portal Invoice types ─────

export type InvoiceStatus = 'Procesado ✓' | 'Pendiente' | 'Rechazado';

export interface Invoice {
  id: string;
  document: string;
  commerce: string;
  trustSeal: boolean;
  amount: number;
  date: string;
  status: InvoiceStatus;
}

// ───── Comercios Aliados B2B types ─────

export type ComercioCategory =
  | 'Celular'
  | 'Viaje'
  | 'Vivienda'
  | 'Carro'
  | 'Moto'
  | 'Computador'
  | 'Remodelación';

export type SubscriptionTier = 'basico' | 'premium';

export interface Comercio {
  id: string;
  nombre: string;
  nit: string;
  ciudad: string;
  categoria: ComercioCategory;
  /** Sub-especialidades dentro de la categoría (ej: ['Eléctrico', 'Híbrido'] para Carro) */
  especialidades?: string[];
  plan: SubscriptionTier;
  hasTrustSeal: boolean;
  fechaRegistro: string;
  oportunidadesRecibidas: number;
  propuestasEnviadas: number;
  tasaConversion: number;
}

export interface OportunidadIFC {
  id: string;
  clienteId: string;
  categoria: ComercioCategory;
  ciudad: string;
  presupuesto: number;
  capacidadAhorro: number;
  probabilidadCierre: number;
  compraEstimadaDias: number;
  propuestaEnviada: boolean;
  /** Subcategoría del cliente (ej: 'Eléctrico' para Carro, 'iPhone' para Celular) */
  subcategoria?: string;
  /** Metadata adicional (ej: { personas: 3 } para Viaje) */
  metadataAdicional?: Record<string, string | number>;
}

export interface PropuestaComercio {
  id: string;
  oportunidadId: string;
  beneficio: string;
  detalles: string;
  /** Descripción detallada de la oferta para el cliente */
  descripcionDetallada: string;
  /** Términos, condiciones y garantías */
  terminosCondiciones: string;
  /** Gancho comercial o valor agregado */
  ganchoComercial: string;
  facturacionAutomatica: boolean;
  enviada: boolean;
  fechaEnvio?: string;
}

// ───── Admin Dashboard types ─────

export type AdminEntityType = 'banco' | 'constructora' | 'comercio';

export type AuthorizationStatus = 'autorizado' | 'pendiente' | 'rechazado' | 'en-revision';

export interface ContactPerson {
  nombre: string;
  cargo: string;
  correo: string;
  telefono: string;
  estadoDocumentos: 'pendiente' | 'verificado' | 'rechazado';
}

export interface OnboardingRequest {
  id: string;
  entityType: AdminEntityType;
  name: string;
  detail: string;
  city: string;
  nit?: string;
  status: AuthorizationStatus;
  submittedAt: string;
  reviewedAt?: string;
  reviewedBy?: string;
  /** Contacto institucional autorizado */
  contacto?: ContactPerson;
}

export interface IFCTransaction {
  id: string;
  clienteIFC: string;
  presupuesto: number;
  categoria: string;
  comerciosNotificados: number;
  propuestasRecibidas: number;
  fechaGeneracion: string;
}

export interface EcosistemaMetrics {
  clientesActivos: number;
  bancosConectados: number;
  constructorasRegistradas: number;
  comerciosSuscritos: number;
  ifcGeneradas: number;
  propuestasEnviadas: number;
  tasaMatch: number;
  deltaClientes: number;
  deltaBancos: number;
  deltaConstructoras: number;
  deltaComercios: number;
}

export interface AlgorithmEquity {
  calidad: number;
  respuesta: number;
  rotacion: number;
  sorteo: number;
}

// ───── Dynamic Subcategories Config ─────

export interface SubcategoryOption {
  value: string;
  label: string;
}

// ───── Unified Mock Database types ─────

export interface UsuarioDB {
  id: string;
  nombre: string;
  correo: string;
  telefono: string;
  ciudad: string;
  rol: 'Cliente' | 'Admin' | 'Comercio' | 'Constructora' | 'Banco' | 'Fiduciaria';
  rangoIngresos: string;
  scoreEstimado: number;
  fechaRegistro: string;
}

export interface FacturaLedger {
  id: string;
  constructoraId: string;
  constructoraName: string;
  concepto: 'CPL' | 'Success Fee';
  montoUnitario: number;
  cantidad: number;
  totalAcumulado: number;
  estado: 'Pendiente de conciliación' | 'Facturado' | 'Pagado';
  periodo: string;
}

export interface ComercioAdmin {
  id: string;
  nombre: string;
  nit: string;
  ciudad: string;
  categoria: ComercioCategory;
  plan: SubscriptionTier;
  hasTrustSeal: boolean;
  tasaComisionB2B: number;
  estado: AuthorizationStatus;
  fechaRegistro: string;
  leadsRecibidos: number;
  propuestasEnviadas: number;
}

// ───── Subcategories ─────

// ───── Rejection Telemetry types ─────

export type OfferSector = 'constructoras' | 'banca' | 'establecimientos' | 'inversiones';

export interface RejectionMetric {
  id: string;
  /** ID de la oferta rechazada (proyecto, campaña, o propuesta) */
  offerId: string;
  /** Sector al que pertenece la oferta */
  sector: OfferSector;
  /** Tipo de producto rechazado (ej: 'CDT', 'Apartamento', 'iPhone') */
  productType: string;
  /** Nombre de la entidad que hizo la oferta */
  entityName: string;
  /** ID del usuario que rechazó */
  userId: string;
  /** Edad del usuario al momento del rechazo */
  userAge: number;
  /** Género del usuario */
  userGender: 'Hombre' | 'Mujer' | 'No especificado';
  /** Rango de ingresos del usuario */
  userIncomeRange: string;
  /** Tipo de perfil financiero del usuario */
  userProfileType: string;
  /** Ciudad del usuario */
  userCity: string;
  /** Fecha del rechazo */
  rejectedAt: string;
}

export interface RejectionAggregate {
  /** Producto más rechazado */
  topRejectedProduct: string;
  topRejectedProductCount: number;
  /** Segmento demográfico que más descarta */
  topDemographicSegment: string;
  topDemographicCount: number;
  /** Total de rechazos en el período */
  totalRejections: number;
  /** Distribución por sector */
  bySector: Record<string, number>;
  /** Distribución por género */
  byGender: Record<string, number>;
  /** Distribución por rango de ingresos */
  byIncome: Record<string, number>;
}

// ───── Feedback Wizard types ─────

export type FeedbackWizardStep = 'sector' | 'company' | 'message';

export type FeedbackSector = 'inmobiliario' | 'financiero' | 'comercial';

export interface SectorCompany {
  id: string;
  name: string;
  type: FeedbackDestinatario;
  sector: FeedbackSector;
}

export const SUBCATEGORIAS: Record<GoalCategory, SubcategoryOption[]> = {
  Carro: [
    { value: 'Hibrido', label: 'Híbrido' },
    { value: 'Electrico', label: 'Eléctrico' },
    { value: 'Gasolina', label: 'Gasolina' },
  ],
  Celular: [
    { value: 'iPhone', label: 'iPhone' },
    { value: 'Android', label: 'Android' },
  ],
  Viaje: [
    { value: 'Nacional', label: 'Nacional' },
    { value: 'Internacional', label: 'Internacional' },
  ],
  Moto: [
    { value: 'Bajo', label: 'Bajo Cilindraje' },
    { value: 'Medio', label: 'Medio Cilindraje' },
    { value: 'Alto', label: 'Alto Cilindraje' },
  ],
  Vivienda: [
    { value: 'Apartamento', label: 'Apartamento' },
    { value: 'Casa', label: 'Casa' },
    { value: 'Apartaestudio', label: 'Apartaestudio' },
  ],
  Computador: [
    { value: 'Mac', label: 'Mac / Apple' },
    { value: 'Windows', label: 'Windows / PC' },
  ],
  Remodelación: [
    { value: 'Cocina', label: 'Cocina' },
    { value: 'Bano', label: 'Baño' },
    { value: 'Integral', label: 'Integral / Todo el Hogar' },
  ],
};
