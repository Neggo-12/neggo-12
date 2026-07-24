-- Cierra el hueco de raíz de comisión en la Bóveda del Cliente: registrar_compra_oferta
-- nunca cobró comisión desde su creación (20260714_facturas_cliente_boveda.sql) — hueco de
-- diseño, no regresión. resolver_comision_comercio replica resolver_cpl_comercio pero
-- resolviendo el % de comisión (tarifa negociada > plan global) en vez del CPL.
-- facturacion_automatica (columna en ofertas_comercios, elegida por el comercio al enviar
-- la propuesta) ahora sí controla el cobro automático del Success Fee al confirmarse la venta.
--
-- Nota: durante la primera aplicación de este cambio se perdieron por error las asignaciones
-- completed_at = now() y monto_ahorrado = monto_objetivo del UPDATE metas original — se
-- restauraron en esta misma sesión antes de respaldar (verificado vía MCP que cero compras
-- pasaron por la versión rota). Este archivo ya refleja la versión final corregida.

CREATE OR REPLACE FUNCTION public.resolver_comision_comercio(p_comercio_id text)
RETURNS numeric
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    (
      SELECT comision_pct FROM tarifas_comercio_negociadas
      WHERE comercio_organization_id = p_comercio_id
        AND periodo_vigente_desde <= to_char(now(), 'YYYY-MM')
      ORDER BY periodo_vigente_desde DESC, created_at DESC
      LIMIT 1
    ),
    (
      SELECT pc.comision_pct / 100 FROM organizations o
      JOIN planes_comercio pc ON pc.clave = COALESCE(o.plan_negociacion, 'balanceado')
      WHERE o.id = p_comercio_id
    ),
    0
  );
$$;

REVOKE ALL ON FUNCTION resolver_comision_comercio(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolver_comision_comercio(text) TO authenticated;

CREATE OR REPLACE FUNCTION public.registrar_compra_oferta(
  p_oferta_id text,
  p_monto numeric,
  p_fecha_compra date,
  p_documento_url text DEFAULT NULL
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid text;
  v_comercio_user_id text;
  v_comercio_org_id text;
  v_meta_id text;
  v_facturacion_automatica boolean;
  v_factura_id text;
  v_comision_pct numeric;
  v_monto_cargo numeric;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión no establecida.';
  END IF;

  SELECT comercio_id, meta_id, facturacion_automatica
    INTO v_comercio_user_id, v_meta_id, v_facturacion_automatica
    FROM ofertas_comercios WHERE id = p_oferta_id;

  IF v_comercio_user_id IS NULL THEN
    RAISE EXCEPTION 'Oferta % no existe', p_oferta_id;
  END IF;

  IF v_comercio_user_id != v_uid AND NOT is_platform_admin() THEN
    RAISE EXCEPTION 'No autorizado para registrar esta compra';
  END IF;

  v_factura_id := gen_random_uuid()::text;
  INSERT INTO facturas_cliente (id, oferta_id, monto, documento_url, fecha_compra)
  VALUES (v_factura_id, p_oferta_id, p_monto, p_documento_url, p_fecha_compra);

  UPDATE metas
    SET status = 'completada', completed_at = now(), monto_ahorrado = monto_objetivo
    WHERE id = v_meta_id AND status != 'completada';

  IF v_facturacion_automatica THEN
    SELECT organization_id INTO v_comercio_org_id
      FROM memberships WHERE user_id = v_comercio_user_id AND is_active = true LIMIT 1;

    IF v_comercio_org_id IS NOT NULL THEN
      v_comision_pct := resolver_comision_comercio(v_comercio_org_id);
      v_monto_cargo := p_monto * v_comision_pct;

      IF v_monto_cargo > 0 THEN
        INSERT INTO facturas_ledger (organization_id, concepto, monto, destinatario_id, detalle, periodo, fecha)
        VALUES (
          v_comercio_org_id, 'Success Fee', v_monto_cargo, NULL,
          jsonb_build_object('origen', 'boveda_cliente', 'factura_cliente_id', v_factura_id, 'montoVenta', p_monto),
          to_char(now(), 'YYYY-MM'), now()
        );
      END IF;
    END IF;
  END IF;

  RETURN v_factura_id;
END;
$function$;
