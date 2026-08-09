// Helpers compartidos de Google Document AI — usados por procesar-recibo
// (subida desde el portal) y whatsapp-webhook (foto enviada por WhatsApp).
// Un solo lugar para la lógica de autenticación y extracción de campos, así
// no se duplica ni se desincroniza entre las dos funciones.

const GOOGLE_SERVICE_ACCOUNT_EMAIL = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL')!;
const GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY = Deno.env.get('GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY')!;
const GOOGLE_CLOUD_PROJECT_ID = Deno.env.get('GOOGLE_CLOUD_PROJECT_ID')!;
const DOCUMENT_AI_LOCATION = Deno.env.get('DOCUMENT_AI_LOCATION') ?? 'us';
const DOCUMENT_AI_PROCESSOR_ID = Deno.env.get('DOCUMENT_AI_PROCESSOR_ID')!;

export function base64UrlEncode(bytes: Uint8Array): string {
  let str = '';
  for (const b of bytes) str += String.fromCharCode(b);
  return btoa(str).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function pemToArrayBuffer(pem: string): ArrayBuffer {
  const normalized = pem.replace(/\\n/g, '\n');
  const b64 = normalized
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '');
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export async function getGoogleAccessToken(): Promise<string> {
  const header = { alg: 'RS256', typ: 'JWT' };
  const nowSeconds = Math.floor(Date.now() / 1000);
  const claimSet = {
    iss: GOOGLE_SERVICE_ACCOUNT_EMAIL,
    scope: 'https://www.googleapis.com/auth/cloud-platform',
    aud: 'https://oauth2.googleapis.com/token',
    iat: nowSeconds,
    exp: nowSeconds + 3600,
  };

  const encoder = new TextEncoder();
  const headerB64 = base64UrlEncode(encoder.encode(JSON.stringify(header)));
  const claimB64 = base64UrlEncode(encoder.encode(JSON.stringify(claimSet)));
  const unsigned = `${headerB64}.${claimB64}`;

  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign'],
  );

  const signature = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', cryptoKey, encoder.encode(unsigned));
  const jwt = `${unsigned}.${base64UrlEncode(new Uint8Array(signature))}`;

  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenRes.ok) {
    throw new Error(`google token exchange falló: ${await tokenRes.text()}`);
  }

  const tokenBody = await tokenRes.json();
  return tokenBody.access_token as string;
}

interface DocumentAiEntity {
  type?: string;
  mentionText?: string;
  normalizedValue?: { text?: string; moneyValue?: { units?: string; currencyCode?: string } };
  confidence?: number;
}

export interface ExtractedRecibo {
  comercio_extraido: string | null;
  valor_extraido: number | null;
  fecha_extraida: string | null;
  categoria_sugerida: string | null;
  confianza_ocr: number | null;
}

/** Heurística simple por texto del comercio — solo una sugerencia, el cliente siempre puede cambiarla. */
export function sugerirCategoria(comercio: string | null): string | null {
  if (!comercio) return null;
  const c = comercio.toLowerCase();
  if (/(exito|carulla|jumbo|d1|ara|olimpica|supermercado)/.test(c)) return 'Mercado';
  if (/(uber|didi|cabify|taxi|transporte|gasolina|combustible|peaje)/.test(c)) return 'Transporte';
  if (/(restaurante|domicilio|rappi|comida|cafe|panaderia)/.test(c)) return 'Comida';
  if (/(farmacia|drogueria|eps|clinica|hospital)/.test(c)) return 'Salud';
  return null;
}

export function extraerCamposDocumentAi(document: { entities?: DocumentAiEntity[]; text?: string }): ExtractedRecibo {
  const entities = document.entities ?? [];
  const find = (type: string) => entities.find((e) => e.type === type);

  const supplier = find('supplier_name');
  const total = find('total_amount');
  const date = find('receipt_date') ?? find('invoice_date');

  const valor = total?.normalizedValue?.moneyValue?.units
    ? Number(total.normalizedValue.moneyValue.units)
    : total?.mentionText
      ? Number(total.mentionText.replace(/[^\d]/g, ''))
      : null;

  const fecha = date?.normalizedValue?.text ?? null;
  const comercio = supplier?.mentionText ?? null;

  const confianzas = [supplier?.confidence, total?.confidence, date?.confidence].filter(
    (c): c is number => typeof c === 'number',
  );
  const confianza_ocr = confianzas.length ? confianzas.reduce((a, b) => a + b, 0) / confianzas.length : null;

  return {
    comercio_extraido: comercio,
    valor_extraido: valor !== null && !Number.isNaN(valor) ? valor : null,
    fecha_extraida: fecha,
    categoria_sugerida: sugerirCategoria(comercio),
    confianza_ocr,
  };
}

/** Procesa una imagen (bytes + mimeType) con Document AI y devuelve los campos extraídos. Nunca lanza — si algo falla, devuelve todos los campos en null para dejar el registro en staging igual. */
export async function procesarImagenConDocumentAi(bytes: Uint8Array, mimeType: string): Promise<ExtractedRecibo> {
  try {
    let binary = '';
    for (const b of bytes) binary += String.fromCharCode(b);
    const base64Content = btoa(binary);

    const accessToken = await getGoogleAccessToken();
    const processorName = `projects/${GOOGLE_CLOUD_PROJECT_ID}/locations/${DOCUMENT_AI_LOCATION}/processors/${DOCUMENT_AI_PROCESSOR_ID}`;
    const docAiRes = await fetch(
      `https://${DOCUMENT_AI_LOCATION}-documentai.googleapis.com/v1/${processorName}:process`,
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawDocument: { content: base64Content, mimeType } }),
      },
    );

    if (!docAiRes.ok) {
      throw new Error(`Document AI error: ${await docAiRes.text()}`);
    }

    const docAiBody = await docAiRes.json();
    return extraerCamposDocumentAi(docAiBody.document ?? {});
  } catch (err) {
    console.error('OCR falló:', err);
    return {
      comercio_extraido: null,
      valor_extraido: null,
      fecha_extraida: null,
      categoria_sugerida: null,
      confianza_ocr: null,
    };
  }
}
