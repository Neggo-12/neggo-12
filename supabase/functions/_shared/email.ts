// Envío de correo vía Resend — mismo proveedor y patrón que send-notification,
// reutilizado acá para el código OTP del gate de autenticación del bot de WhatsApp.

const RESEND_API_KEY = Deno.env.get('RESEND_API_KEY')!;
const FROM_ADDRESS = 'Neggo <notificaciones@neggo.co>';

export async function enviarCodigoOtp(destinatarioEmail: string, codigo: string): Promise<boolean> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: FROM_ADDRESS,
      to: destinatarioEmail,
      subject: `${codigo} es tu código para el asistente de WhatsApp de Neggo`,
      html: `
        <p>Tu código de verificación es:</p>
        <p style="font-size:28px;font-weight:700;letter-spacing:4px;">${codigo}</p>
        <p>Vence en 5 minutos. Si no lo pediste vos, ignorá este correo.</p>
      `,
    }),
  });
  if (!res.ok) {
    console.error('Error enviando OTP por correo:', await res.text());
    return false;
  }
  return true;
}

function enmascararEmail(email: string): string {
  const [user, domain] = email.split('@');
  if (!domain) return email;
  const visible = user.slice(0, 2);
  return `${visible}${'*'.repeat(Math.max(user.length - 2, 1))}@${domain}`;
}

export { enmascararEmail };
