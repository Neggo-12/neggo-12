-- Fase 16 — Sistema de notificaciones (correo al cliente vía Resend).
-- Aplicado directamente vía MCP de Supabase conectado a Claude (claude.ai),
-- no a través de Claude Code — se documenta aquí retroactivamente para
-- versionado, mismo patrón que 20260710_facturas_cpl_cierre_functions.sql.
--
-- NO incluye el valor del secreto compartido (notify_webhook_secret) ni la
-- API key de Resend — ambos viven en Supabase Vault / Edge Function Secrets,
-- nunca en el repo.

CREATE EXTENSION IF NOT EXISTS pg_net;

CREATE TABLE notificaciones_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  evento_tipo text NOT NULL,
  entidad_id text NOT NULL,
  destinatario_user_id text REFERENCES users(id),
  destinatario_email text NOT NULL,
  proveedor text NOT NULL DEFAULT 'resend',
  proveedor_message_id text,
  estado text NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'enviado', 'fallido')),
  error text,
  payload jsonb NOT NULL,
  intentos int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  enviado_at timestamptz,

  UNIQUE (evento_tipo, entidad_id)
);

CREATE INDEX idx_notificaciones_log_estado ON notificaciones_log(estado) WHERE estado = 'pendiente';

ALTER TABLE notificaciones_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_selecciona_notificaciones_log"
ON notificaciones_log
FOR SELECT
USING (is_platform_admin());

CREATE OR REPLACE FUNCTION notify_oferta_comercio_nueva()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cliente_id text;
  v_cliente_email text;
  v_cliente_nombre text;
  v_log_id uuid;
  v_shared_secret text;
BEGIN
  SELECT u.id, u.email, u.nombre
    INTO v_cliente_id, v_cliente_email, v_cliente_nombre
    FROM metas m
    JOIN users u ON u.id = m.cliente_id
    WHERE m.id = NEW.meta_id;

  IF v_cliente_email IS NULL THEN
    RETURN NEW;
  END IF;

  INSERT INTO notificaciones_log (
    evento_tipo, entidad_id, destinatario_user_id, destinatario_email, payload
  ) VALUES (
    'oferta_comercio_nueva',
    NEW.id,
    v_cliente_id,
    v_cliente_email,
    jsonb_build_object(
      'cliente_nombre', v_cliente_nombre,
      'comercio_nombre', NEW.comercio_nombre,
      'beneficio', NEW.beneficio,
      'descripcion', NEW.descripcion,
      'meta_id', NEW.meta_id
    )
  )
  RETURNING id INTO v_log_id;

  SELECT decrypted_secret INTO v_shared_secret
    FROM vault.decrypted_secrets WHERE name = 'notify_webhook_secret';

  PERFORM net.http_post(
    url := 'https://idbyahyffuhvircgzpvg.supabase.co/functions/v1/send-notification',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'x-webhook-secret', v_shared_secret
    ),
    body := jsonb_build_object('log_id', v_log_id, 'evento_tipo', 'oferta_comercio_nueva'),
    timeout_milliseconds := 5000
  );

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_oferta_comercio_nueva
  AFTER INSERT ON ofertas_comercios
  FOR EACH ROW
  EXECUTE FUNCTION notify_oferta_comercio_nueva();
