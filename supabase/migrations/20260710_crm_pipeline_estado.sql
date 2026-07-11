-- Sección 9.1 del roadmap (docs/negocio-me-interesa-metas.md) — CRM real en
-- Solicitudes. No hay Supabase CLI en este repo: este archivo es solo el
-- registro versionado del cambio; se corre a mano en el SQL editor de
-- Supabase. Patrón expand/contract: `contactado`/`contactado_at` NO se tocan
-- aquí — quedan deprecadas y se eliminan en una migración de "contract"
-- separada una vez el código nuevo esté estable en producción.

-- ───── Expand: pipeline de estados real ─────

ALTER TABLE me_interesa_destinatarios
  ADD COLUMN estado_pipeline text NOT NULL DEFAULT 'pendiente'
  CHECK (estado_pipeline IN (
    'pendiente', 'contactado', 'en_proceso', 'documentacion',
    'viable', 'aprobado', 'desembolsado', 'perdido'
  )),
  ADD COLUMN proxima_gestion_at timestamptz;

-- Backfill desde el booleano actual — preserva el único estado que existía.
UPDATE me_interesa_destinatarios
  SET estado_pipeline = 'contactado'
  WHERE contactado = true;

CREATE INDEX idx_me_interesa_destinatarios_estado_pipeline
  ON me_interesa_destinatarios (organization_id, estado_pipeline);

-- ───── RLS de UPDATE: verificado, no requiere SQL nuevo ─────
-- La policy existente `me_interesa_destinatarios_update_own` ya cubre
-- estado_pipeline y proxima_gestion_at sin cambios: en Postgres las policies
-- de RLS son row-level, no column-level — aplican a la fila completa
-- (incluidas columnas agregadas después con ALTER TABLE), no a una lista fija
-- de columnas fijada al crear la policy. Confirmado además con
-- `SELECT * FROM information_schema.column_privileges WHERE table_name =
-- 'me_interesa_destinatarios'` — ninguna columna tiene un GRANT column-level
-- restrictivo que pudiera excluir a las columnas nuevas.
--
-- Hardening column-level (restringir por GRANT a que solo estado_pipeline y
-- proxima_gestion_at sean escribibles desde el rol authenticated, o un
-- trigger BEFORE UPDATE que revierta cambios a columnas protegidas) queda
-- pendiente para una fase posterior — no es necesario hoy porque el único
-- código que escribe en esta tabla (updateMeInteresaPipelineEstado /
-- updateMeInteresaProximaGestion en repositories.ts) ya solo envía esas dos
-- columnas.
