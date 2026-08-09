import { createClient } from 'jsr:@supabase/supabase-js@2';
import { procesarImagenConDocumentAi } from '../_shared/documentAi.ts';

// Edge Function: procesar-recibo
// -------------------------------
// El cliente sube/toma foto de un recibo al bucket privado `recibos-clientes`
// y llama a esta función con el path resultante. Acá:
//   1. Se valida al usuario con SU PROPIO JWT (no service role) — RLS sigue
//      siendo el límite real, tal como establece la filosofía de
//      repositories.ts ("Repositories DO NOT implement security").
//   2. Se descarga la imagen del bucket (RLS ya garantiza que solo puede leer
//      su propia carpeta).
//   3. Se llama a Google Document AI (helper compartido en _shared/documentAi.ts,
//      también usado por whatsapp-webhook para fotos enviadas por WhatsApp).
//   4. Se inserta el resultado en `movimientos_ocr` con estado
//      'pendiente_revision' — NUNCA se toca presupuesto_categorias.gastado
//      acá. Eso solo ocurre cuando el cliente confirma desde el frontend,
//      vía registrarGastoCategoria (ya existente).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
const BUCKET = 'recibos-clientes';

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return new Response('method not allowed', { status: 405 });
  }

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) {
    return new Response('missing authorization', { status: 401 });
  }

  // Cliente scoped al JWT del usuario que llama — RLS sigue siendo el límite
  // real para el select/insert en movimientos_ocr y para leer el storage.
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    global: { headers: { Authorization: authHeader } },
  });

  const { data: userData, error: userError } = await supabase.auth.getUser();
  if (userError || !userData?.user) {
    return new Response('unauthorized', { status: 401 });
  }
  const clienteId = userData.user.id;

  let imagenPath: string;
  try {
    const body = await req.json();
    imagenPath = body.imagen_path;
    if (!imagenPath || typeof imagenPath !== 'string') {
      throw new Error('imagen_path requerido');
    }
  } catch {
    return new Response('body inválido: se espera { imagen_path }', { status: 400 });
  }

  // Defensa en profundidad: aunque RLS de storage ya lo garantiza, verificamos
  // que el path pertenezca a la carpeta del propio usuario antes de procesar.
  if (!imagenPath.startsWith(`${clienteId}/`)) {
    return new Response('forbidden: path no pertenece al usuario', { status: 403 });
  }

  const { data: fileBlob, error: downloadError } = await supabase.storage.from(BUCKET).download(imagenPath);
  if (downloadError || !fileBlob) {
    return new Response(`no se pudo leer la imagen: ${downloadError?.message ?? 'desconocido'}`, { status: 404 });
  }

  const mimeType = fileBlob.type || 'image/jpeg';
  const bytes = new Uint8Array(await fileBlob.arrayBuffer());
  const extracted = await procesarImagenConDocumentAi(bytes, mimeType);

  const id = crypto.randomUUID();
  const { data: inserted, error: insertError } = await supabase
    .from('movimientos_ocr')
    .insert({
      id,
      cliente_id: clienteId,
      imagen_path: imagenPath,
      comercio_extraido: extracted.comercio_extraido,
      valor_extraido: extracted.valor_extraido,
      fecha_extraida: extracted.fecha_extraida,
      categoria_sugerida: extracted.categoria_sugerida,
      confianza_ocr: extracted.confianza_ocr,
    })
    .select()
    .single();

  if (insertError || !inserted) {
    return new Response(`no se pudo guardar el movimiento: ${insertError?.message}`, { status: 500 });
  }

  return new Response(JSON.stringify(inserted), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  });
});
