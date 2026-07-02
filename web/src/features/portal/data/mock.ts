// ───── Economic News ─────

export interface EconomicNews {
  id: string;
  title: string;
  summary: string;
  impact: 'positive' | 'negative';
  date: string;
  affectExplanation: string;
}

export const MOCK_ECONOMIC_NEWS: EconomicNews[] = [
  {
    id: 'n1',
    title: 'Banco de la República mantiene tasa de interés en 9.50%',
    summary:
      'La Junta Directiva decidió por mayoría mantener inalterada la tasa de intervención, citando una inflación que continúa cediendo gradualmente.',
    impact: 'positive',
    date: '28 Jun 2026',
    affectExplanation:
      'Una tasa estable significa que las cuotas de tus créditos actuales no subirán en el corto plazo. Si tienes un crédito hipotecario o de libre inversión atado a la tasa del Banco de la República, tu cuota mensual se mantiene sin cambios. Es un buen momento para revisar si puedes hacer abonos a capital y reducir los intereses totales.',
  },
  {
    id: 'n2',
    title: 'Inflación anual baja a 5.21% en mayo — la más baja en 3 años',
    summary:
      'El DANE reportó que el IPC de mayo fue del 0.29% mensual, llevando la inflación de 12 meses al nivel más bajo desde febrero de 2023.',
    impact: 'positive',
    date: '25 Jun 2026',
    affectExplanation:
      'Una inflación a la baja significa que tu dinero rinde más cada mes. Los productos de la canasta familiar suben menos de precio y tu poder adquisitivo se fortalece. Para tu bolsillo: es un excelente momento para evaluar inversiones a mediano plazo como CDTs o fondos de inversión, porque las tasas reales (tasa de interés menos inflación) se vuelven más atractivas.',
  },
  {
    id: 'n3',
    title: 'Dólar supera los $4,300 por tensiones comerciales globales',
    summary:
      'El precio del dólar alcanzó su nivel más alto en 6 meses impulsado por la incertidumbre en los mercados internacionales y la caída en los precios del petróleo.',
    impact: 'negative',
    date: '22 Jun 2026',
    affectExplanation:
      'Un dólar caro encarece productos importados como tecnología, electrodomésticos y algunos alimentos. Si tienes deudas en dólares (como algunas tarjetas de crédito internacionales), tu saldo en pesos aumenta. Recomendación: evita compras grandes en moneda extranjera este mes y revisa si puedes consolidar deudas en dólares a pesos colombianos para protegerte de la volatilidad.',
  },
  {
    id: 'n4',
    title: 'Gobierno anuncia nuevos subsidios de vivienda para jóvenes',
    summary:
      'El Ministerio de Vivienda lanzó "Mi Casa Ya 2.0" con cobertura ampliada para menores de 35 años que ganen hasta 4 SMLV, cubriendo hasta el 30% del valor de la vivienda.',
    impact: 'positive',
    date: '20 Jun 2026',
    affectExplanation:
      'Si estás pensando en comprar vivienda y tienes menos de 35 años, esta es una oportunidad importante. El subsidio cubre hasta el 30% del valor de la vivienda de interés social (VIS), lo que puede reducir significativamente la cuota mensual de tu crédito hipotecario. Consejo práctico: revisa tu puntaje crediticio ahora, porque los bancos evaluarán tu historial para aprobar el crédito complementario.',
  },
];

// ───── Education Modules ─────

export interface EducationModule {
  id: string;
  title: string;
  description: string;
  icon: string;
  category: string;
  readTime: string;
}

export const MOCK_EDUCATION_MODULES: EducationModule[] = [
  {
    id: 'e1',
    title: 'Entendiendo tu Score Crediticio',
    description:
      'Aprende qué factores componen tu puntaje en DataCrédito y cómo mejorarlo mes a mes con hábitos simples. Un buen score te abre puertas a mejores tasas.',
    icon: 'TrendingUp',
    category: 'Crédito',
    readTime: '8 min',
  },
  {
    id: 'e2',
    title: 'Cómo calcular tu capacidad de endeudamiento',
    description:
      'Descubre la fórmula que usan los bancos para determinar cuánto te pueden prestar y aprende a calcular tu propio límite sano de deuda.',
    icon: 'Calculator',
    category: 'Finanzas Personales',
    readTime: '6 min',
  },
  {
    id: 'e3',
    title: 'CDT vs. Fondos de Inversión: ¿cuál te conviene?',
    description:
      'Comparativa práctica entre las dos opciones de inversión más populares en Colombia. Rentabilidad, liquidez y riesgo explicados de forma sencilla.',
    icon: 'Landmark',
    category: 'Inversión',
    readTime: '10 min',
  },
  {
    id: 'e4',
    title: 'La guía definitiva del crédito hipotecario',
    description:
      'Desde la cuota inicial hasta la escrituración: todo lo que necesitas saber antes de firmar un crédito de vivienda en Colombia.',
    icon: 'Home',
    category: 'Vivienda',
    readTime: '12 min',
  },
  {
    id: 'e5',
    title: 'Fondo de emergencia: tu primer colchón financiero',
    description:
      'Por qué necesitas un fondo de emergencia antes de invertir, cuánto deberías ahorrar y dónde guardarlo para que esté seguro y disponible.',
    icon: 'Shield',
    category: 'Ahorro',
    readTime: '7 min',
  },
  {
    id: 'e6',
    title: 'Tarjetas de crédito sin morir en el intento',
    description:
      'Cómo usar las tarjetas a tu favor: fechas de corte, pago total vs. mínimo, beneficios ocultos y cómo evitar la trampa de los intereses.',
    icon: 'CreditCard',
    category: 'Crédito',
    readTime: '9 min',
  },
];

// ───── Budget Categories ─────

export interface BudgetCategory {
  id: string;
  name: string;
  budget: number;
  spent: number;
  color: string;
  icon: string;
}

export const MOCK_BUDGET_CATEGORIES: BudgetCategory[] = [
  {
    id: 'c1',
    name: 'Vivienda',
    budget: 1800000,
    spent: 1650000,
    color: 'emerald',
    icon: 'Home',
  },
  {
    id: 'c2',
    name: 'Alimentación',
    budget: 1200000,
    spent: 980000,
    color: 'blue',
    icon: 'Utensils',
  },
  {
    id: 'c3',
    name: 'Transporte',
    budget: 600000,
    spent: 570000,
    color: 'amber',
    icon: 'Bus',
  },
  {
    id: 'c4',
    name: 'Servicios',
    budget: 500000,
    spent: 445000,
    color: 'cyan',
    icon: 'Zap',
  },
  {
    id: 'c5',
    name: 'Entretenimiento',
    budget: 400000,
    spent: 280000,
    color: 'purple',
    icon: 'Gamepad2',
  },
  {
    id: 'c6',
    name: 'Otros',
    budget: 500000,
    spent: 520000,
    color: 'red',
    icon: 'MoreHorizontal',
  },
];

// ───── Financial Tips ─────

export interface FinancialTip {
  id: string;
  text: string;
  actionLabel?: string;
}

export const MOCK_FINANCIAL_TIPS: FinancialTip[] = [
  {
    id: 't1',
    text: 'Fondo de Emergencia: te faltan $350,000 para cubrir tu primer mes completo de gastos esenciales. Prioriza este objetivo antes de invertir.',
    actionLabel: 'Crear meta de ahorro',
  },
  {
    id: 't2',
    text: 'Gastos de transporte están al 95% de tu presupuesto. Considera usar días de trabajo remoto o transporte público para aliviar esta categoría.',
    actionLabel: 'Ver alternativas',
  },
  {
    id: 't3',
    text: 'Tu categoría "Vivienda" consume el 36.7% de tus ingresos. Lo ideal es no superar el 30%. Evalúa si puedes refinanciar tu crédito hipotecario.',
    actionLabel: 'Simular refinanciación',
  },
  {
    id: 't4',
    text: 'Excelente gestión en Entretenimiento: llevas solo el 70% del presupuesto a mitad de mes. El dinero sobrante puede ir directo a tu fondo de ahorro.',
    actionLabel: 'Mover a ahorros',
  },
  {
    id: 't5',
    text: 'Según tu score crediticio (732), calificas para tasas preferenciales en al menos 3 bancos. ¿Ya exploraste ofertas de compra de cartera?',
    actionLabel: 'Ver ofertas',
  },
];

// ───── Monthly Budget Summary ─────

export const MOCK_BUDGET_SUMMARY = {
  monthlyBudget: 5000000,
  totalSpent: 4245000,
  categoriesActive: 6,
  averageDailySpend: 141500,
  daysInMonth: 30,
};

// ───── Goals (Metas) ─────

import type { GoalMeta, Invoice } from '@/types';

export const MOCK_GOALS: GoalMeta[] = [
  {
    id: 'g1',
    category: 'Carro',
    subcategoria: 'Hibrido',
    targetAmount: 35000000,
    savedAmount: 14000000,
    monthlyGoal: 1200000,
    ifcCertified: true,
    status: 'active',
    offers: [
      {
        id: 'po1',
        commerceName: 'AutoMercado Premium',
        benefit: '8% Descuento + 12 cuotas sin interés',
        securityBadge: 'Comercio con Sello de Confianza Neggo (Origen Legal Validado)',
        savingsEstimate: 2800000,
        completionMonths: 14,
        confidenceLevel: 99,
      },
      {
        id: 'po2',
        commerceName: 'Concesionario Elite',
        benefit: 'Seguro Gratis por 1 año + Garantía Extendida 3 años',
        securityBadge: 'Comercio con Sello de Confianza Neggo (Origen Legal Validado)',
        savingsEstimate: 1800000,
        completionMonths: 12,
        confidenceLevel: 97,
      },
      {
        id: 'po3',
        commerceName: 'MotorWorld Colombia',
        benefit: 'Tasa preferencial 0.78% MV + Matrícula gratis',
        securityBadge: 'Comercio con Sello de Confianza Neggo (Origen Legal Validado)',
        savingsEstimate: 3500000,
        completionMonths: 18,
        confidenceLevel: 95,
      },
    ],
  },
  {
    id: 'g2',
    category: 'Viaje',
    subcategoria: 'Internacional',
    metadataAdicional: { personas: 2 },
    targetAmount: 12000000,
    savedAmount: 4500000,
    monthlyGoal: 600000,
    ifcCertified: true,
    status: 'active',
    offers: [
      {
        id: 'po4',
        commerceName: 'Viaja Seguro Agencia',
        benefit: '15% Descuento en paquetes todo incluido + seguro de viaje gratis',
        securityBadge: 'Comercio con Sello de Confianza Neggo (Origen Legal Validado)',
        savingsEstimate: 1800000,
        completionMonths: 10,
        confidenceLevel: 98,
      },
      {
        id: 'po5',
        commerceName: 'Destinos Globales',
        benefit: 'Plan 12 cuotas sin interés en vuelos internacionales',
        securityBadge: 'Comercio con Sello de Confianza Neggo (Origen Legal Validado)',
        savingsEstimate: 950000,
        completionMonths: 11,
        confidenceLevel: 96,
      },
      {
        id: 'po6',
        commerceName: 'TravelPlus',
        benefit: '10% Cashback en hospedaje + traslados cortesía',
        securityBadge: 'Comercio con Sello de Confianza Neggo (Origen Legal Validado)',
        savingsEstimate: 600000,
        completionMonths: 9,
        confidenceLevel: 94,
      },
    ],
  },
  {
    id: 'g3',
    category: 'Vivienda',
    subcategoria: 'Apartamento',
    targetAmount: 60000000,
    savedAmount: 28500000,
    monthlyGoal: 1500000,
    ifcCertified: true,
    status: 'active',
    offers: [
      {
        id: 'po7',
        commerceName: 'Constructora del Valle',
        benefit: 'Subsidio del 10% sobre cuota inicial + tasa 0.85% MV',
        securityBadge: 'Comercio con Sello de Confianza Neggo (Origen Legal Validado)',
        savingsEstimate: 6000000,
        completionMonths: 17,
        confidenceLevel: 99,
      },
      {
        id: 'po8',
        commerceName: 'ViviendaYA',
        benefit: 'Estudio de crédito gratis + avalúo sin costo',
        securityBadge: 'Comercio con Sello de Confianza Neggo (Origen Legal Validado)',
        savingsEstimate: 1200000,
        completionMonths: 15,
        confidenceLevel: 97,
      },
      {
        id: 'po9',
        commerceName: 'Inmobiliaria Horizonte',
        benefit: '3 meses sin cuota + escrituración incluida',
        securityBadge: 'Comercio con Sello de Confianza Neggo (Origen Legal Validado)',
        savingsEstimate: 4500000,
        completionMonths: 19,
        confidenceLevel: 96,
      },
    ],
  },
  {
    id: 'g4',
    category: 'Computador',
    subcategoria: 'Mac',
    targetAmount: 5500000,
    savedAmount: 3800000,
    monthlyGoal: 400000,
    ifcCertified: true,
    status: 'active',
    offers: [
      {
        id: 'po10',
        commerceName: 'TiendaTech Oficial',
        benefit: '6 cuotas sin interés + mochila de regalo',
        securityBadge: 'Comercio con Sello de Confianza Neggo (Origen Legal Validado)',
        savingsEstimate: 320000,
        completionMonths: 4,
        confidenceLevel: 98,
      },
      {
        id: 'po11',
        commerceName: 'ElectroMundo',
        benefit: 'Garantía extendida 3 años + soporte técnico 1 año',
        securityBadge: 'Comercio con Sello de Confianza Neggo (Origen Legal Validado)',
        savingsEstimate: 450000,
        completionMonths: 5,
        confidenceLevel: 96,
      },
      {
        id: 'po12',
        commerceName: 'PC Factory',
        benefit: '10% descuento en accesorios + ensamble gratis',
        securityBadge: 'Comercio con Sello de Confianza Neggo (Origen Legal Validado)',
        savingsEstimate: 550000,
        completionMonths: 3,
        confidenceLevel: 94,
      },
    ],
  },
  {
    id: 'g5',
    category: 'Remodelación',
    subcategoria: 'Cocina',
    targetAmount: 18000000,
    savedAmount: 5200000,
    monthlyGoal: 900000,
    ifcCertified: false,
    status: 'active',
    offers: [],
  },
];

// ───── Invoices (Facturas) ─────

export const MOCK_INVOICES: Invoice[] = [
  {
    id: 'inv-001',
    document: 'FAC-2026-0891',
    commerce: 'TiendaTech Oficial',
    trustSeal: true,
    amount: 3800000,
    date: '2026-06-28',
    status: 'Procesado ✓',
  },
  {
    id: 'inv-002',
    document: 'FAC-2026-0876',
    commerce: 'Viaja Seguro Agencia',
    trustSeal: true,
    amount: 4500000,
    date: '2026-06-25',
    status: 'Procesado ✓',
  },
  {
    id: 'inv-003',
    document: 'FAC-2026-0852',
    commerce: 'Constructora del Valle',
    trustSeal: true,
    amount: 12000000,
    date: '2026-06-20',
    status: 'Procesado ✓',
  },
  {
    id: 'inv-004',
    document: 'FAC-2026-0831',
    commerce: 'AutoMercado Premium',
    trustSeal: true,
    amount: 14000000,
    date: '2026-06-15',
    status: 'Procesado ✓',
  },
  {
    id: 'inv-005',
    document: 'REC-2026-0815',
    commerce: 'Ferretería El Maestro',
    trustSeal: false,
    amount: 520000,
    date: '2026-06-10',
    status: 'Pendiente',
  },
  {
    id: 'inv-006',
    document: 'REC-2026-0798',
    commerce: 'Supermercado La Canasta',
    trustSeal: false,
    amount: 340000,
    date: '2026-06-05',
    status: 'Pendiente',
  },
  {
    id: 'inv-007',
    document: 'FAC-2026-0780',
    commerce: 'PC Factory',
    trustSeal: true,
    amount: 5500000,
    date: '2026-05-28',
    status: 'Procesado ✓',
  },
  {
    id: 'inv-008',
    document: 'FAC-2026-0755',
    commerce: 'ElectroMundo',
    trustSeal: true,
    amount: 3800000,
    date: '2026-05-20',
    status: 'Procesado ✓',
  },
];
