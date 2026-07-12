-- Respaldo retroactivo: estas 2 funciones se crearon durante la Fase 9.2
-- (capa de facturación) pero nunca quedaron guardadas en un archivo de
-- migración — se corrieron directo en el SQL editor de Supabase. Este
-- archivo documenta su estado tal como existían ANTES del ajuste de la
-- Fase 9.3a (tarifas por banco). Ver 20260711_tarifas_por_banco.sql para
-- el cambio posterior a registrar_cierre_lead.
--
-- SECURITY DEFINER: ambas funciones bypasean RLS por diseño — el monto de
-- cada cargo se calcula íntegramente en Postgres, nunca en el cliente
-- (ver discusión de seguridad en la sesión: las políticas de INSERT en
-- facturas_ledger no pueden validar que el monto sea correcto, solo que
-- organization_id/destinatario_id sean válidos).

CREATE OR REPLACE FUNCTION registrar_cargo_cpl(p_destinatario_id text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organization_id text;
  v_destinatario_type text;
  v_plan text;
  v_monto numeric;
BEGIN
  SELECT organization_id, destinatario_type
    INTO v_organization_id, v_destinatario_type
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

  INSERT INTO facturas_ledger (organization_id, concepto, monto, destinatario_id, periodo, fecha)
  VALUES (v_organization_id, 'CPL', v_monto, p_destinatario_id, to_char(now(), 'YYYY-MM'), now())
  ON CONFLICT (destinatario_id, concepto) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION registrar_cargo_cpl(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_cargo_cpl(text) TO authenticated;


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
  v_estado_cierre text;
  v_monto_cargo numeric;
  v_plan text;
  v_comision_pct numeric;
  v_tarifa_clave text;
  v_tipo_tarifa text;
  v_valor_tarifa numeric;
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
    SELECT producto_bancario INTO v_producto_bancario FROM me_interesa_solicitudes WHERE id = v_solicitud_id;
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
    SELECT tipo_tarifa, valor INTO v_tipo_tarifa, v_valor_tarifa FROM tarifas_bancos WHERE clave = v_tarifa_clave;
    IF v_tipo_tarifa IS NULL THEN
      RETURN;
    END IF;
    v_monto_cargo := CASE
      WHEN v_tipo_tarifa = 'monto_fijo' THEN v_valor_tarifa
      ELSE v_valor_tarifa * (p_monto_cierre / 1000000)
    END;
  END IF;

  INSERT INTO facturas_ledger (organization_id, concepto, monto, destinatario_id, detalle, periodo, fecha)
  VALUES (
    v_organization_id, 'Success Fee', v_monto_cargo, p_destinatario_id,
    jsonb_build_object('montoCierre', p_monto_cierre, 'franquiciaTarjeta', p_franquicia_tarjeta),
    to_char(now(), 'YYYY-MM'), now()
  )
  ON CONFLICT (destinatario_id, concepto) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION registrar_cierre_lead(text, numeric, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_cierre_lead(text, numeric, text) TO authenticated;
