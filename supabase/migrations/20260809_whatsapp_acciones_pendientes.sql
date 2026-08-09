-- Step-up de seguridad para acciones que mueven valor real (canjear puntos,
-- aceptar/rechazar oferta) — Fase 1, pieza 3, ronda 3. La sesión OTP de login
-- (whatsapp_identidades.otp_verificado_at) prueba quién es el cliente, pero
-- para estas dos acciones específicas se exige ADEMÁS un segundo código de
-- un solo uso mandado al correo, distinto del de login, que confirma la
-- acción puntual antes de ejecutarla. Nunca se ejecuta directo desde lo que
-- interpretó el modelo de lenguaje sin ese paso.

alter table public.whatsapp_identidades
  add column if not exists accion_pendiente_tipo text
    check (accion_pendiente_tipo in ('canjear_puntos', 'responder_oferta')),
  add column if not exists accion_pendiente_payload jsonb,
  add column if not exists accion_pendiente_codigo text,
  add column if not exists accion_pendiente_expira_at timestamptz;
