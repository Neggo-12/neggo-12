-- resolver_cpl_comercio ordenaba solo por periodo_vigente_desde DESC — cuando
-- dos o más tarifas negociadas comparten el mismo período (frecuente: probar
-- plantillas el mismo mes, ajustar dos veces el mismo día), Postgres no
-- garantiza ningún orden entre ellas. Confirmado con evidencia real: un
-- comercio con 3 filas en el mismo periodo_vigente_desde resolvía a un CPL
-- no determinista. Se agrega created_at DESC como desempate.

CREATE OR REPLACE FUNCTION public.resolver_cpl_comercio(p_comercio_id text)
 RETURNS numeric
 LANGUAGE sql
 STABLE
 SET search_path TO 'public'
AS $function$
  SELECT COALESCE(
    (
      SELECT cpl FROM tarifas_comercio_negociadas
      WHERE comercio_organization_id = p_comercio_id
        AND periodo_vigente_desde <= to_char(now(), 'YYYY-MM')
      ORDER BY periodo_vigente_desde DESC, created_at DESC
      LIMIT 1
    ),
    (
      SELECT pc.cpl FROM organizations o
      JOIN planes_comercio pc ON pc.clave = COALESCE(o.plan_negociacion, 'balanceado')
      WHERE o.id = p_comercio_id
    ),
    10000
  );
$function$;
