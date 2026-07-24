-- registrar_compra_oferta pasa de RETURNS void a RETURNS text (el id de la
-- fila facturas_cliente recién creada) — necesario para encadenar
-- emitir_puntos_por_compra(factura_id) justo después de confirmar la compra,
-- sin una segunda consulta a facturas_cliente para volver a resolver el id.
-- Cambio aditivo: la lógica interna no cambia, solo se devuelve el id que ya
-- se generaba.

drop function if exists public.registrar_compra_oferta(text, numeric, date, text);

create or replace function public.registrar_compra_oferta(p_oferta_id text, p_monto numeric, p_fecha_compra date, p_documento_url text default null::text)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_comercio_id text;
  v_estado text;
  v_meta_id text;
  v_factura_id text;
BEGIN
  SELECT comercio_id, estado, meta_id
    INTO v_comercio_id, v_estado, v_meta_id
    FROM ofertas_comercios WHERE id = p_oferta_id;

  IF v_comercio_id IS NULL THEN
    RAISE EXCEPTION 'Oferta % no existe', p_oferta_id;
  END IF;

  IF v_comercio_id != auth.uid()::text THEN
    RAISE EXCEPTION 'No autorizado para registrar una compra sobre esta oferta';
  END IF;

  IF v_estado != 'aceptada' THEN
    RAISE EXCEPTION 'La oferta debe estar aceptada para registrar una compra (estado actual: %)', v_estado;
  END IF;

  v_factura_id := gen_random_uuid()::text;
  INSERT INTO facturas_cliente (id, oferta_id, monto, documento_url, fecha_compra)
  VALUES (v_factura_id, p_oferta_id, p_monto, p_documento_url, p_fecha_compra);

  UPDATE metas
    SET status = 'completada', completed_at = now(), monto_ahorrado = monto_objetivo
    WHERE id = v_meta_id AND status = 'activa';

  RETURN v_factura_id;
END;
$function$;
