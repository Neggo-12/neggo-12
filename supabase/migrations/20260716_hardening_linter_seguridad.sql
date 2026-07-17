-- Hardening a partir del linter de seguridad de Supabase (Database Linter /
-- Security Advisors) — 2026-07-16. Ya aplicado en producción vía MCP y
-- verificado; este archivo solo respalda el estado real, NO ejecutar contra
-- la base actual.
--
-- Hallazgos corregidos:
-- 1) 5 funciones auxiliares de RLS sin `search_path` fijo (riesgo de
--    search_path hijacking en SECURITY DEFINER).
-- 2) 11 funciones SECURITY DEFINER con EXECUTE otorgado a anon o a PUBLIC
--    (cuando ninguna debería ser invocable sin sesión autenticada), más una
--    función de trigger (notify_oferta_comercio_nueva) que no debe ser
--    invocable directamente por ningún rol de cliente.
-- 3) 2 funciones sin NINGUNA validación de identidad interna
--    (registrar_cargo_cpl, consolidar_facturacion_mensual) — cualquier
--    usuario autenticado podía fabricar cargos o disparar la consolidación
--    mensual. Guardas agregadas con evidencia real de quién debe poder
--    llamarlas (ver hilo de auditoría).

-- ───── 1. search_path fijo en funciones auxiliares de RLS ─────

ALTER FUNCTION is_platform_admin() SET search_path = public;
ALTER FUNCTION user_org_ids() SET search_path = public;
ALTER FUNCTION me_interesa_client_owns_solicitud(text) SET search_path = public;
ALTER FUNCTION me_interesa_org_has_client(text) SET search_path = public;
ALTER FUNCTION me_interesa_user_is_destinatario(text) SET search_path = public;

-- ───── 2. Privilegios mínimos: REVOKE anon/PUBLIC + GRANT authenticated ─────

REVOKE EXECUTE ON FUNCTION registrar_cargo_cpl(text) FROM anon;
GRANT EXECUTE ON FUNCTION registrar_cargo_cpl(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION consolidar_facturacion_mensual() FROM anon;
GRANT EXECUTE ON FUNCTION consolidar_facturacion_mensual() TO authenticated;

REVOKE EXECUTE ON FUNCTION registrar_cierre_lead(text, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION registrar_cierre_lead(text, numeric, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION registrar_compra_oferta(text, numeric, date, text) FROM anon;
GRANT EXECUTE ON FUNCTION registrar_compra_oferta(text, numeric, date, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION reportar_pago_factura(text) FROM anon;
GRANT EXECUTE ON FUNCTION reportar_pago_factura(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION confirmar_pago_factura(text) FROM anon;
GRANT EXECUTE ON FUNCTION confirmar_pago_factura(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION responder_oferta_comercio(text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION responder_oferta_comercio(text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION registrar_b2b_completo(text, text, text, text, text, text, text) FROM anon;
GRANT EXECUTE ON FUNCTION registrar_b2b_completo(text, text, text, text, text, text, text) TO authenticated;

REVOKE EXECUTE ON FUNCTION registrar_b2c_completo(text, text, text, text, text, text, text, integer, text, jsonb) FROM anon;
GRANT EXECUTE ON FUNCTION registrar_b2c_completo(text, text, text, text, text, text, text, integer, text, jsonb) TO authenticated;

-- fetch_oportunidades_comercio nunca tuvo un REVOKE explícito al crearse —
-- heredaba el EXECUTE implícito de PUBLIC además del GRANT a authenticated.
REVOKE EXECUTE ON FUNCTION fetch_oportunidades_comercio(text) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION fetch_oportunidades_comercio(text) FROM anon;
GRANT EXECUTE ON FUNCTION fetch_oportunidades_comercio(text) TO authenticated;

REVOKE EXECUTE ON FUNCTION resolve_organization_ids_for_users(text[]) FROM anon;
GRANT EXECUTE ON FUNCTION resolve_organization_ids_for_users(text[]) TO authenticated;

-- notify_oferta_comercio_nueva es una función de trigger — la invoca
-- Postgres internamente al disparar el trigger, nunca un rol vía RPC.
REVOKE EXECUTE ON FUNCTION notify_oferta_comercio_nueva() FROM anon, authenticated, PUBLIC;

-- ───── 3. Guardas de identidad ─────

CREATE OR REPLACE FUNCTION public.registrar_cargo_cpl(p_destinatario_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_organization_id text;
  v_destinatario_type text;
  v_solicitud_id text;
  v_plan text;
  v_monto numeric;
  v_detalle jsonb;
BEGIN
  SELECT organization_id, destinatario_type, solicitud_id
    INTO v_organization_id, v_destinatario_type, v_solicitud_id
    FROM me_interesa_destinatarios
    WHERE id = p_destinatario_id;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Destinatario % no existe', p_destinatario_id;
  END IF;

  -- GUARDA DE PROPIEDAD: el cliente solo puede generar el cargo de un
  -- destinatario que cuelga de SU propia solicitud (o admin).
  IF NOT (me_interesa_client_owns_solicitud(v_solicitud_id) OR is_platform_admin()) THEN
    RAISE EXCEPTION 'No autorizado: el destinatario no pertenece a una solicitud propia';
  END IF;

  IF v_destinatario_type = 'comercio' THEN
    SELECT COALESCE(plan_negociacion, 'balanceado') INTO v_plan
      FROM organizations WHERE id = v_organization_id;
    SELECT cpl INTO v_monto FROM planes_comercio WHERE clave = v_plan;
    v_monto := COALESCE(v_monto, 10000);
  ELSE
    v_monto := 30000;
  END IF;

  SELECT jsonb_strip_nulls(jsonb_build_object(
    'origen', v_destinatario_type,
    'productoBancario', producto_bancario,
    'tipoVivienda', tipo_vivienda,
    'ciudad', ciudad,
    'categoria', categoria,
    'subcategoria', subcategoria
  )) INTO v_detalle
  FROM me_interesa_solicitudes WHERE id = v_solicitud_id;

  INSERT INTO facturas_ledger (organization_id, concepto, monto, destinatario_id, detalle, periodo, fecha)
  VALUES (v_organization_id, 'CPL', v_monto, p_destinatario_id, v_detalle, to_char(now(), 'YYYY-MM'), now())
  ON CONFLICT (destinatario_id, concepto) DO NOTHING;
END;
$function$;

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
  -- GUARDA: solo admin de plataforma o el rol de sistema que ejecuta el cron.
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
          ORDER BY periodo_vigente_desde DESC
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
