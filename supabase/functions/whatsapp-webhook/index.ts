import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { procesarImagenConDocumentAi } from '../_shared/documentAi.ts';
import { normalizarNumero, verificarFirmaMeta, enviarMensajeWhatsapp, descargarMediaWhatsapp } from '../_shared/whatsapp.ts';
import { enviarCodigoOtp, enmascararEmail } from '../_shared/email.ts';

// Edge Function: whatsapp-webhook
// --------------------------------
// Bot de WhatsApp con personalidad para Finanzas Personales (Fase 1, pieza 3).
// Ver docs/spec-finanzas-personales-fase1-2026-08-08.md.
//
// No hay JWT de usuario acá (WhatsApp no tiene sesión de Supabase) — esta
// función SÍ usa el service role, mismo criterio que send-notification (la
// única función previa que legítimamente lo necesita). El límite de seguridad
// real pasa a ser código explícito: cada operación filtra siempre por el
// cliente_id ya resuelto y verificado — y desde esta ronda, "verificado" ya
// no significa solo "dijo un correo que existe": significa que pasó un
// código OTP mandado al correo YA registrado (mismo criterio que Tabot de
// Bancolombia para cualquier consulta personal). Sin eso, el bot solo puede
// pedir la identificación — no lee ni escribe ningún dato del cliente.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WHATSAPP_VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const RECIBOS_BUCKET = 'recibos-clientes';
const SESION_VALIDA_MINUTOS = 60;
const OTP_VALIDO_MINUTOS = 5;

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

const CATEGORIAS_META_VALIDAS = [
  'Celular', 'Viaje', 'Vivienda', 'Carro', 'Moto', 'Computador', 'Remodelación',
  'Salud y Estética', 'Educación', 'Moda y Accesorios', 'Deporte y Gimnasio',
  'Mascotas', 'Eventos', 'Muebles y Decoración', 'Belleza y Spa',
];

// ───── Identidad: resolver el vínculo número de WhatsApp ↔ cliente_id ─────

interface IdentidadRow {
  cliente_id: string;
  otp_verificado_at: string | null;
  otp_code: string | null;
  otp_expires_at: string | null;
  accion_pendiente_tipo: 'canjear_puntos' | 'responder_oferta' | null;
  accion_pendiente_payload: Record<string, unknown> | null;
  accion_pendiente_codigo: string | null;
  accion_pendiente_expira_at: string | null;
}

async function resolverIdentidad(numeroNormalizado: string): Promise<IdentidadRow | null> {
  const { data } = await supabase
    .from('whatsapp_identidades')
    .select(
      'cliente_id, otp_verificado_at, otp_code, otp_expires_at, accion_pendiente_tipo, accion_pendiente_payload, accion_pendiente_codigo, accion_pendiente_expira_at',
    )
    .eq('numero_normalizado', numeroNormalizado)
    .maybeSingle();
  return data ?? null;
}

function sesionVigente(identidad: IdentidadRow): boolean {
  if (!identidad.otp_verificado_at) return false;
  const minutosDesdeVerificacion = (Date.now() - new Date(identidad.otp_verificado_at).getTime()) / 60000;
  return minutosDesdeVerificacion < SESION_VALIDA_MINUTOS;
}

function generarCodigoOtp(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}

/** Genera y manda un código nuevo, invalidando cualquier sesión previa. */
async function enviarOtp(numeroNormalizado: string, email: string): Promise<boolean> {
  const codigo = generarCodigoOtp();
  const expira = new Date(Date.now() + OTP_VALIDO_MINUTOS * 60000).toISOString();
  await supabase
    .from('whatsapp_identidades')
    .update({ otp_code: codigo, otp_expires_at: expira, otp_verificado_at: null })
    .eq('numero_normalizado', numeroNormalizado);
  return enviarCodigoOtp(email, codigo);
}

/** true si el texto entrante es el código correcto y todavía vigente. */
async function intentarVerificarOtp(numeroNormalizado: string, identidad: IdentidadRow, texto: string): Promise<boolean> {
  const codigoIngresado = texto.trim();
  if (!/^\d{6}$/.test(codigoIngresado)) return false;
  if (!identidad.otp_code || !identidad.otp_expires_at) return false;
  if (new Date(identidad.otp_expires_at).getTime() < Date.now()) return false;
  if (codigoIngresado !== identidad.otp_code) return false;

  await supabase
    .from('whatsapp_identidades')
    .update({ otp_verificado_at: new Date().toISOString(), otp_code: null, otp_expires_at: null })
    .eq('numero_normalizado', numeroNormalizado);
  return true;
}

// ───── Step-up: segunda confirmación para acciones que mueven valor real ─────
// (canjear puntos, aceptar/rechazar oferta). La sesión OTP de login prueba
// quién es el cliente; esto prueba que ESTA acción puntual la autorizó él,
// con un código nuevo mandado al correo — nunca se ejecuta solo porque
// Claude interpretó una intención.

const ACCION_CODIGO_VALIDO_MINUTOS = 5;

async function crearAccionPendiente(
  clienteId: string,
  tipo: 'canjear_puntos' | 'responder_oferta',
  payload: Record<string, unknown>,
): Promise<boolean> {
  const { data: userRow } = await supabase.from('users').select('email').eq('id', clienteId).maybeSingle();
  if (!userRow?.email) return false;

  const codigo = generarCodigoOtp();
  const expira = new Date(Date.now() + ACCION_CODIGO_VALIDO_MINUTOS * 60000).toISOString();
  await supabase
    .from('whatsapp_identidades')
    .update({
      accion_pendiente_tipo: tipo,
      accion_pendiente_payload: payload,
      accion_pendiente_codigo: codigo,
      accion_pendiente_expira_at: expira,
    })
    .eq('cliente_id', clienteId);
  await enviarCodigoOtp(userRow.email, codigo);
  return true;
}

async function limpiarAccionPendiente(clienteId: string): Promise<void> {
  await supabase
    .from('whatsapp_identidades')
    .update({ accion_pendiente_tipo: null, accion_pendiente_payload: null, accion_pendiente_codigo: null, accion_pendiente_expira_at: null })
    .eq('cliente_id', clienteId);
}

function accionPendienteVigente(identidad: IdentidadRow): boolean {
  if (!identidad.accion_pendiente_tipo || !identidad.accion_pendiente_expira_at) return false;
  return new Date(identidad.accion_pendiente_expira_at).getTime() > Date.now();
}

/** Ejecuta de verdad canjear_puntos — replica la RPC canjear_puntos (que depende de auth.uid(), inutilizable desde el service role) con el cliente_id ya verificado explícitamente. */
async function ejecutarCanjePuntosReal(clienteId: string, comercioId: string, puntos: number): Promise<{ ok: boolean; error?: string }> {
  const { data: saldo } = await supabase.rpc('saldo_puntos_cliente', { p_cliente_id: clienteId });
  if (Number(saldo ?? 0) < puntos) return { ok: false, error: 'saldo_insuficiente' };

  const movimientoId = crypto.randomUUID();
  const { error } = await supabase.from('puntos_movimientos').insert({
    id: movimientoId,
    cliente_id: clienteId,
    tipo: 'canjeado',
    puntos: -puntos,
    comercio_canje_id: comercioId,
  });
  if (error) return { ok: false, error: error.message };

  await supabase.rpc('_log_audit', {
    p_event_type: 'puntos.canjeado',
    p_user_id: clienteId,
    p_organization_id: comercioId,
    p_metadata: { puntos, movimientoId, origen: 'whatsapp-bot' },
  });
  return { ok: true };
}

/** Ejecuta de verdad responder_oferta — replica responder_oferta_comercio (misma limitación de auth.uid()) con el cliente_id ya verificado. */
async function ejecutarRespuestaOfertaReal(
  clienteId: string,
  ofertaId: string,
  accion: 'aceptar' | 'rechazar',
  motivo: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const { data: oferta } = await supabase.from('ofertas_comercios').select('meta_id, estado').eq('id', ofertaId).maybeSingle();
  if (!oferta) return { ok: false, error: 'oferta_no_existe' };
  if (oferta.estado !== 'pendiente') return { ok: false, error: 'oferta_ya_respondida' };

  const { data: meta } = await supabase.from('metas').select('cliente_id').eq('id', oferta.meta_id).maybeSingle();
  if (!meta || meta.cliente_id !== clienteId) return { ok: false, error: 'no_autorizado' };

  const nuevoEstado = accion === 'aceptar' ? 'aceptada' : 'rechazada';
  const { error } = await supabase
    .from('ofertas_comercios')
    .update({ estado: nuevoEstado, respondida_at: new Date().toISOString(), motivo_rechazo: motivo })
    .eq('id', ofertaId);
  if (error) return { ok: false, error: error.message };

  await supabase.rpc('_log_audit', {
    p_event_type: 'oferta.respondida',
    p_user_id: clienteId,
    p_metadata: { ofertaId, estado: nuevoEstado, motivoRechazo: motivo, origen: 'whatsapp-bot' },
  });
  return { ok: true };
}

/** Primer contacto: el texto entrante debe ser un correo o un número de documento ya registrado. */
async function intentarIdentificar(
  textoEntrante: string,
  numeroNormalizado: string,
): Promise<{ clienteId: string; nombre: string; email: string } | null> {
  const valor = textoEntrante.trim();
  const esEmail = valor.includes('@');
  const esDocumento = /^\d{6,15}$/.test(valor.replace(/\D/g, ''));

  let query = supabase.from('users').select('id, nombre, email').eq('rol', 'Cliente');
  if (esEmail) {
    query = query.ilike('email', valor);
  } else if (esDocumento) {
    query = query.eq('numero_documento', valor.replace(/\D/g, ''));
  } else {
    return null;
  }

  const { data } = await query.limit(1).maybeSingle();
  if (!data) return null;

  await supabase.from('whatsapp_identidades').insert({
    id: crypto.randomUUID(),
    cliente_id: data.id,
    numero_normalizado: numeroNormalizado,
  });

  return { clienteId: data.id, nombre: data.nombre, email: data.email };
}

// ───── Categorías de presupuesto: resolver por nombre o crear una de seguimiento ─────

async function resolverOCrearCategoria(clienteId: string, nombreCategoria: string): Promise<string> {
  const mes = currentMonthKey();
  const { data: existente } = await supabase
    .from('presupuesto_categorias')
    .select('id')
    .eq('cliente_id', clienteId)
    .eq('mes', mes)
    .ilike('nombre', nombreCategoria.trim())
    .limit(1)
    .maybeSingle();
  if (existente) return existente.id;

  const id = `PRES-WA-${Date.now()}`;
  await supabase.from('presupuesto_categorias').insert({
    id,
    cliente_id: clienteId,
    mes,
    nombre: nombreCategoria.trim(),
    presupuesto: 0,
    gastado: 0,
    color: 'blue',
    icono: 'MoreHorizontal',
  });
  return id;
}

async function resolverComercioParaCanje(termino: string): Promise<{ id: string; nombre: string } | null> {
  const { data } = await supabase
    .from('organizations')
    .select('id, name')
    .in('type', ['comercio', 'constructora'])
    .eq('status', 'approved')
    .ilike('name', `%${termino.trim()}%`)
    .limit(1)
    .maybeSingle();
  return data ? { id: data.id, nombre: data.name } : null;
}

function resolverCategoriaMeta(nombreLibre: string): string | null {
  const normalizado = nombreLibre.trim().toLowerCase();
  const match = CATEGORIAS_META_VALIDAS.find(
    (c) => c.toLowerCase() === normalizado || c.toLowerCase().includes(normalizado) || normalizado.includes(c.toLowerCase()),
  );
  return match ?? null;
}

// ───── Tools disponibles para Claude ─────

const TOOLS = [
  {
    name: 'registrar_gasto',
    description:
      'Registra un gasto real del cliente en una categoría de su presupuesto. Si la categoría no existe todavía, se crea automáticamente (con presupuesto en $0, solo para llevar el registro — el cliente puede ponerle un presupuesto real después desde el portal).',
    input_schema: {
      type: 'object',
      properties: {
        categoria: { type: 'string', description: 'Nombre de la categoría, ej: Mercado, Transporte, Comida' },
        monto: { type: 'number', description: 'Monto gastado en pesos colombianos (COP), sin puntos ni comas' },
      },
      required: ['categoria', 'monto'],
    },
  },
  {
    name: 'consultar_presupuesto',
    description: 'Devuelve el estado real del presupuesto del cliente para el mes actual: cada categoría con lo presupuestado, lo gastado y lo que le queda.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'listar_metas',
    description: 'Devuelve las metas de ahorro activas del cliente, con lo ahorrado y lo que falta para cada una.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'crear_meta',
    description: `Crea una meta de ahorro nueva para el cliente. La categoría tiene que ser una de estas exactamente: ${CATEGORIAS_META_VALIDAS.join(', ')}. Si el cliente dice algo que no calza con ninguna, preguntale cuál de esas opciones es la más parecida antes de llamar esta tool.`,
    input_schema: {
      type: 'object',
      properties: {
        categoria: { type: 'string', description: `Una de: ${CATEGORIAS_META_VALIDAS.join(', ')}` },
        subcategoria: { type: 'string', description: 'Opcional, más específico (ej: "iPhone 17" para categoría Celular)' },
        montoObjetivo: { type: 'number', description: 'Monto total que quiere juntar, en COP' },
        ahorroMensual: { type: 'number', description: 'Cuánto puede ahorrar por mes, en COP' },
      },
      required: ['categoria', 'montoObjetivo', 'ahorroMensual'],
    },
  },
  {
    name: 'resumen_financiero',
    description: 'Devuelve un resumen completo de la situación financiera del cliente en Neggo: presupuesto del mes (por categoría) y metas de ahorro activas, todo junto. Usalo cuando el cliente pida un resumen general de sus finanzas.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'confirmar_recibo_pendiente',
    description:
      'Confirma el recibo/factura más reciente que el cliente mandó por foto y que está pendiente de revisión, sumándolo a su presupuesto real en la categoría indicada.',
    input_schema: {
      type: 'object',
      properties: {
        categoria: { type: 'string', description: 'Categoría a la que se debe sumar el gasto del recibo' },
      },
      required: ['categoria'],
    },
  },
  {
    name: 'descartar_recibo_pendiente',
    description: 'Descarta el recibo/factura más reciente pendiente de revisión (ej: lectura incorrecta, recibo duplicado, no era un gasto real).',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'buscar_comercios_verificados',
    description: 'Busca comercios con Sello de Confianza de Neggo por nombre o parte del nombre. Usalo cuando el cliente pregunte si un negocio está verificado, o quiera buscar comercios de confianza.',
    input_schema: {
      type: 'object',
      properties: {
        termino: { type: 'string', description: 'Nombre o parte del nombre del comercio a buscar' },
      },
      required: ['termino'],
    },
  },
  {
    name: 'listar_solicitudes',
    description: 'Devuelve el historial de solicitudes del cliente a bancos, constructoras o comercios (compra de cartera, crédito hipotecario, etc.), con su estado actual. Usalo cuando pregunte por el estado de un trámite o solicitud.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'listar_ofertas',
    description: 'Devuelve las ofertas pendientes que comercios le mandaron al cliente sobre sus metas de ahorro (beneficios, descuentos). Usalo cuando pregunte si tiene ofertas o beneficios disponibles.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'listar_facturas',
    description: 'Devuelve el historial de compras/facturas reales que el cliente registró en Neggo (sobre ofertas aceptadas). Usalo cuando pregunte por sus compras o facturas.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'consultar_puntos',
    description: 'Devuelve el saldo de puntos Neggo del cliente y sus últimos movimientos (ganados, canjeados, vencidos). Usalo cuando pregunte cuántos puntos tiene o por su historial de puntos.',
    input_schema: { type: 'object', properties: {} },
  },
  {
    name: 'preparar_canje_puntos',
    description:
      'Prepara un canje de puntos en un comercio (NO lo ejecuta todavía). Valida que el comercio exista y que el cliente tenga saldo suficiente, y manda un código de confirmación aparte al correo del cliente — el canje solo se concreta cuando responda con ese código. Usalo cuando el cliente quiera canjear puntos.',
    input_schema: {
      type: 'object',
      properties: {
        comercio: { type: 'string', description: 'Nombre o parte del nombre del comercio donde quiere canjear' },
        puntos: { type: 'number', description: 'Cantidad de puntos a canjear' },
      },
      required: ['comercio', 'puntos'],
    },
  },
  {
    name: 'preparar_respuesta_oferta',
    description:
      'Prepara aceptar o rechazar la oferta pendiente más reciente de un comercio (NO lo ejecuta todavía). Manda un código de confirmación aparte al correo del cliente — la respuesta solo se concreta cuando responda con ese código. Usalo cuando el cliente quiera aceptar o rechazar una oferta.',
    input_schema: {
      type: 'object',
      properties: {
        accion: { type: 'string', enum: ['aceptar', 'rechazar'], description: 'Qué quiere hacer con la oferta' },
        motivo: { type: 'string', description: 'Opcional, solo si rechaza y da una razón' },
      },
      required: ['accion'],
    },
  },
];

async function ejecutarTool(clienteId: string, toolName: string, input: Record<string, unknown>): Promise<unknown> {
  switch (toolName) {
    case 'registrar_gasto': {
      const categoria = String(input.categoria ?? '').trim();
      const monto = Number(input.monto);
      if (!categoria || !monto || monto <= 0) return { error: 'categoria y monto (positivo) son requeridos' };

      const categoriaId = await resolverOCrearCategoria(clienteId, categoria);
      const { data: cat } = await supabase.from('presupuesto_categorias').select('gastado, presupuesto').eq('id', categoriaId).single();
      const nuevoGastado = (cat?.gastado ?? 0) + monto;
      await supabase.from('presupuesto_categorias').update({ gastado: nuevoGastado }).eq('id', categoriaId);

      return { categoria, monto, nuevoGastado, presupuesto: cat?.presupuesto ?? 0 };
    }

    case 'consultar_presupuesto': {
      const { data } = await supabase
        .from('presupuesto_categorias')
        .select('nombre, presupuesto, gastado')
        .eq('cliente_id', clienteId)
        .eq('mes', currentMonthKey());
      return {
        categorias: (data ?? []).map((c) => ({
          nombre: c.nombre,
          presupuesto: c.presupuesto,
          gastado: c.gastado,
          restante: c.presupuesto - c.gastado,
        })),
      };
    }

    case 'listar_metas': {
      const { data } = await supabase
        .from('metas')
        .select('categoria, subcategoria, monto_objetivo, monto_ahorrado, ahorro_mensual')
        .eq('cliente_id', clienteId)
        .eq('status', 'activa');
      return { metas: data ?? [] };
    }

    case 'crear_meta': {
      const categoriaResuelta = resolverCategoriaMeta(String(input.categoria ?? ''));
      const montoObjetivo = Number(input.montoObjetivo);
      const ahorroMensual = Number(input.ahorroMensual);
      if (!categoriaResuelta) {
        return { error: 'categoria_invalida', categorias_validas: CATEGORIAS_META_VALIDAS };
      }
      if (!montoObjetivo || montoObjetivo <= 0 || !ahorroMensual || ahorroMensual <= 0) {
        return { error: 'montoObjetivo y ahorroMensual (positivos) son requeridos' };
      }

      const id = `META-WA-${Date.now()}`;
      const { error } = await supabase.from('metas').insert({
        id,
        cliente_id: clienteId,
        categoria: categoriaResuelta,
        subcategoria: input.subcategoria ? String(input.subcategoria).trim() : null,
        monto_objetivo: montoObjetivo,
        monto_ahorrado: 0,
        ahorro_mensual: ahorroMensual,
        // Regla de negocio: las metas creadas por el bot activan el Sello IFC
        // automáticamente (a diferencia del portal, donde el cliente lo activa a mano).
        ifc_activo: true,
      });
      if (error) return { error: error.message };

      return { categoria: categoriaResuelta, subcategoria: input.subcategoria ?? null, montoObjetivo, ahorroMensual, ifcActivo: true };
    }

    case 'resumen_financiero': {
      const [{ data: categorias }, { data: metas }] = await Promise.all([
        supabase.from('presupuesto_categorias').select('nombre, presupuesto, gastado').eq('cliente_id', clienteId).eq('mes', currentMonthKey()),
        supabase.from('metas').select('categoria, subcategoria, monto_objetivo, monto_ahorrado').eq('cliente_id', clienteId).eq('status', 'activa'),
      ]);
      return {
        presupuesto: (categorias ?? []).map((c) => ({ nombre: c.nombre, presupuesto: c.presupuesto, gastado: c.gastado, restante: c.presupuesto - c.gastado })),
        metas: (metas ?? []).map((m) => ({ categoria: m.categoria, subcategoria: m.subcategoria, objetivo: m.monto_objetivo, ahorrado: m.monto_ahorrado })),
      };
    }

    case 'confirmar_recibo_pendiente': {
      const categoria = String(input.categoria ?? '').trim();
      if (!categoria) return { error: 'categoria es requerida' };

      const { data: pendiente } = await supabase
        .from('movimientos_ocr')
        .select('id, comercio_extraido, valor_extraido')
        .eq('cliente_id', clienteId)
        .eq('estado', 'pendiente_revision')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!pendiente) return { error: 'no_hay_recibo_pendiente' };
      if (pendiente.valor_extraido === null) return { error: 'sin_valor_pedir_monto' };

      const categoriaId = await resolverOCrearCategoria(clienteId, categoria);
      await supabase
        .from('movimientos_ocr')
        .update({ estado: 'confirmado', categoria_id: categoriaId, revisado_at: new Date().toISOString() })
        .eq('id', pendiente.id);

      const { data: cat } = await supabase.from('presupuesto_categorias').select('gastado').eq('id', categoriaId).single();
      const nuevoGastado = (cat?.gastado ?? 0) + pendiente.valor_extraido;
      await supabase.from('presupuesto_categorias').update({ gastado: nuevoGastado }).eq('id', categoriaId);

      return { comercio: pendiente.comercio_extraido, monto: pendiente.valor_extraido, categoria };
    }

    case 'descartar_recibo_pendiente': {
      const { data: pendiente } = await supabase
        .from('movimientos_ocr')
        .select('id')
        .eq('cliente_id', clienteId)
        .eq('estado', 'pendiente_revision')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!pendiente) return { error: 'no_hay_recibo_pendiente' };
      await supabase
        .from('movimientos_ocr')
        .update({ estado: 'descartado', revisado_at: new Date().toISOString() })
        .eq('id', pendiente.id);
      return { ok: true };
    }

    case 'buscar_comercios_verificados': {
      const termino = String(input.termino ?? '').trim();
      if (!termino) return { error: 'termino es requerido' };
      const { data, error } = await supabase.rpc('buscar_comercios_verificados', { p_termino: termino });
      if (error) return { error: error.message };
      return {
        resultados: (data ?? []).map((c) => ({
          nombre: c.name,
          ciudad: c.ciudad,
          categoria: c.categoria,
          codigoNeggo: c.codigo_neggo,
        })),
      };
    }

    case 'listar_solicitudes': {
      const { data } = await supabase
        .from('me_interesa_solicitudes')
        .select('origen, estado, producto_bancario, tipo_vivienda, categoria, subcategoria, created_at')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
        .limit(10);
      return {
        solicitudes: (data ?? []).map((s) => ({
          origen: s.origen,
          estado: s.estado,
          detalle: s.producto_bancario ?? s.tipo_vivienda ?? s.categoria ?? s.subcategoria ?? null,
          fecha: s.created_at,
        })),
      };
    }

    case 'listar_ofertas': {
      const { data: metasCliente } = await supabase.from('metas').select('id').eq('cliente_id', clienteId);
      const metaIds = (metasCliente ?? []).map((m) => m.id);
      if (metaIds.length === 0) return { ofertas: [] };
      const { data } = await supabase
        .from('ofertas_comercios')
        .select('comercio_nombre, beneficio, descripcion, estado, created_at')
        .in('meta_id', metaIds)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false })
        .limit(10);
      return { ofertas: data ?? [] };
    }

    case 'listar_facturas': {
      const { data: metasCliente } = await supabase.from('metas').select('id').eq('cliente_id', clienteId);
      const metaIds = (metasCliente ?? []).map((m) => m.id);
      if (metaIds.length === 0) return { facturas: [] };
      const { data: ofertas } = await supabase.from('ofertas_comercios').select('id, comercio_nombre').in('meta_id', metaIds);
      const ofertaIds = (ofertas ?? []).map((o) => o.id);
      const nombreOfertaId = new Map((ofertas ?? []).map((o) => [o.id, o.comercio_nombre]));
      if (ofertaIds.length === 0) return { facturas: [] };
      const { data: facturas } = await supabase
        .from('facturas_cliente')
        .select('oferta_id, monto, fecha_compra')
        .in('oferta_id', ofertaIds)
        .order('fecha_compra', { ascending: false })
        .limit(10);
      return {
        facturas: (facturas ?? []).map((f) => ({
          comercio: nombreOfertaId.get(f.oferta_id) ?? null,
          monto: f.monto,
          fecha: f.fecha_compra,
        })),
      };
    }

    case 'consultar_puntos': {
      const { data: saldo } = await supabase.rpc('saldo_puntos_cliente', { p_cliente_id: clienteId });
      const { data: movimientos } = await supabase
        .from('puntos_movimientos')
        .select('tipo, puntos, fecha_vencimiento, created_at')
        .eq('cliente_id', clienteId)
        .order('created_at', { ascending: false })
        .limit(5);
      return { saldo: Number(saldo ?? 0), ultimosMovimientos: movimientos ?? [] };
    }

    case 'preparar_canje_puntos': {
      const terminoComercio = String(input.comercio ?? '').trim();
      const puntos = Number(input.puntos);
      if (!terminoComercio || !puntos || puntos <= 0) return { error: 'comercio y puntos (positivo) son requeridos' };

      const comercio = await resolverComercioParaCanje(terminoComercio);
      if (!comercio) return { error: 'comercio_no_encontrado' };

      const { data: saldo } = await supabase.rpc('saldo_puntos_cliente', { p_cliente_id: clienteId });
      if (Number(saldo ?? 0) < puntos) return { error: 'saldo_insuficiente', saldoActual: Number(saldo ?? 0) };

      const enviado = await crearAccionPendiente(clienteId, 'canjear_puntos', { comercioId: comercio.id, comercioNombre: comercio.nombre, puntos });
      if (!enviado) return { error: 'no_se_pudo_enviar_codigo' };

      return { ok: true, comercio: comercio.nombre, puntos, requiereCodigoConfirmacion: true };
    }

    case 'preparar_respuesta_oferta': {
      const accion = String(input.accion ?? '').trim();
      if (accion !== 'aceptar' && accion !== 'rechazar') return { error: 'accion debe ser aceptar o rechazar' };
      const motivo = input.motivo ? String(input.motivo).trim() : null;

      const { data: metasCliente } = await supabase.from('metas').select('id').eq('cliente_id', clienteId);
      const metaIds = (metasCliente ?? []).map((m) => m.id);
      if (metaIds.length === 0) return { error: 'no_hay_oferta_pendiente' };

      const { data: oferta } = await supabase
        .from('ofertas_comercios')
        .select('id, comercio_nombre, beneficio')
        .in('meta_id', metaIds)
        .eq('estado', 'pendiente')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (!oferta) return { error: 'no_hay_oferta_pendiente' };

      const enviado = await crearAccionPendiente(clienteId, 'responder_oferta', {
        ofertaId: oferta.id,
        accion,
        motivo,
        comercioNombre: oferta.comercio_nombre,
        beneficio: oferta.beneficio,
      });
      if (!enviado) return { error: 'no_se_pudo_enviar_codigo' };

      return { ok: true, comercio: oferta.comercio_nombre, beneficio: oferta.beneficio, accion, requiereCodigoConfirmacion: true };
    }

    default:
      return { error: `tool desconocida: ${toolName}` };
  }
}

// ───── Claude: personalidad + loop de tools ─────

const SYSTEM_PROMPT = `Sos el asistente financiero de Neggo por WhatsApp. Le hablás al cliente de vos (voseo colombiano), con calidez y cero tecnicismos — como un amigo que sabe de plata, no como un banco.

Reglas estrictas:
- Nunca inventes montos ni datos del presupuesto o de las metas — todo lo que digas sobre plata real tiene que salir de una tool. Si no tenés la info, usá la tool correspondiente antes de responder.
- Nunca dés consejo de inversión personalizado ni garantices resultados financieros. Si te preguntan algo así, aclará que no sos asesor financiero certificado y sugerí hablarlo con uno si es una decisión grande.
- Sé breve — esto es WhatsApp, no un ensayo. 2-4 líneas por respuesta como máximo, salvo que te pidan un detalle largo (ej: resumen financiero completo).
- Si el cliente menciona un gasto ("gasté 20 mil en mercado", "me tocó pagar 50000 de uber"), usá registrar_gasto.
- Si pregunta cómo va su presupuesto o cuánto le queda, usá consultar_presupuesto.
- Si pregunta por sus metas o ahorros, usá listar_metas.
- Si quiere crear una meta nueva ("quiero ahorrar para un celular", "necesito juntar plata para un viaje"), preguntale el monto objetivo y cuánto puede ahorrar por mes si no te lo dio, y usá crear_meta. Contale que el Sello IFC quedó activado automáticamente.
- Si pide un resumen general de sus finanzas, usá resumen_financiero.
- Si el contexto indica que tiene un recibo pendiente de revisión y el cliente te confirma la categoría o dice algo como "sí, confirmalo" o "en mercado", usá confirmar_recibo_pendiente. Si dice que no es válido o que lo borres, usá descartar_recibo_pendiente.
- Si pregunta si un negocio tiene Sello de Confianza, o quiere buscar comercios verificados, usá buscar_comercios_verificados. Si no hay resultados, aclará que no significa que el negocio sea malo — solo que no tiene el Sello todavía.
- Si pregunta por el estado de una solicitud o trámite, usá listar_solicitudes.
- Si pregunta si tiene ofertas o beneficios de comercios, usá listar_ofertas.
- Si pregunta por sus compras o facturas registradas, usá listar_facturas.
- Si pregunta cuántos puntos tiene o por su historial de puntos, usá consultar_puntos.
- Si quiere canjear puntos en un comercio, usá preparar_canje_puntos — esto NO ejecuta el canje todavía, solo lo prepara y manda un código de confirmación al correo. Avisale claramente que le va a llegar un código nuevo (distinto al de login) y que tiene que responderlo para que el canje se concrete.
- Si quiere aceptar o rechazar una oferta, usá preparar_respuesta_oferta — mismo criterio: no se ejecuta hasta que confirme con el código que le llega al correo.
- Nunca digas que un canje o una respuesta a una oferta ya se concretó a menos que el resultado de la tool lo confirme explícitamente — esas dos acciones siempre pasan primero por el código de confirmación.`;

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: unknown;
}

async function llamarClaude(messages: AnthropicMessage[]): Promise<{ text: string; toolCalls: { id: string; name: string; input: Record<string, unknown> }[]; rawContent: unknown[] }> {
  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_API_KEY,
      'anthropic-version': '2023-06-01',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'claude-sonnet-5',
      max_tokens: 1024,
      system: SYSTEM_PROMPT,
      tools: TOOLS,
      messages,
    }),
  });

  if (!res.ok) {
    throw new Error(`Anthropic API error: ${await res.text()}`);
  }

  const body = await res.json();
  const content = body.content as Array<{ type: string; text?: string; id?: string; name?: string; input?: Record<string, unknown> }>;

  const text = content.filter((b) => b.type === 'text').map((b) => b.text).join('\n').trim();
  const toolCalls = content
    .filter((b) => b.type === 'tool_use')
    .map((b) => ({ id: b.id!, name: b.name!, input: b.input ?? {} }));

  return { text, toolCalls, rawContent: content };
}

async function procesarMensajeTexto(clienteId: string, textoEntrante: string): Promise<string> {
  const { data: historial } = await supabase
    .from('whatsapp_mensajes')
    .select('direccion, texto')
    .eq('cliente_id', clienteId)
    .eq('tipo', 'text')
    .order('created_at', { ascending: false })
    .limit(10);

  const { data: pendiente } = await supabase
    .from('movimientos_ocr')
    .select('comercio_extraido, valor_extraido, categoria_sugerida')
    .eq('cliente_id', clienteId)
    .eq('estado', 'pendiente_revision')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle();

  const messages: AnthropicMessage[] = (historial ?? [])
    .reverse()
    .map((m) => ({ role: m.direccion === 'entrante' ? 'user' : 'assistant', content: m.texto ?? '' }));

  let contextoTexto = textoEntrante;
  if (pendiente) {
    contextoTexto = `[Contexto: tenés un recibo pendiente de revisión — comercio "${pendiente.comercio_extraido ?? 'desconocido'}", valor ${pendiente.valor_extraido ?? 'desconocido'}, categoría sugerida "${pendiente.categoria_sugerida ?? 'ninguna'}"]\n\n${textoEntrante}`;
  }
  messages.push({ role: 'user', content: contextoTexto });

  const primeraRespuesta = await llamarClaude(messages);

  if (primeraRespuesta.toolCalls.length === 0) {
    return primeraRespuesta.text || 'No entendí bien eso — ¿me lo contás de otra forma?';
  }

  const toolResults = await Promise.all(
    primeraRespuesta.toolCalls.map(async (call) => ({
      tool_use_id: call.id,
      resultado: await ejecutarTool(clienteId, call.name, call.input),
    })),
  );

  messages.push({ role: 'assistant', content: primeraRespuesta.rawContent });
  messages.push({
    role: 'user',
    content: toolResults.map((r) => ({
      type: 'tool_result',
      tool_use_id: r.tool_use_id,
      content: JSON.stringify(r.resultado),
    })),
  });

  const segundaRespuesta = await llamarClaude(messages);
  return segundaRespuesta.text || 'Listo, ya quedó.';
}

// ───── Handler ─────

Deno.serve(async (req: Request) => {
  const url = new URL(req.url);

  // Verificación del webhook (Meta hace esto una vez al configurar la URL).
  if (req.method === 'GET') {
    const mode = url.searchParams.get('hub.mode');
    const token = url.searchParams.get('hub.verify_token');
    const challenge = url.searchParams.get('hub.challenge');
    if (mode === 'subscribe' && token === WHATSAPP_VERIFY_TOKEN && challenge) {
      return new Response(challenge, { status: 200 });
    }
    return new Response('forbidden', { status: 403 });
  }

  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const rawBody = await req.text();
  const firmaValida = await verificarFirmaMeta(rawBody, req.headers.get('x-hub-signature-256'));
  if (!firmaValida) {
    return new Response('firma inválida', { status: 401 });
  }

  let payload: {
    entry?: Array<{ changes?: Array<{ value?: { messages?: Array<Record<string, unknown>> } }> }>;
  };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return new Response('bad request', { status: 400 });
  }

  const mensajes = payload.entry?.[0]?.changes?.[0]?.value?.messages ?? [];

  for (const msg of mensajes) {
    const from = String(msg.from ?? '');
    const numeroNormalizado = normalizarNumero(from);
    if (!numeroNormalizado) continue;

    const tipo = msg.type as string;
    const textoEntrante = tipo === 'text' ? String((msg.text as { body?: string } | undefined)?.body ?? '') : '';

    const identidad = await resolverIdentidad(numeroNormalizado);

    // ── Paso 1: identificación (quién dice ser) ──
    if (!identidad) {
      if (tipo !== 'text') {
        await enviarMensajeWhatsapp(from, 'Antes de mandarme fotos, contame tu correo o número de documento registrado en Neggo para identificarte 🙂');
        continue;
      }
      const identificado = await intentarIdentificar(textoEntrante, numeroNormalizado);
      if (!identificado) {
        await enviarMensajeWhatsapp(from, 'No te reconozco todavía. Escribime tu correo o tu número de documento registrado en Neggo para identificarte.');
        continue;
      }
      await enviarOtp(numeroNormalizado, identificado.email);
      await enviarMensajeWhatsapp(
        from,
        `¡Hola, ${identificado.nombre.split(' ')[0]}! Te mandé un código de 6 dígitos a ${enmascararEmail(identificado.email)} — escribímelo acá para confirmar que sos vos.`,
      );
      continue;
    }

    const clienteId = identidad.cliente_id;

    // ── Paso 2: autenticación (prueba de que es quien dice ser) ──
    if (!sesionVigente(identidad)) {
      if (tipo === 'text') {
        const verificado = await intentarVerificarOtp(numeroNormalizado, identidad, textoEntrante);
        if (verificado) {
          await enviarMensajeWhatsapp(from, '¡Listo, ya quedaste autenticado! Contame en qué te ayudo con tus finanzas — podés escribirme o mandarme la foto de un recibo.');
          continue;
        }
      }
      // Código vencido, incorrecto, o la sesión expiró y llegó un mensaje nuevo: mandar uno nuevo.
      const { data: userRow } = await supabase.from('users').select('email').eq('id', clienteId).maybeSingle();
      if (userRow?.email) {
        await enviarOtp(numeroNormalizado, userRow.email);
        await enviarMensajeWhatsapp(from, `Por seguridad necesito que te autentiques de nuevo. Te mandé un código nuevo a ${enmascararEmail(userRow.email)} — escribímelo acá.`);
      }
      continue;
    }

    // ── Paso 2.5: confirmación de acción pendiente (canje de puntos / respuesta a oferta) ──
    if (accionPendienteVigente(identidad)) {
      const codigoIngresado = textoEntrante.trim();

      if (/^(cancelar|no|olvidalo|olvídalo)$/i.test(codigoIngresado)) {
        await limpiarAccionPendiente(clienteId);
        await enviarMensajeWhatsapp(from, 'Listo, cancelé esa acción — no se hizo ningún cambio.');
        continue;
      }

      if (tipo === 'text' && /^\d{6}$/.test(codigoIngresado) && codigoIngresado === identidad.accion_pendiente_codigo) {
        const payload = identidad.accion_pendiente_payload ?? {};
        let resultado: { ok: boolean; error?: string };
        let mensajeExito: string;

        if (identidad.accion_pendiente_tipo === 'canjear_puntos') {
          resultado = await ejecutarCanjePuntosReal(clienteId, String(payload.comercioId), Number(payload.puntos));
          mensajeExito = `¡Listo! Canjeaste ${payload.puntos} puntos en ${payload.comercioNombre}.`;
        } else {
          const accion = payload.accion as 'aceptar' | 'rechazar';
          resultado = await ejecutarRespuestaOfertaReal(clienteId, String(payload.ofertaId), accion, (payload.motivo as string | null) ?? null);
          mensajeExito = accion === 'aceptar'
            ? `¡Listo! Aceptaste la oferta de ${payload.comercioNombre}.`
            : `Listo, rechazaste la oferta de ${payload.comercioNombre}.`;
        }

        await limpiarAccionPendiente(clienteId);
        const respuestaFinal = resultado.ok ? mensajeExito : `No pude completarlo (${resultado.error}). Intentá de nuevo.`;

        await supabase.from('whatsapp_mensajes').insert({ id: crypto.randomUUID(), cliente_id: clienteId, direccion: 'saliente', tipo: 'text', texto: respuestaFinal });
        await enviarMensajeWhatsapp(from, respuestaFinal);
        continue;
      }

      await enviarMensajeWhatsapp(from, 'Tenés una confirmación pendiente — respondé con el código de 6 dígitos que te mandamos al correo, o escribí "cancelar".');
      continue;
    }

    // ── Paso 3: sesión autenticada — procesar el mensaje normalmente ──
    if (tipo === 'text') {
      await supabase.from('whatsapp_mensajes').insert({
        id: crypto.randomUUID(),
        cliente_id: clienteId,
        direccion: 'entrante',
        tipo: 'text',
        texto: textoEntrante,
      });

      const respuesta = await procesarMensajeTexto(clienteId, textoEntrante);

      await supabase.from('whatsapp_mensajes').insert({
        id: crypto.randomUUID(),
        cliente_id: clienteId,
        direccion: 'saliente',
        tipo: 'text',
        texto: respuesta,
      });
      await enviarMensajeWhatsapp(from, respuesta);
    } else if (tipo === 'image') {
      const mediaId = (msg.image as { id?: string } | undefined)?.id;
      if (!mediaId) continue;

      await supabase.from('whatsapp_mensajes').insert({
        id: crypto.randomUUID(),
        cliente_id: clienteId,
        direccion: 'entrante',
        tipo: 'image',
        texto: null,
      });

      const media = await descargarMediaWhatsapp(mediaId);
      if (!media) {
        await enviarMensajeWhatsapp(from, 'No pude descargar la foto — ¿me la mandás de nuevo?');
        continue;
      }

      const imagenPath = `${clienteId}/wa-${Date.now()}.jpg`;
      await supabase.storage.from(RECIBOS_BUCKET).upload(imagenPath, media.bytes, { contentType: media.mimeType });

      const extracted = await procesarImagenConDocumentAi(media.bytes, media.mimeType);
      const movimientoId = crypto.randomUUID();
      await supabase.from('movimientos_ocr').insert({
        id: movimientoId,
        cliente_id: clienteId,
        imagen_path: imagenPath,
        comercio_extraido: extracted.comercio_extraido,
        valor_extraido: extracted.valor_extraido,
        fecha_extraida: extracted.fecha_extraida,
        categoria_sugerida: extracted.categoria_sugerida,
        confianza_ocr: extracted.confianza_ocr,
      });

      const resumen = extracted.comercio_extraido
        ? `Detecté: ${extracted.comercio_extraido}${extracted.valor_extraido ? ` por $${extracted.valor_extraido.toLocaleString('es-CO')}` : ''}${extracted.fecha_extraida ? ` el ${extracted.fecha_extraida}` : ''}.`
        : 'No pude leer bien todos los datos del recibo.';
      const preguntaCategoria = extracted.categoria_sugerida
        ? ` ¿Lo confirmo en "${extracted.categoria_sugerida}" o en otra categoría?`
        : ' ¿En qué categoría lo registro?';
      const respuesta = `${resumen}${preguntaCategoria}`;

      await supabase.from('whatsapp_mensajes').insert({
        id: crypto.randomUUID(),
        cliente_id: clienteId,
        direccion: 'saliente',
        tipo: 'text',
        texto: respuesta,
        movimiento_ocr_id: movimientoId,
      });
      await enviarMensajeWhatsapp(from, respuesta);
    }
  }

  return new Response('ok', { status: 200 });
});
