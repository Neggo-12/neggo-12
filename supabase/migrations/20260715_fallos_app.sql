-- Fase A.2 — Observabilidad de fallos de escritura. Hoy un fallo de escritura
-- crítica (RPC, INSERT bloqueado por RLS, excepción) solo se ve en un toast
-- efímero — la evidencia se pierde apenas el usuario cierra la pestaña.
-- Complementa (no reemplaza) a Sentry: Sentry es externo, esta tabla es lo
-- que el Admin revisa DENTRO de Neggo, sin salir de la app.

CREATE TABLE fallos_app (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  -- Sin FK a users(id) a propósito: el caso más importante a capturar es
  -- justo cuando una escritura de REGISTRO falla y la fila de users todavía
  -- no existe — una FK reventaría exactamente en ese caso.
  -- DEFAULT auth.uid()::text en vez de confiar en que el cliente mande el id
  -- correcto: usa el JWT real de la request, no el session.userId del store
  -- (que puede quedar stale cross-tab).
  user_id text DEFAULT auth.uid()::text,
  contexto text NOT NULL CHECK (char_length(contexto) <= 100),
  mensaje text NOT NULL CHECK (char_length(mensaje) <= 500),
  detalle jsonb CHECK (detalle IS NULL OR octet_length(detalle::text) <= 5000),
  url_path text CHECK (url_path IS NULL OR char_length(url_path) <= 300),
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_fallos_app_created_at ON fallos_app (created_at DESC);
CREATE INDEX idx_fallos_app_contexto ON fallos_app (contexto);

ALTER TABLE fallos_app ENABLE ROW LEVEL SECURITY;

-- Riesgo de spam evaluado: cualquiera (incluso anon) puede insertar, ya que
-- los fallos de registro pueden ocurrir antes de tener sesión. Mitigación
-- simple: los CHECK de arriba topan el tamaño máximo de cada fila (peor caso
-- ~6KB), así que el peor abuso posible es "muchas filas pequeñas", no un
-- ataque de payload gigante. No hay UPDATE/DELETE expuestos — es un log de
-- solo-inserción, de solo-lectura para Admin.
CREATE POLICY "cualquiera_inserta_fallo"
ON fallos_app
FOR INSERT
TO authenticated, anon
WITH CHECK (true);

CREATE POLICY "admin_selecciona_fallos"
ON fallos_app
FOR SELECT
USING (is_platform_admin());
