-- Fase de confiabilidad — Registro atómico (causa raíz: cuentas medio creadas,
-- caso "odonto" con users+organizations pero sin membership).
--
-- Ambas funciones usan auth.uid() internamente — NUNCA reciben un user_id del
-- cliente. auth.uid() es confiable aquí porque se verificó con SQL real que la
-- confirmación de correo está desactivada: signUp() siempre deja sesión activa
-- inmediata antes de que el frontend llame este RPC.
--
-- Mitigación de auto-escalación: si la fila de users ya existe con un rol
-- DISTINTO al del registro que se intenta, la función falla con excepción —
-- distingue "reintento legítimo del mismo registro" (mismo rol) de
-- "auto-escalación" (un Cliente intentando injertarse una organización B2B).

CREATE OR REPLACE FUNCTION registrar_b2b_completo(
  p_razon_social text,
  p_nit text,
  p_email text,
  p_representante text,
  p_telefono text,
  p_sector text,
  p_politica_version text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_role text;
  v_org_type text;
  v_existing_rol text;
  v_existing_org_id text;
  v_org_id text;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión no establecida — vuelve a intentar el registro.';
  END IF;

  v_role := CASE p_sector
    WHEN 'banca' THEN 'Banco'
    WHEN 'constructora' THEN 'Constructora'
    WHEN 'comercio' THEN 'Comercio'
    ELSE NULL
  END;
  IF v_role IS NULL THEN
    RAISE EXCEPTION 'Sector inválido: %', p_sector;
  END IF;

  v_org_type := CASE p_sector
    WHEN 'banca' THEN 'banco'
    WHEN 'constructora' THEN 'constructora'
    WHEN 'comercio' THEN 'comercio'
  END;

  -- Guarda anti auto-escalación
  SELECT rol INTO v_existing_rol FROM users WHERE id = v_uid;
  IF v_existing_rol IS NOT NULL AND v_existing_rol != v_role THEN
    RAISE EXCEPTION 'Esta cuenta ya está registrada con otro tipo de perfil (%).', v_existing_rol;
  END IF;

  -- 1) users — idempotente ante reintentos (ON CONFLICT DO NOTHING).
  INSERT INTO users (id, email, nombre, rol, status, nit, telefono, representante_legal, tipo_entidad)
  VALUES (v_uid, p_email, p_razon_social, v_role, 'pending_approval', p_nit, p_telefono, p_representante, p_sector)
  ON CONFLICT (id) DO NOTHING;

  -- 2) Si ya existe membership activa, el registro previo quedó completo:
  --    solo se asegura la aceptación de política y se termina.
  SELECT organization_id INTO v_existing_org_id
    FROM memberships WHERE user_id = v_uid AND is_active = true LIMIT 1;

  IF v_existing_org_id IS NOT NULL THEN
    INSERT INTO aceptaciones_politica (id, user_id, version_politica)
    VALUES (gen_random_uuid()::text, v_uid, p_politica_version)
    ON CONFLICT (user_id, version_politica) DO NOTHING;
    RETURN;
  END IF;

  -- 3) Sin membership. Organización con este NIT: huérfana de un intento
  --    previo de ESTE usuario → se reutiliza; vinculada a OTRA cuenta → falla.
  SELECT id INTO v_org_id FROM organizations WHERE nit = p_nit LIMIT 1;

  IF v_org_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1 FROM memberships WHERE organization_id = v_org_id AND user_id != v_uid
    ) THEN
      RAISE EXCEPTION 'Este NIT ya está registrado por otra cuenta en el sistema.';
    END IF;
    -- Huérfana de un intento previo fallido: se reutiliza.
  ELSE
    INSERT INTO organizations (id, name, type, nit, telefono, email, representante_legal, status)
    VALUES (gen_random_uuid()::text, p_razon_social, v_org_type, p_nit, p_telefono, p_email, p_representante, 'pending')
    RETURNING id INTO v_org_id;
  END IF;

  -- 4) membership
  INSERT INTO memberships (id, user_id, organization_id, role, is_active)
  VALUES (gen_random_uuid()::text, v_uid, v_org_id, v_role, true);

  -- 5) aceptación de política
  INSERT INTO aceptaciones_politica (id, user_id, version_politica)
  VALUES (gen_random_uuid()::text, v_uid, p_politica_version)
  ON CONFLICT (user_id, version_politica) DO NOTHING;
END;
$$;

REVOKE ALL ON FUNCTION registrar_b2b_completo(text, text, text, text, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_b2b_completo(text, text, text, text, text, text, text) TO authenticated;

CREATE OR REPLACE FUNCTION registrar_b2c_completo(
  p_nombres text,
  p_apellidos text,
  p_tipo_id text,
  p_numero_id text,
  p_email text,
  p_celular text,
  p_rango_ingresos text,
  p_score_estimado integer,
  p_politica_version text,
  p_banco_productos jsonb DEFAULT '[]'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid text;
  v_existing_rol text;
  v_item jsonb;
  v_org_id text;
  v_producto text;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión no establecida — vuelve a intentar el registro.';
  END IF;

  -- Guarda anti auto-escalación (o des-escalación B2B → Cliente)
  SELECT rol INTO v_existing_rol FROM users WHERE id = v_uid;
  IF v_existing_rol IS NOT NULL AND v_existing_rol != 'Cliente' THEN
    RAISE EXCEPTION 'Esta cuenta ya está registrada con otro tipo de perfil (%).', v_existing_rol;
  END IF;

  -- 1) users — idempotente. Un numero_documento duplicado de OTRA cuenta
  --    sigue fallando naturalmente contra la restricción UNIQUE si existe.
  INSERT INTO users (
    id, email, nombre, first_name, last_name, rol, status,
    telefono, tipo_documento, numero_documento, rango_ingresos, score_estimado
  )
  VALUES (
    v_uid, p_email, trim(p_nombres || ' ' || p_apellidos), p_nombres, p_apellidos, 'Cliente', 'approved',
    p_celular, p_tipo_id, p_numero_id, p_rango_ingresos, p_score_estimado
  )
  ON CONFLICT (id) DO NOTHING;

  -- 2) aceptación de política
  INSERT INTO aceptaciones_politica (id, user_id, version_politica)
  VALUES (gen_random_uuid()::text, v_uid, p_politica_version)
  ON CONFLICT (user_id, version_politica) DO NOTHING;

  -- 3) productos bancarios — ya NO son best-effort, misma transacción.
  --    DELETE+INSERT hace el reintento idempotente.
  DELETE FROM cliente_banco_productos WHERE cliente_id = v_uid;

  FOR v_item IN SELECT * FROM jsonb_array_elements(p_banco_productos)
  LOOP
    v_org_id := v_item->>'organizationId';
    FOR v_producto IN SELECT * FROM jsonb_array_elements_text(v_item->'productos')
    LOOP
      INSERT INTO cliente_banco_productos (id, cliente_id, organization_id, producto)
      VALUES (gen_random_uuid()::text, v_uid, v_org_id, v_producto);
    END LOOP;
  END LOOP;
END;
$$;

REVOKE ALL ON FUNCTION registrar_b2c_completo(text, text, text, text, text, text, text, integer, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION registrar_b2c_completo(text, text, text, text, text, text, text, integer, text, jsonb) TO authenticated;
