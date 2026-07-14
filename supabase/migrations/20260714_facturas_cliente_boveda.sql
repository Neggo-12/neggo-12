-- Fase 15.2 — Facturación Automática / Bóveda del Cliente.
-- Aplicado directamente vía MCP de Supabase conectado a claude.ai — se
-- documenta aquí retroactivamente para versionado.
--
-- facturas_cliente: factura de una compra real, declarada SIEMPRE por el
-- comercio (nunca por el cliente — mismo criterio que "Vendido" en 9.2.1: el
-- comercio no tiene incentivo para mentir aquí, no hay dinero adicional de
-- Neggo en juego con este evento). La tabla soporta múltiples facturas por
-- oferta a futuro (sin UNIQUE en oferta_id), pero en esta fase solo la
-- PRIMERA factura de una oferta dispara la compleción automática de la meta.

CREATE TABLE facturas_cliente (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  oferta_id text NOT NULL REFERENCES ofertas_comercios(id),
  monto numeric NOT NULL CHECK (monto > 0),
  documento_url text,
  fecha_compra date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_facturas_cliente_oferta_id ON facturas_cliente (oferta_id);

ALTER TABLE facturas_cliente ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente_comercio_admin_selecciona_facturas_cliente"
ON facturas_cliente
FOR SELECT
USING (
  is_platform_admin()
  OR EXISTS (
    SELECT 1 FROM ofertas_comercios o
    WHERE o.id = facturas_cliente.oferta_id
      AND o.comercio_id = auth.uid()::text
  )
  OR EXISTS (
    SELECT 1 FROM ofertas_comercios o
    JOIN metas m ON m.id = o.meta_id
    WHERE o.id = facturas_cliente.oferta_id
      AND m.cliente_id = auth.uid()::text
  )
);

CREATE OR REPLACE FUNCTION registrar_compra_oferta(
  p_oferta_id text,
  p_monto numeric,
  p_fecha_compra date,
  p_documento_url text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_comercio_id text;
  v_estado text;
  v_meta_id text;
BEGIN
  SELECT comercio_id, estado, meta_id
    INTO v_comercio_id, v_estado, v_meta_id
    FROM ofertas_comercios WHERE id = p_oferta_id;

  IF v_comercio_id IS NULL THEN
    RAISE EXCEPTION 'Oferta % no existe', p_oferta_id;
  END IF;

  IF v_comercio_id != auth.uid()::text THEN
    RAISE EXCEPTION 'No autorizado para registrar una compra sobre esta oferta';
  END IF;

  IF v_estado != 'aceptada' THEN
    RAISE EXCEPTION 'La oferta debe estar aceptada para registrar una compra (estado actual: %)', v_estado;
  END IF;

  INSERT INTO facturas_cliente (id, oferta_id, monto, documento_url, fecha_compra)
  VALUES (gen_random_uuid()::text, p_oferta_id, p_monto, p_documento_url, p_fecha_compra);

  UPDATE metas
    SET status = 'completada', completed_at = now(), monto_ahorrado = monto_objetivo
    WHERE id = v_meta_id AND status = 'activa';
END;
$$;

REVOKE ALL ON FUNCTION registrar_compra_oferta(text, numeric, date, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_compra_oferta(text, numeric, date, text) TO authenticated;

INSERT INTO storage.buckets (id, name, public)
VALUES ('facturas-clientes', 'facturas-clientes', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "comercio_sube_su_propia_factura"
ON storage.objects
FOR INSERT
WITH CHECK (
  bucket_id = 'facturas-clientes'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "cliente_comercio_admin_lee_factura"
ON storage.objects
FOR SELECT
USING (
  bucket_id = 'facturas-clientes'
  AND (
    is_platform_admin()
    OR (storage.foldername(name))[1] = auth.uid()::text
    OR EXISTS (
      SELECT 1 FROM facturas_cliente fc
      JOIN ofertas_comercios o ON o.id = fc.oferta_id
      JOIN metas m ON m.id = o.meta_id
      WHERE fc.documento_url = name
        AND m.cliente_id = auth.uid()::text
    )
  )
);
