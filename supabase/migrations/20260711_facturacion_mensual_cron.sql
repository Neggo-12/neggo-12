-- Fase 9.3b — Facturación mensual + cron.
--
-- facturas_mensuales consolida los cargos individuales de facturas_ledger
-- una vez al mes. RLS: solo SELECT para negocios (lo suyo) y Admin (todo) —
-- los cambios de estado pasan por reportar_pago_factura/confirmar_pago_factura,
-- nunca por UPDATE directo.
--
-- consolidar_facturacion_mensual() es SECURITY DEFINER explícita (no se
-- confía en que pg_cron corra como postgres implícitamente, como pediste) y
-- NO se otorga EXECUTE a `authenticated` — solo la invoca pg_cron (que corre
-- como el rol que agenda el job, típicamente postgres, sin pasar por
-- PostgREST) o un superusuario manualmente para pruebas/backfill.
--
-- Antes de correr este archivo: confirma que pg_cron está habilitado
-- (Dashboard → Database → Extensions, o `SELECT * FROM pg_extension WHERE
-- extname = 'pg_cron'`) — instrucciones ya dadas en el hilo.

-- ───── 1. facturas_mensuales ─────

CREATE TABLE facturas_mensuales (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  organization_id text NOT NULL REFERENCES organizations(id),
  periodo text NOT NULL,
  monto_total numeric NOT NULL DEFAULT 0,
  fecha_limite_pago date NOT NULL,
  estado text NOT NULL DEFAULT 'pendiente_pago'
    CHECK (estado IN ('pendiente_pago', 'reportado_por_negocio', 'confirmado_pagado')),
  tarifas_snapshot jsonb,
  reportado_at timestamptz,
  confirmado_at timestamptz,
  confirmado_by text REFERENCES users(id),
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (organization_id, periodo)
);

CREATE INDEX idx_facturas_mensuales_org ON facturas_mensuales (organization_id);
CREATE INDEX idx_facturas_mensuales_estado ON facturas_mensuales (estado);

ALTER TABLE facturas_mensuales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_members_select_own_facturas_mensuales"
ON facturas_mensuales
FOR SELECT
USING (
  organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid()::text AND is_active = true
  )
  OR is_platform_admin()
);

-- ───── 2. facturas_ledger: enlace a su factura consolidada ─────

ALTER TABLE facturas_ledger
  ADD COLUMN factura_mensual_id text REFERENCES facturas_mensuales(id);

-- ───── 3. consolidar_facturacion_mensual() — corre vía pg_cron el día 1 ─────

CREATE OR REPLACE FUNCTION consolidar_facturacion_mensual()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_periodo_anterior text;
  v_fecha_limite date;
  v_org record;
  v_factura_id text;
  v_monto_total numeric;
  v_snapshot jsonb;
BEGIN
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

    -- Snapshot de qué tarifas/plan aplicaban este mes para este negocio.
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

    ELSE -- constructora
      v_snapshot := jsonb_build_object('successFeeRate', 0.0225);
    END IF;

    v_factura_id := NULL;
    INSERT INTO facturas_mensuales (organization_id, periodo, monto_total, fecha_limite_pago, tarifas_snapshot)
    VALUES (v_org.organization_id, v_periodo_anterior, v_monto_total, v_fecha_limite, v_snapshot)
    ON CONFLICT (organization_id, periodo) DO NOTHING
    RETURNING id INTO v_factura_id;

    IF v_factura_id IS NULL THEN
      -- Ya existía (reintento del cron) — recuperar su id para enlazar
      -- cualquier cargo que haya quedado suelto.
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
$$;

-- Nota: sin GRANT a `authenticated` — solo pg_cron / un superusuario la invocan.
REVOKE ALL ON FUNCTION consolidar_facturacion_mensual() FROM PUBLIC;

SELECT cron.schedule(
  'facturacion-mensual',
  '0 11 1 * *',  -- 11:00 UTC = 6:00 a.m. Colombia, día 1 de cada mes
  $$ SELECT consolidar_facturacion_mensual(); $$
);

-- ───── 4. reportar_pago_factura — el negocio marca su factura como pagada ─────

CREATE OR REPLACE FUNCTION reportar_pago_factura(p_factura_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organization_id text;
  v_estado text;
BEGIN
  SELECT organization_id, estado INTO v_organization_id, v_estado
    FROM facturas_mensuales WHERE id = p_factura_id;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Factura % no existe', p_factura_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()::text AND organization_id = v_organization_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'No autorizado para reportar esta factura';
  END IF;

  IF v_estado != 'pendiente_pago' THEN
    RAISE EXCEPTION 'La factura debe estar en pendiente_pago para reportarse (estado actual: %)', v_estado;
  END IF;

  UPDATE facturas_mensuales
    SET estado = 'reportado_por_negocio', reportado_at = now()
    WHERE id = p_factura_id;
END;
$$;

REVOKE ALL ON FUNCTION reportar_pago_factura(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION reportar_pago_factura(text) TO authenticated;

-- ───── 5. confirmar_pago_factura — Admin confirma que el pago llegó ─────

CREATE OR REPLACE FUNCTION confirmar_pago_factura(p_factura_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_estado text;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Solo Admin puede confirmar pagos';
  END IF;

  SELECT estado INTO v_estado FROM facturas_mensuales WHERE id = p_factura_id;

  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Factura % no existe', p_factura_id;
  END IF;

  IF v_estado != 'reportado_por_negocio' THEN
    RAISE EXCEPTION 'La factura debe estar en reportado_por_negocio para confirmarse (estado actual: %)', v_estado;
  END IF;

  UPDATE facturas_mensuales
    SET estado = 'confirmado_pagado', confirmado_at = now(), confirmado_by = auth.uid()::text
    WHERE id = p_factura_id;
END;
$$;

REVOKE ALL ON FUNCTION confirmar_pago_factura(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION confirmar_pago_factura(text) TO authenticated;

-- ───── 6. registrar_cargo_cpl — agrega detalle con el producto/servicio ─────

CREATE OR REPLACE FUNCTION registrar_cargo_cpl(p_destinatario_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
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
$$;

REVOKE ALL ON FUNCTION registrar_cargo_cpl(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_cargo_cpl(text) TO authenticated;

-- ───── 7. registrar_cierre_lead — agrega el mismo detalle de producto/servicio ─────

CREATE OR REPLACE FUNCTION registrar_cierre_lead(
  p_destinatario_id text,
  p_monto_cierre numeric,
  p_franquicia_tarjeta text DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organization_id text;
  v_destinatario_type text;
  v_solicitud_id text;
  v_producto_bancario text;
  v_tipo_vivienda text;
  v_ciudad text;
  v_categoria text;
  v_subcategoria text;
  v_estado_cierre text;
  v_monto_cargo numeric;
  v_plan text;
  v_comision_pct numeric;
  v_tarifa_clave text;
  v_tipo_tarifa text;
  v_valor_tarifa numeric;
  v_detalle jsonb;
BEGIN
  SELECT organization_id, destinatario_type, solicitud_id
    INTO v_organization_id, v_destinatario_type, v_solicitud_id
    FROM me_interesa_destinatarios
    WHERE id = p_destinatario_id;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Destinatario % no existe', p_destinatario_id;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM memberships
    WHERE user_id = auth.uid()::text AND organization_id = v_organization_id AND is_active = true
  ) THEN
    RAISE EXCEPTION 'No autorizado para cerrar este lead';
  END IF;

  SELECT producto_bancario, tipo_vivienda, ciudad, categoria, subcategoria
    INTO v_producto_bancario, v_tipo_vivienda, v_ciudad, v_categoria, v_subcategoria
    FROM me_interesa_solicitudes WHERE id = v_solicitud_id;

  v_estado_cierre := CASE WHEN v_destinatario_type IN ('banco', 'constructora') THEN 'desembolsado' ELSE 'vendido' END;

  UPDATE me_interesa_destinatarios
    SET estado_pipeline = v_estado_cierre,
        monto_cierre = p_monto_cierre,
        franquicia_tarjeta = p_franquicia_tarjeta
    WHERE id = p_destinatario_id;

  IF v_destinatario_type = 'constructora' THEN
    v_monto_cargo := p_monto_cierre * 0.0225;

  ELSIF v_destinatario_type = 'comercio' THEN
    SELECT COALESCE(plan_negociacion, 'balanceado') INTO v_plan
      FROM organizations WHERE id = v_organization_id;
    SELECT comision_pct INTO v_comision_pct FROM planes_comercio WHERE clave = v_plan;
    v_comision_pct := COALESCE(v_comision_pct, 0);
    IF v_comision_pct = 0 THEN
      RETURN; -- Plan Solo Pauta: sin comisión, no se genera cargo
    END IF;
    v_monto_cargo := p_monto_cierre * (v_comision_pct / 100);

  ELSE -- banco
    v_tarifa_clave := CASE
      WHEN p_franquicia_tarjeta IS NOT NULL THEN p_franquicia_tarjeta
      WHEN v_producto_bancario = 'credito-hipotecario' THEN 'credito_hipotecario'
      WHEN v_producto_bancario = 'libre-inversion' THEN 'libre_inversion'
      WHEN v_producto_bancario = 'retanqueo' THEN 'retanqueo'
      WHEN v_producto_bancario = 'compra-cartera' THEN 'compra_cartera'
      ELSE NULL
    END;
    IF v_tarifa_clave IS NULL THEN
      RETURN; -- ej. CDT: sin tarifa configurada, no se cobra
    END IF;

    SELECT tipo_tarifa, valor INTO v_tipo_tarifa, v_valor_tarifa
      FROM tarifas_bancos_por_organizacion
      WHERE banco_organization_id = v_organization_id AND clave = v_tarifa_clave
        AND periodo_vigente_desde <= to_char(now(), 'YYYY-MM')
      ORDER BY periodo_vigente_desde DESC
      LIMIT 1;

    IF v_tipo_tarifa IS NULL THEN
      SELECT tipo_tarifa, valor INTO v_tipo_tarifa, v_valor_tarifa
        FROM tarifas_bancos WHERE clave = v_tarifa_clave;
    END IF;

    IF v_tipo_tarifa IS NULL THEN
      RETURN;
    END IF;
    v_monto_cargo := CASE
      WHEN v_tipo_tarifa = 'monto_fijo' THEN v_valor_tarifa
      ELSE v_valor_tarifa * (p_monto_cierre / 1000000)
    END;
  END IF;

  IF v_monto_cargo = 0 THEN
    RETURN;
  END IF;

  v_detalle := jsonb_strip_nulls(jsonb_build_object(
    'origen', v_destinatario_type,
    'productoBancario', v_producto_bancario,
    'tipoVivienda', v_tipo_vivienda,
    'ciudad', v_ciudad,
    'categoria', v_categoria,
    'subcategoria', v_subcategoria,
    'montoCierre', p_monto_cierre,
    'franquiciaTarjeta', p_franquicia_tarjeta
  ));

  INSERT INTO facturas_ledger (organization_id, concepto, monto, destinatario_id, detalle, periodo, fecha)
  VALUES (v_organization_id, 'Success Fee', v_monto_cargo, p_destinatario_id, v_detalle, to_char(now(), 'YYYY-MM'), now())
  ON CONFLICT (destinatario_id, concepto) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION registrar_cierre_lead(text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_cierre_lead(text, numeric, text) TO authenticated;
