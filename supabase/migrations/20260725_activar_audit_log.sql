-- Fase 1 del "SIEM-lite" (consolidar telemetría existente, sin servidor nuevo).
-- audit_log existe en el esquema desde antes pero NINGUNA función le escribía
-- (confirmado en la auditoría del 24 jul: 1 sola fila, del 2 de julio, huérfana).
-- Sin esto no hay rastro real de auditoría — para un fintech bajo Ley 1581 es
-- la base de cualquier trazabilidad de "quién hizo qué, cuándo" y de respuesta
-- a incidentes.
--
-- Alcance de esta fase: registrar la FINALIZACIÓN exitosa de las 7 funciones
-- SECURITY DEFINER que mueven dinero o cambian estado sensible (ya revisadas
-- en la auditoría de seguridad). Los intentos fallidos (RAISE EXCEPTION) abortan
-- la transacción completa, así que un intento no autorizado no deja rastro en
-- audit_log en esta fase — registrar también los intentos fallidos requiere
-- una transacción autónoma (dblink/pg_background) y queda fuera de esta fase
-- por complejidad/costo vs. beneficio en el volumen actual del piloto.

create or replace function public._log_audit(
  p_event_type text,
  p_user_id text,
  p_organization_id text default null,
  p_metadata jsonb default '{}'::jsonb
)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_email text;
begin
  if p_user_id is not null then
    select email into v_email from users where id = p_user_id;
  end if;

  insert into audit_log (id, event_type, user_id, email, organization_id, metadata, created_at)
  values (gen_random_uuid()::text, p_event_type, p_user_id, v_email, p_organization_id, p_metadata, now());
end;
$function$;

-- ── canjear_puntos ──────────────────────────────────────────────────────────
create or replace function public.canjear_puntos(p_comercio_id text, p_puntos integer)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_uid text;
  v_saldo integer;
  v_movimiento_id text;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión no establecida.';
  END IF;

  IF p_puntos IS NULL OR p_puntos <= 0 THEN
    RAISE EXCEPTION 'La cantidad de puntos a canjear debe ser mayor a cero';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_comercio_id AND type IN ('comercio', 'constructora') AND status = 'approved') THEN
    RAISE EXCEPTION 'Comercio/constructora no válido para canje';
  END IF;

  v_saldo := saldo_puntos_cliente(v_uid);
  IF v_saldo < p_puntos THEN
    RAISE EXCEPTION 'Saldo insuficiente: tienes % puntos, intentas canjear %', v_saldo, p_puntos;
  END IF;

  v_movimiento_id := gen_random_uuid()::text;
  INSERT INTO puntos_movimientos (id, cliente_id, tipo, puntos, comercio_canje_id)
  VALUES (v_movimiento_id, v_uid, 'canjeado', -p_puntos, p_comercio_id);

  PERFORM public._log_audit('puntos.canjeado', v_uid, p_comercio_id,
    jsonb_build_object('puntos', p_puntos, 'movimientoId', v_movimiento_id));

  RETURN v_movimiento_id;
END;
$function$;

-- ── confirmar_pago_factura ──────────────────────────────────────────────────
create or replace function public.confirmar_pago_factura(p_factura_id text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_estado text;
  v_organization_id text;
BEGIN
  IF NOT is_platform_admin() THEN
    RAISE EXCEPTION 'Solo Admin puede confirmar pagos';
  END IF;

  SELECT estado, organization_id INTO v_estado, v_organization_id FROM facturas_mensuales WHERE id = p_factura_id;

  IF v_estado IS NULL THEN
    RAISE EXCEPTION 'Factura % no existe', p_factura_id;
  END IF;

  IF v_estado != 'reportado_por_negocio' THEN
    RAISE EXCEPTION 'La factura debe estar en reportado_por_negocio para confirmarse (estado actual: %)', v_estado;
  END IF;

  UPDATE facturas_mensuales
    SET estado = 'confirmado_pagado', confirmado_at = now(), confirmado_by = auth.uid()::text
    WHERE id = p_factura_id;

  UPDATE facturas_ledger
    SET estado_pago = 'Pagado'
    WHERE factura_mensual_id = p_factura_id;

  PERFORM public._log_audit('factura.pago_confirmado', auth.uid()::text, v_organization_id,
    jsonb_build_object('facturaId', p_factura_id));
END;
$function$;

-- ── emitir_puntos_por_compra ─────────────────────────────────────────────────
create or replace function public.emitir_puntos_por_compra(p_factura_cliente_id text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  PERFORM public._log_audit('puntos.emitido', v_uid, v_comercio_org_id,
    jsonb_build_object('clienteId', v_cliente_id, 'puntos', v_puntos, 'facturaClienteId', p_factura_cliente_id));
END;
$function$;

-- ── registrar_cierre_lead ─────────────────────────────────────────────────────
create or replace function public.registrar_cierre_lead(p_destinatario_id text, p_monto_cierre numeric, p_franquicia_tarjeta text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  PERFORM public._log_audit('lead.cierre_registrado', auth.uid()::text, v_organization_id,
    jsonb_build_object('destinatarioId', p_destinatario_id, 'estadoCierre', v_estado_cierre,
      'montoCierre', p_monto_cierre, 'tipo', v_destinatario_type));

  IF v_destinatario_type = 'constructora' THEN
    v_monto_cargo := p_monto_cierre * 0.0225;

  ELSIF v_destinatario_type = 'comercio' THEN
    SELECT COALESCE(plan_negociacion, 'balanceado') INTO v_plan
      FROM organizations WHERE id = v_organization_id;
    SELECT comision_pct INTO v_comision_pct FROM planes_comercio WHERE clave = v_plan;
    v_comision_pct := COALESCE(v_comision_pct, 0);
    IF v_comision_pct = 0 THEN
      RETURN;
    END IF;
    v_monto_cargo := p_monto_cierre * (v_comision_pct / 100);

  ELSE
    v_tarifa_clave := CASE
      WHEN p_franquicia_tarjeta IS NOT NULL THEN p_franquicia_tarjeta
      WHEN v_producto_bancario = 'credito-hipotecario' THEN 'credito_hipotecario'
      WHEN v_producto_bancario = 'libre-inversion' THEN 'libre_inversion'
      WHEN v_producto_bancario = 'retanqueo' THEN 'retanqueo'
      WHEN v_producto_bancario = 'compra-cartera' THEN 'compra_cartera'
      ELSE NULL
    END;
    IF v_tarifa_clave IS NULL THEN
      RETURN;
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
$function$;

-- ── registrar_compra_oferta ───────────────────────────────────────────────────
create or replace function public.registrar_compra_oferta(p_oferta_id text, p_monto numeric, p_fecha_compra date, p_documento_url text default null::text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  SELECT organization_id INTO v_comercio_org_id
    FROM memberships WHERE user_id = v_comercio_user_id AND is_active = true LIMIT 1;

  PERFORM public._log_audit('compra.registrada', v_uid, v_comercio_org_id,
    jsonb_build_object('ofertaId', p_oferta_id, 'monto', p_monto, 'facturaClienteId', v_factura_id));

  IF v_facturacion_automatica AND v_comercio_org_id IS NOT NULL THEN
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

  RETURN v_factura_id;
END;
$function$;

-- ── reportar_pago_factura ────────────────────────────────────────────────────
create or replace function public.reportar_pago_factura(p_factura_id text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
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

  PERFORM public._log_audit('factura.pago_reportado', auth.uid()::text, v_organization_id,
    jsonb_build_object('facturaId', p_factura_id));
END;
$function$;

-- ── responder_oferta_comercio ─────────────────────────────────────────────────
create or replace function public.responder_oferta_comercio(p_oferta_id text, p_estado text, p_motivo_rechazo text default null::text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_meta_id text;
  v_cliente_id text;
  v_estado_actual text;
BEGIN
  IF p_estado NOT IN ('aceptada', 'rechazada') THEN
    RAISE EXCEPTION 'Estado inválido: % (debe ser aceptada o rechazada)', p_estado;
  END IF;
  IF p_motivo_rechazo IS NOT NULL AND p_estado != 'rechazada' THEN
    RAISE EXCEPTION 'motivo_rechazo solo aplica cuando el estado es rechazada';
  END IF;
  SELECT meta_id, estado INTO v_meta_id, v_estado_actual
    FROM ofertas_comercios WHERE id = p_oferta_id;
  IF v_meta_id IS NULL THEN
    RAISE EXCEPTION 'Oferta % no existe', p_oferta_id;
  END IF;
  SELECT cliente_id INTO v_cliente_id FROM metas WHERE id = v_meta_id;
  IF v_cliente_id IS NULL OR v_cliente_id != auth.uid()::text THEN
    RAISE EXCEPTION 'No autorizado para responder esta oferta';
  END IF;
  IF v_estado_actual != 'pendiente' THEN
    RAISE EXCEPTION 'La oferta ya fue respondida (estado actual: %)', v_estado_actual;
  END IF;
  UPDATE ofertas_comercios
    SET estado = p_estado, respondida_at = now(), motivo_rechazo = p_motivo_rechazo
    WHERE id = p_oferta_id;

  PERFORM public._log_audit('oferta.respondida', v_cliente_id, NULL,
    jsonb_build_object('ofertaId', p_oferta_id, 'estado', p_estado, 'motivoRechazo', p_motivo_rechazo));
END;
$function$;
