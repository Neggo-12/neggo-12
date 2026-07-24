-- Bug confirmado: MisVentasTab.tsx mostraba "Aún no tienes ventas registradas" a
-- pesar de existir facturas_cliente reales, porque fetchVentasComercio usaba un
-- embed !inner a `metas` (categoria/subcategoria/cliente_id). La única política
-- SELECT de metas es `cliente_id = auth.uid() OR is_platform_admin()` — sin
-- cláusula para comercio. RLS descarta silenciosamente las filas del embed sin
-- error visible, resultando en data: [] aunque facturas_cliente/ofertas_comercios
-- sí le dan acceso al comercio.
--
-- Decisión: NO se toca la política RLS general de metas. Esta función SECURITY
-- DEFINER resuelve categoria/subcategoria/cliente_id de un conjunto de meta_ids,
-- validando ownership internamente (solo devuelve metas de ofertas cuyo
-- comercio_id = auth.uid() — el comercio que llama) en vez de abrir el acceso
-- de forma general.

CREATE OR REPLACE FUNCTION public.resolver_metas_para_ventas_comercio(p_meta_ids text[])
RETURNS TABLE(id text, categoria text, subcategoria text, cliente_id text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.categoria, m.subcategoria, m.cliente_id
  FROM metas m
  WHERE m.id = ANY(p_meta_ids)
    AND EXISTS (
      SELECT 1 FROM ofertas_comercios oc
      WHERE oc.meta_id = m.id AND oc.comercio_id = auth.uid()::text
    );
$$;

REVOKE ALL ON FUNCTION resolver_metas_para_ventas_comercio(text[]) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION resolver_metas_para_ventas_comercio(text[]) TO authenticated;
