-- Señales de interés — negocio_deseado se vuelve opcional para constructora/comercio
-- (el cliente puede registrar interés solo por categoría/ciudad, sin nombrar un negocio
-- específico; evita que Admin tenga que poblar miles de Negocios de Interés para estos
-- 2 sectores). Para sector='banco' sigue siendo obligatorio — el selector de bancos
-- siempre exige elegir una entidad real o un Negocio de Interés por nombre.

ALTER TABLE senales_interes ALTER COLUMN negocio_deseado DROP NOT NULL;

ALTER TABLE senales_interes
  ADD CONSTRAINT senales_interes_negocio_deseado_banco_check
  CHECK (sector <> 'banco' OR negocio_deseado IS NOT NULL);
