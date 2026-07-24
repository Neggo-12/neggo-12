-- Cierra el pendiente #2 del roadmap: mismo bug de no-determinismo (ORDER BY
-- periodo_vigente_desde sin desempate) ya corregido hoy para comercios
-- (resolver_cpl_comercio), ahora también en consolidar_facturacion_mensual
-- para bancos. tarifas_bancos_por_organizacion no tiene created_at (a diferencia
-- de tarifas_comercio_negociadas — es editable in-place, no append-only), por
-- eso hoy no había duplicados reales, pero la debilidad estructural seguía ahí:
-- dos filas de la misma clave/periodo quedaban en orden no determinista.
-- Desempate agregado: updated_at DESC.

CREATE OR REPLACE FUNCTION public.consolidar_facturacion_mensual()
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_periodo_anterior text;
  v_fecha_limite date;
  v_org record;
  v_factura_id text;
  v_monto_total numeric;
  v_snapshot jsonb;
BEGIN
  IF NOT (
    is_platform_admin()
    OR current_user IN ('postgres', 'supabase_admin')
    OR session_user IN ('postgres', 'supabase_admin')
  ) THEN
    RAISE EXCEPTION 'No autorizado: consolidación mensual restringida a administración/cron';
  END IF;

  v_periodo_anterior := to_char(now() - interval '1 month', 'YYYY-MM');
  v_fecha_limite := (date_trunc('month', now())::date + interval '4 days')::date;

  FOR v_org IN
    SELECT DISTINCT fl.organization_id, o.type AS organization_type
    FROM facturas_ledger fl
    JOIN organizations o ON o.id = fl.organization_id
    WHERE fl.periodo = v_periodo_anterior AND fl.factura_mensual_id IS NULL
  LOOP
    SELECT COALESCE(SUM(monto), 0) INTO v_monto_total
      FROM facturas_ledger
      WHERE organization_id = v_org.organization_id
        AND periodo = v_periodo_anterior
        AND factura_mensual_id IS NULL;

    IF v_org.organization_type = 'banco' THEN
      SELECT jsonb_object_agg(
        clave,
        jsonb_build_object('tipoTarifa', tipo_tarifa, 'valor', valor, 'origen', origen)
      ) INTO v_snapshot
      FROM (
        SELECT
          g.clave,
          COALESCE(ov.tipo_tarifa, g.tipo_tarifa) AS tipo_tarifa,
          COALESCE(ov.valor, g.valor) AS valor,
          CASE WHEN ov.valor IS NOT NULL THEN 'override' ELSE 'global' END AS origen
        FROM tarifas_bancos g
        LEFT JOIN LATERAL (
          SELECT tipo_tarifa, valor
          FROM tarifas_bancos_por_organizacion
          WHERE banco_organization_id = v_org.organization_id AND clave = g.clave
            AND periodo_vigente_desde <= v_periodo_anterior
          ORDER BY periodo_vigente_desde DESC, updated_at DESC
          LIMIT 1
        ) ov ON true
      ) resolved;

    ELSIF v_org.organization_type = 'comercio' THEN
      SELECT jsonb_build_object(
        'plan', COALESCE(o.plan_negociacion, 'balanceado'),
        'cpl', pc.cpl,
        'comisionPct', pc.comision_pct
      ) INTO v_snapshot
      FROM organizations o
      LEFT JOIN planes_comercio pc ON pc.clave = COALESCE(o.plan_negociacion, 'balanceado')
      WHERE o.id = v_org.organization_id;

    ELSE
      v_snapshot := jsonb_build_object('successFeeRate', 0.0225);
    END IF;

    v_factura_id := NULL;
    INSERT INTO facturas_mensuales (organization_id, periodo, monto_total, fecha_limite_pago, tarifas_snapshot)
    VALUES (v_org.organization_id, v_periodo_anterior, v_monto_total, v_fecha_limite, v_snapshot)
    ON CONFLICT (organization_id, periodo) DO NOTHING
    RETURNING id INTO v_factura_id;

    IF v_factura_id IS NULL THEN
      SELECT id INTO v_factura_id FROM facturas_mensuales
        WHERE organization_id = v_org.organization_id AND periodo = v_periodo_anterior;
    END IF;

    UPDATE facturas_ledger
      SET factura_mensual_id = v_factura_id
      WHERE organization_id = v_org.organization_id
        AND periodo = v_periodo_anterior
        AND factura_mensual_id IS NULL;
  END LOOP;
END;
$function$;
