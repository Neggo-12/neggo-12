import { createClient, type SupabaseClient } from 'jsr:@supabase/supabase-js@2';
import { procesarImagenConDocumentAi } from '../_shared/documentAi.ts';
import { normalizarNumero, verificarFirmaMeta, enviarMensajeWhatsapp, descargarMediaWhatsapp } from '../_shared/whatsapp.ts';

// Edge Function: whatsapp-webhook
// --------------------------------
// Bot de WhatsApp con personalidad para Finanzas Personales (Fase 1, pieza 3).
// Ver docs/spec-finanzas-personales-fase1-2026-08-08.md.
//
// No hay JWT de usuario acá (WhatsApp no tiene sesión de Supabase) — esta
// función SÍ usa el service role, mismo criterio que send-notification (la
// única función previa que legítimamente lo necesita). El límite de seguridad
// real pasa a ser código explícito: cada operación filtra siempre por el
// cliente_id ya resuelto y verificado contra whatsapp_identidades (o contra
// email/documento en el primer contacto) — nunca se confía en nada más del
// mensaje entrante para decidir de quién son los datos.

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const WHATSAPP_VERIFY_TOKEN = Deno.env.get('WHATSAPP_VERIFY_TOKEN')!;
const ANTHROPIC_API_KEY = Deno.env.get('ANTHROPIC_API_KEY')!;
const RECIBOS_BUCKET = 'recibos-clientes';

const supabase: SupabaseClient = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

function currentMonthKey(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

// ───── Identidad: resolver/crear el vínculo número de WhatsApp ↔ cliente_id ─────

async function resolverClientePorNumero(numeroNormalizado: string): Promise<string | null> {
  const { data } = await supabase
    .from('whatsapp_identidades')
    .select('cliente_id')
    .eq('numero_normalizado', numeroNormalizado)
    .maybeSingle();
  return data?.cliente_id ?? null;
}

/** Primer contacto: el texto entrante debe ser un correo o un número de documento ya registrado. */
async function intentarIdentificar(
  textoEntrante: string,
  numeroNormalizado: string,
): Promise<{ clienteId: string; nombre: string } | null> {
  const valor = textoEntrante.trim();
  const esEmail = valor.includes('@');
  const esDocumento = /^\d{6,15}$/.test(valor.replace(/\D/g, ''));

  let query = supabase.from('users').select('id, nombre').eq('rol', 'Cliente');
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

  return { clienteId: data.id, nombre: data.nombre };
}

// ───── Categorías: resolver por nombre o crear una de seguimiento (presupuesto 0) ─────

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

    default:
      return { error: `tool desconocida: ${toolName}` };
  }
}

// ───── Claude: personalidad + loop de tools ─────

const SYSTEM_PROMPT = `Sos el asistente financiero de Neggo por WhatsApp. Le hablás al cliente de vos (voseo colombiano), con calidez y cero tecnicismos — como un amigo que sabe de plata, no como un banco.

Reglas estrictas:
- Nunca inventes montos ni datos del presupuesto — todo lo que digas sobre plata real (gastos, presupuestos, metas) tiene que salir de una tool. Si no tenés la info, usá la tool correspondiente antes de responder.
- Nunca dés consejo de inversión personalizado ni garantices resultados financieros. Si te preguntan algo así, aclará que no sos asesor financiero certificado y sugerí hablarlo con uno si es una decisión grande.
- Sé breve — esto es WhatsApp, no un ensayo. 2-4 líneas por respuesta como máximo, salvo que te pidan un detalle largo.
- Si el cliente menciona un gasto ("gasté 20 mil en mercado", "me tocó pagar 50000 de uber"), usá registrar_gasto.
- Si pregunta cómo va su presupuesto o cuánto le queda, usá consultar_presupuesto.
- Si pregunta por sus metas o ahorros, usá listar_metas.
- Si el contexto indica que tiene un recibo pendiente de revisión y el cliente te confirma la categoría o dice algo como "sí, confirmalo" o "en mercado", usá confirmar_recibo_pendiente. Si dice que no es válido o que lo borres, usá descartar_recibo_pendiente.`;

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

    let clienteId = await resolverClientePorNumero(numeroNormalizado);

    if (!clienteId) {
      if (tipo !== 'text') {
        await enviarMensajeWhatsapp(from, 'Antes de mandarme fotos, contame tu correo o número de documento registrado en Neggo para identificarte 🙂');
        continue;
      }
      const identificado = await intentarIdentificar(textoEntrante, numeroNormalizado);
      if (!identificado) {
        await enviarMensajeWhatsapp(from, 'No te reconozco todavía. Escribime tu correo o tu número de documento registrado en Neggo para identificarte.');
        continue;
      }
      await enviarMensajeWhatsapp(from, `¡Listo, ${identificado.nombre.split(' ')[0]}! Ya te identifiqué. Contame en qué te ayudo con tus finanzas — podés escribirme o mandarme la foto de un recibo.`);
      continue;
    }

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
