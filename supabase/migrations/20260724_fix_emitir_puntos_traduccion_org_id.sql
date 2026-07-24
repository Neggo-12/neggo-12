-- Fix: emitir_puntos_por_compra usaba ofertas_comercios.comercio_id (user_id del
-- comercio, auth.uid()) directamente como comercio_origen_id en puntos_movimientos,
-- pero la FK real de puntos_movimientos/puntos_tasas_comercio apunta a organizations.
-- Causaba "violates foreign key constraint puntos_movimientos_comercio_origen_id_fkey",
-- capturado silenciosamente por logFalloApp sin romper la venta.
-- Corregido con traducción user_id -> organization_id vía memberships
-- (mismo patrón usado en comercio_contactos / SolicitudesClientesTab).

CREATE OR REPLACE FUNCTION public.emitir_puntos_por_compra(p_factura_cliente_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_uid text;
  v_comercio_user_id text;
  v_comercio_org_id text;
  v_cliente_id text;
  v_monto numeric;
  v_tasa numeric;
  v_puntos integer;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión no establecida.';
  END IF;

  SELECT oc.comercio_id, m.cliente_id, fc.monto
    INTO v_comercio_user_id, v_cliente_id, v_monto
    FROM facturas_cliente fc
    JOIN ofertas_comercios oc ON oc.id = fc.oferta_id
    JOIN metas m ON m.id = oc.meta_id
    WHERE fc.id = p_factura_cliente_id;

  IF v_comercio_user_id IS NULL THEN
    RAISE EXCEPTION 'Factura % no existe o no tiene comercio/cliente asociado', p_factura_cliente_id;
  END IF;

  IF NOT (v_comercio_user_id = v_uid OR is_platform_admin()) THEN
    RAISE EXCEPTION 'No autorizado para emitir puntos de esta factura';
  END IF;

  IF EXISTS (SELECT 1 FROM puntos_movimientos WHERE factura_cliente_id = p_factura_cliente_id AND tipo = 'ganado') THEN
    RETURN;
  END IF;

  -- Traducción user_id -> organization_id (la FK real de puntos_movimientos).
  SELECT organization_id INTO v_comercio_org_id
    FROM memberships WHERE user_id = v_comercio_user_id AND is_active = true LIMIT 1;

  IF v_comercio_org_id IS NULL THEN
    RAISE EXCEPTION 'No se encontró la organización del comercio %', v_comercio_user_id;
  END IF;

  v_tasa := resolver_tasa_puntos_comercio(v_comercio_org_id);
  v_puntos := floor(v_monto / 1000 * v_tasa);

  IF v_puntos <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO puntos_movimientos (cliente_id, tipo, puntos, comercio_origen_id, factura_cliente_id, fecha_vencimiento)
  VALUES (v_cliente_id, 'ganado', v_puntos, v_comercio_org_id, p_factura_cliente_id, (now() + interval '12 months')::date);
END;
$function$;
