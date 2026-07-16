-- Fase 15.3 — Cliente responde ofertas (retroactivo: ya aplicado en producción,
-- este archivo solo respalda. Extraído de la base real vía MCP el 2026-07-15).
ALTER TABLE ofertas_comercios ADD COLUMN IF NOT EXISTS estado text NOT NULL DEFAULT 'pendiente';
ALTER TABLE ofertas_comercios ADD COLUMN IF NOT EXISTS respondida_at timestamptz;
ALTER TABLE ofertas_comercios ADD COLUMN IF NOT EXISTS motivo_rechazo text;

CREATE OR REPLACE FUNCTION public.responder_oferta_comercio(p_oferta_id text, p_estado text, p_motivo_rechazo text DEFAULT NULL::text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_meta_id text;
  v_cliente_id text;
  v_estado_actual text;
BEGIN
  IF p_estado NOT IN ('aceptada', 'rechazada') THEN
    RAISE EXCEPTION 'Estado inválido: % (debe ser aceptada o rechazada)', p_estado;
  END IF;
  IF p_motivo_rechazo IS NOT NULL AND p_estado != 'rechazada' THEN
    RAISE EXCEPTION 'motivo_rechazo solo aplica cuando el estado es rechazada';
  END IF;
  SELECT meta_id, estado INTO v_meta_id, v_estado_actual
    FROM ofertas_comercios WHERE id = p_oferta_id;
  IF v_meta_id IS NULL THEN
    RAISE EXCEPTION 'Oferta % no existe', p_oferta_id;
  END IF;
  SELECT cliente_id INTO v_cliente_id FROM metas WHERE id = v_meta_id;
  IF v_cliente_id IS NULL OR v_cliente_id != auth.uid()::text THEN
    RAISE EXCEPTION 'No autorizado para responder esta oferta';
  END IF;
  IF v_estado_actual != 'pendiente' THEN
    RAISE EXCEPTION 'La oferta ya fue respondida (estado actual: %)', v_estado_actual;
  END IF;
  UPDATE ofertas_comercios
    SET estado = p_estado, respondida_at = now(), motivo_rechazo = p_motivo_rechazo
    WHERE id = p_oferta_id;
END;
$function$;

REVOKE ALL ON FUNCTION responder_oferta_comercio(text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION responder_oferta_comercio(text, text, text) TO authenticated;

-- Políticas reales en la base (verificadas vía pg_policies):
-- SELECT "cliente_comercio_admin_selecciona_ofertas": comercio_id = auth.uid()::text OR is_platform_admin() OR EXISTS (SELECT 1 FROM metas m WHERE m.id = meta_id AND m.cliente_id = auth.uid()::text)
-- INSERT "ofertas_insert_owner" WITH CHECK: comercio_id = auth.uid()::text
-- Sin política UPDATE a propósito: todo cambio de estado pasa por responder_oferta_comercio().
