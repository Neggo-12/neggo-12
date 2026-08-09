-- Gate de autenticación real por OTP para el bot de WhatsApp (Fase 1, pieza 3,
-- ronda 2). El vínculo número↔cliente (whatsapp_identidades) por sí solo NO
-- es prueba suficiente de identidad — se creó con solo un correo/documento
-- dicho por chat, que cualquiera podría intentar adivinar. Antes de ejecutar
-- cualquier acción sobre datos del cliente, el bot exige un código de un solo
-- uso mandado al correo YA registrado (no al que diga el chat), igual que
-- Tabot de Bancolombia para consultas personales.

alter table public.whatsapp_identidades
  add column if not exists otp_code text,
  add column if not exists otp_expires_at timestamptz,
  add column if not exists otp_verificado_at timestamptz;
