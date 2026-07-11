-- Sección 9.1 — pipeline diferenciado por sector. Comercios usa un pipeline
-- corto (Pendiente → Contactado → Vendido → No Interesado) en vez del
-- pipeline largo de Bancos/Constructoras. Expand: solo ampliamos el CHECK
-- para permitir los 2 valores nuevos; 'pendiente' y 'contactado' ya existían
-- y se reutilizan tal cual para Comercios.

-- Verificar primero el nombre real de la constraint (por si difiere del
-- generado por defecto) antes de dropearla:
--   SELECT conname, pg_get_constraintdef(oid) FROM pg_constraint
--   WHERE conrelid = 'me_interesa_destinatarios'::regclass AND contype = 'c';

ALTER TABLE me_interesa_destinatarios
  DROP CONSTRAINT me_interesa_destinatarios_estado_pipeline_check;

ALTER TABLE me_interesa_destinatarios
  ADD CONSTRAINT me_interesa_destinatarios_estado_pipeline_check
  CHECK (estado_pipeline IN (
    'pendiente', 'contactado', 'en_proceso', 'documentacion',
    'viable', 'aprobado', 'desembolsado', 'perdido',
    'vendido', 'no_interesado'
  ));
