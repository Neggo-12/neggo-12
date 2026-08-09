// Helpers del WhatsApp Cloud API (Meta) — envío de mensajes, verificación de
// firma del webhook, y descarga de media (fotos de recibos).

const META_WHATSAPP_TOKEN = Deno.env.get('META_WHATSAPP_TOKEN')!;
const META_PHONE_NUMBER_ID = Deno.env.get('META_PHONE_NUMBER_ID')!;
const META_APP_SECRET = Deno.env.get('META_APP_SECRET')!;
const GRAPH_VERSION = 'v21.0';

/** Deja solo dígitos — WhatsApp manda los números en formato variable (con/sin +). */
export function normalizarNumero(raw: string): string {
  return raw.replace(/\D/g, '');
}

/** Compara dos strings en tiempo constante (evita timing attacks al validar la firma del webhook). */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Valida que el POST realmente venga de Meta (header X-Hub-Signature-256 = HMAC-SHA256 del body con el App Secret). */
export async function verificarFirmaMeta(rawBody: string, signatureHeader: string | null): Promise<boolean> {
  if (!signatureHeader?.startsWith('sha256=')) return false;
  const expectedHex = signatureHeader.slice('sha256='.length);

  const key = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(META_APP_SECRET),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  );
  const signature = await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(rawBody));
  const computedHex = Array.from(new Uint8Array(signature))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');

  return timingSafeEqual(computedHex, expectedHex);
}

/** Envía un mensaje de texto simple por WhatsApp Cloud API. */
export async function enviarMensajeWhatsapp(numeroDestino: string, texto: string): Promise<void> {
  const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${META_PHONE_NUMBER_ID}/messages`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${META_WHATSAPP_TOKEN}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      messaging_product: 'whatsapp',
      to: numeroDestino,
      type: 'text',
      text: { body: texto },
    }),
  });
  if (!res.ok) {
    console.error('Error enviando mensaje WhatsApp:', await res.text());
  }
}

/** Descarga una imagen recibida por WhatsApp (dos saltos: media_id → url temporal → bytes). */
export async function descargarMediaWhatsapp(mediaId: string): Promise<{ bytes: Uint8Array; mimeType: string } | null> {
  const metaRes = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${mediaId}`, {
    headers: { Authorization: `Bearer ${META_WHATSAPP_TOKEN}` },
  });
  if (!metaRes.ok) {
    console.error('No se pudo resolver media_id:', await metaRes.text());
    return null;
  }
  const meta = await metaRes.json();

  const fileRes = await fetch(meta.url, {
    headers: { Authorization: `Bearer ${META_WHATSAPP_TOKEN}` },
  });
  if (!fileRes.ok) return null;

  const bytes = new Uint8Array(await fileRes.arrayBuffer());
  return { bytes, mimeType: meta.mime_type ?? 'image/jpeg' };
}
