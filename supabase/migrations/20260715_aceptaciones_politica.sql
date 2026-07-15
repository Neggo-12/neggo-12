-- Cumplimiento — Ley 1581 de 2012: prueba de autorización del titular.
-- Aplicado directamente vía MCP de Supabase conectado a claude.ai — se
-- documenta aquí retroactivamente para versionado.
--
-- aceptaciones_politica: registro inmutable de que un usuario aceptó una
-- versión específica de la Política de Tratamiento de Datos. Nunca se
-- actualiza ni se borra — si la política cambia, se inserta una NUEVA fila
-- con la nueva versión, conservando el historial completo.
--
-- INSERT directo (no vía función SECURITY DEFINER): no hay transición de
-- estado que proteger, solo un append-only de un hecho ya ocurrido (el
-- usuario aceptó, en su propio navegador, en el momento del registro o al
-- iniciar sesión).
--
-- Restricción UNIQUE (user_id, version_politica): evita duplicados cuando el
-- mismo usuario acepta la misma versión más de una vez (registro + login
-- gate, o reintentos) — el código de la app trata la violación de esta
-- restricción (23505) como éxito, no como error.

CREATE TABLE aceptaciones_politica (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  user_id text NOT NULL REFERENCES users(id),
  version_politica text NOT NULL,
  aceptado_at timestamptz NOT NULL DEFAULT now(),
  ip_o_contexto text
);

CREATE INDEX idx_aceptaciones_politica_user_id ON aceptaciones_politica (user_id);

ALTER TABLE aceptaciones_politica ADD CONSTRAINT aceptaciones_politica_user_version_unique
  UNIQUE (user_id, version_politica);

ALTER TABLE aceptaciones_politica ENABLE ROW LEVEL SECURITY;

CREATE POLICY "usuario_inserta_su_propia_aceptacion"
ON aceptaciones_politica
FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

CREATE POLICY "usuario_o_admin_selecciona_aceptaciones"
ON aceptaciones_politica
FOR SELECT
USING (
  user_id = auth.uid()::text
  OR is_platform_admin()
);
