-- Bug confirmado: confirmar_pago_factura solo actualizaba facturas_mensuales.estado,
-- nunca sincronizaba facturas_ledger.estado_pago de las filas hijas. Resultado: una
-- factura mensual "confirmado_pagado" seguía mostrando sus cargos individuales como
-- "Pendiente de conciliación" en el Admin. Verificado vía MCP: de 33 filas en
-- facturas_ledger, cero tenían jamás un valor distinto al default — 'Pagado' nunca
-- se había usado, a pesar de ser uno de los 3 valores válidos del CHECK constraint
-- (facturas_ledger_estado_pago_check: 'Pendiente de conciliación' | 'Facturado' | 'Pagado').
--
-- Reparación retroactiva aplicada en la misma sesión: las 4 filas de la factura
-- bbef51b2-db99-4740-bfb7-7ee4924b591e (periodo 2026-06, ya confirmada como pagada
-- desde el 12 de julio) se actualizaron a estado_pago = 'Pagado'.

CREATE OR REPLACE FUNCTION public.confirmar_pago_factura(p_factura_id text)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
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

  UPDATE facturas_ledger
    SET estado_pago = 'Pagado'
    WHERE factura_mensual_id = p_factura_id;
END;
$function$;

-- Reparación retroactiva (idempotente — WHERE ya en 'Pagado' no cambia nada si se re-ejecuta).
UPDATE facturas_ledger
SET estado_pago = 'Pagado'
WHERE factura_mensual_id = 'bbef51b2-db99-4740-bfb7-7ee4924b591e';
