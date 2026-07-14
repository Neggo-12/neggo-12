import { createClient } from 'jsr:@supabase/supabase-js@2';

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const WEBHOOK_SECRET = Deno.env.get('NOTIFY_WEBHOOK_SECRET')!;
const FROM_ADDRESS = 'Neggo <notificaciones@neggo.co>';

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
);

function buildEmail(evento_tipo: string, payload: Record<string, unknown>): { subject: string; html: string } {
  switch (evento_tipo) {
    case 'oferta_comercio_nueva':
      return {
        subject: `${payload.comercio_nombre} te envió una propuesta`,
        html: `
          <p>Hola ${payload.cliente_nombre},</p>
          <p><strong>${payload.comercio_nombre}</strong> te ofreció:</p>
          <p style="font-size:16px;font-weight:600;">${payload.beneficio}</p>
          <p>${payload.descripcion ?? ''}</p>
          <p>Entra a tu portal de Neggo para revisarla y responder.</p>
        `,
      };
    default:
      throw new Error(`evento_tipo desconocido: ${evento_tipo}`);
  }
}

Deno.serve(async (req: Request) => {
  if (req.headers.get('x-webhook-secret') !== WEBHOOK_SECRET) {
    return new Response('unauthorized', { status: 401 });
  }

  const { log_id, evento_tipo } = await req.json();

  const { data: log, error: logError } = await supabase
    .from('notificaciones_log')
    .select('destinatario_email, payload')
    .eq('id', log_id)
    .single();

  if (logError || !log) {
    return new Response('log not found', { status: 404 });
  }

  try {
    const { subject, html } = buildEmail(evento_tipo, log.payload as Record<string, unknown>);

    const resendRes = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: FROM_ADDRESS,
        to: log.destinatario_email,
        subject,
        html,
      }),
    });

    const resendBody = await resendRes.json();

    if (!resendRes.ok) {
      await supabase.from('notificaciones_log').update({
        estado: 'fallido',
        error: JSON.stringify(resendBody),
        intentos: 1,
      }).eq('id', log_id);
      return new Response('resend error', { status: 502 });
    }

    await supabase.from('notificaciones_log').update({
      estado: 'enviado',
      proveedor_message_id: resendBody.id,
      enviado_at: new Date().toISOString(),
      intentos: 1,
    }).eq('id', log_id);

    return new Response('ok', { status: 200 });
  } catch (err) {
    await supabase.from('notificaciones_log').update({
      estado: 'fallido',
      error: String(err),
      intentos: 1,
    }).eq('id', log_id);
    return new Response('internal error', { status: 500 });
  }
});
