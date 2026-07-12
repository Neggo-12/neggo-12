-- Fase 9.3a — Tarifas por banco (personalizadas, con historial versionado).
-- tarifas_bancos (global) sigue siendo el valor de respaldo cuando un banco
-- no tiene tarifa negociada propia. No es "1 fila = tarifa actual": cada
-- cambio de tarifa inserta una fila nueva con un periodo_vigente_desde
-- posterior — nunca se pisa una fila vieja, para que registrar_cierre_lead
-- pueda reconstruir qué tarifa aplicaba en cualquier mes pasado.

CREATE TABLE tarifas_bancos_por_organizacion (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  banco_organization_id text NOT NULL REFERENCES organizations(id),
  clave text NOT NULL,
  tipo_tarifa text NOT NULL CHECK (tipo_tarifa IN ('por_millon_desembolsado', 'monto_fijo')),
  valor numeric NOT NULL,
  periodo_vigente_desde text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (banco_organization_id, clave, periodo_vigente_desde)
);

CREATE INDEX idx_tarifas_org_banco ON tarifas_bancos_por_organizacion (banco_organization_id);

-- ───── RLS ─────
-- SELECT: el banco dueño ve sus propias tarifas negociadas (vía membership);
-- Admin ve las de todos. Ningún otro negocio ve tarifas ajenas.
-- INSERT/UPDATE: solo Admin.

ALTER TABLE tarifas_bancos_por_organizacion ENABLE ROW LEVEL SECURITY;

CREATE POLICY "banco_selecciona_su_propia_tarifa_o_admin"
ON tarifas_bancos_por_organizacion
FOR SELECT
USING (
  banco_organization_id IN (
    SELECT organization_id FROM memberships
    WHERE user_id = auth.uid()::text AND is_active = true
  )
  OR is_platform_admin()
);

CREATE POLICY "admin_insert_tarifa_organizacion"
ON tarifas_bancos_por_organizacion
FOR INSERT
WITH CHECK (is_platform_admin());

CREATE POLICY "admin_update_tarifa_organizacion"
ON tarifas_bancos_por_organizacion
FOR UPDATE
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- ───── Ajuste a registrar_cierre_lead: fallback banco → override → global ─────
-- CREATE OR REPLACE completo (Postgres no permite "parchar" solo un bloque
-- de una función) — único cambio real es la sección "ELSE -- banco", que
-- ahora primero busca en tarifas_bancos_por_organizacion (versión vigente
-- más reciente <= mes actual) antes de caer al valor global de tarifas_bancos.

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

    -- Fase 9.3a: primero la tarifa negociada específica de este banco
    -- (versión vigente más reciente <= mes actual); si no existe, cae al
    -- valor global de tarifas_bancos.
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
