-- Fase B — Realtime para ofertas_comercios. Cuando el cliente acepta/rechaza
-- una oferta (responder_oferta_comercio), el comercio con el dashboard
-- abierto recibe el evento al instante vía useOfertaComercioRealtime, sin
-- recargar. Verificado vía MCP antes de esta migración: ya estaba aplicado
-- en producción (REPLICA IDENTITY FULL + tabla en supabase_realtime) — este
-- archivo solo lo respalda como migración, con guardas para poder re-correrlo
-- sin error en cualquier entorno (staging, otra réplica, etc.).

ALTER TABLE ofertas_comercios REPLICA IDENTITY FULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND tablename = 'ofertas_comercios'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE ofertas_comercios;
  END IF;
END $$;
