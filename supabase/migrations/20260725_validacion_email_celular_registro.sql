-- Validación de formato de correo/celular en el registro (defensa en profundidad).
-- El frontend (LoginEcosistema.tsx) ya valida con validateEmail/validatePhone en
-- web/src/core/db/supabaseClient.ts, pero las RPC son alcanzables directamente
-- (bypass del frontend), así que se replica la misma regla aquí.
--
-- Alcance: SOLO afecta el flujo de registro (registrar_b2b_completo /
-- registrar_b2c_completo). No toca login/restoreSession — las cuentas ya
-- existentes no se ven afectadas, la validación solo corre al crear una cuenta
-- nueva.
--
-- Reglas:
--  - Formato general de correo: local@dominio.tld (regex simple, espejo del
--    frontend).
--  - Bancos y Constructoras (p_sector IN ('banca','constructora')): el dominio
--    del correo NO puede ser un webmail genérico (gmail.com, hotmail.com, etc.)
--    — deben usar el dominio corporativo real de su entidad.
--  - Celular: 10 dígitos, debe iniciar en 3 (móvil colombiano). Se acepta y
--    limpia el prefijo "+57"/"57" si el número quedó con 12 dígitos. Se
--    rechazan secuencias de dígito repetido (ej: 3000000000, 1111111111).

create or replace function public._validar_formato_email(p_email text)
returns boolean
language sql
immutable
set search_path to 'public'
as $function$
  select p_email ~* '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$';
$function$;

create or replace function public._validar_celular_co(p_celular text)
returns boolean
language plpgsql
immutable
set search_path to 'public'
as $function$
declare
  v_digitos text;
begin
  v_digitos := regexp_replace(p_celular, '[^0-9]', '', 'g');

  if length(v_digitos) = 12 and left(v_digitos, 2) = '57' then
    v_digitos := substring(v_digitos from 3);
  end if;

  if length(v_digitos) != 10 then
    return false;
  end if;

  if left(v_digitos, 1) != '3' then
    return false;
  end if;

  -- Secuencia de un solo dígito repetido 10 veces (ej: 3000000000 NO cae aquí,
  -- pero 3333333333 sí) — mismo criterio que el frontend.
  if v_digitos ~ '^(\d)\1{9}$' then
    return false;
  end if;

  return true;
end;
$function$;

create or replace function public.registrar_b2b_completo(p_razon_social text, p_nit text, p_email text, p_representante text, p_telefono text, p_sector text, p_politica_version text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_uid text;
  v_role text;
  v_org_type text;
  v_existing_rol text;
  v_existing_org_id text;
  v_org_id text;
  v_dominio text;
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

  -- Validación de formato de correo (defensa en profundidad — el frontend ya valida).
  IF NOT public._validar_formato_email(p_email) THEN
    RAISE EXCEPTION 'Correo electrónico inválido.';
  END IF;

  -- Bancos/Constructoras: correo debe ser del dominio corporativo real, no webmail genérico.
  IF p_sector IN ('banca', 'constructora') THEN
    v_dominio := lower(split_part(p_email, '@', 2));
    IF v_dominio = ANY (ARRAY[
      'gmail.com','hotmail.com','outlook.com','yahoo.com','yahoo.es',
      'icloud.com','live.com','msn.com','aol.com','protonmail.com','gmx.com'
    ]) THEN
      RAISE EXCEPTION 'Usa el correo corporativo de tu entidad, no un correo personal genérico.';
    END IF;
  END IF;

  -- Validación de formato de celular/teléfono (móvil colombiano, 10 dígitos, inicia en 3).
  IF NOT public._validar_celular_co(p_telefono) THEN
    RAISE EXCEPTION 'Teléfono inválido — debe ser un celular colombiano de 10 dígitos.';
  END IF;

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
$function$;

create or replace function public.registrar_b2c_completo(p_nombres text, p_apellidos text, p_tipo_id text, p_numero_id text, p_email text, p_celular text, p_rango_ingresos text, p_score_estimado integer, p_politica_version text, p_banco_productos jsonb default '[]'::jsonb)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  -- Validación de formato de correo (defensa en profundidad — el frontend ya valida).
  IF NOT public._validar_formato_email(p_email) THEN
    RAISE EXCEPTION 'Correo electrónico inválido.';
  END IF;

  -- Validación de formato de celular (móvil colombiano, 10 dígitos, inicia en 3).
  IF NOT public._validar_celular_co(p_celular) THEN
    RAISE EXCEPTION 'Celular inválido — debe ser un celular colombiano de 10 dígitos.';
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
$function$;
