-- Metas/IFC → Leads reales de Comercios (Sección 15, alcance: solo Comercios).
--
-- 1) metas gana persistencia real de status (hoy deleteMeta/completeMeta solo
--    mutan estado local en memoria — se pierde al refrescar la página).
-- 2) fetch_oportunidades_comercio(): función SECURITY DEFINER que expone a un
--    comercio aprobado las metas con IFC activo que coinciden con su
--    categoría, SIN exponer cliente_id — la anonimidad es estructural (la
--    función nunca selecciona esa columna), no una promesa de la capa de app.
--    Solo responde a usuarios que pertenecen a una organización tipo
--    'comercio' con status 'approved' — cualquier otro authenticated recibe
--    un resultado vacío, no un error (evita filtrar inteligencia de demanda
--    agregada a cuentas que no son comercios reales).

-- ───── metas: status real (reemplaza el hardcodeo 'active' en rowToGoalMeta) ─────

ALTER TABLE metas ADD COLUMN status text NOT NULL DEFAULT 'activa'
  CHECK (status IN ('activa', 'completada', 'eliminada'));

ALTER TABLE metas ADD COLUMN completed_at timestamptz;

-- ───── fetch_oportunidades_comercio ─────

CREATE OR REPLACE FUNCTION fetch_oportunidades_comercio(p_categoria text)
RETURNS TABLE (
  meta_id text,
  subcategoria text,
  monto_objetivo numeric,
  monto_ahorrado numeric,
  ahorro_mensual numeric,
  created_at timestamptz
)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT m.id, m.subcategoria, m.monto_objetivo, m.monto_ahorrado, m.ahorro_mensual, m.created_at
  FROM metas m
  WHERE m.ifc_activo = true
    AND m.status = 'activa'
    AND m.categoria = p_categoria
    AND EXISTS (
      SELECT 1 FROM memberships mb
      JOIN organizations o ON o.id = mb.organization_id
      WHERE mb.user_id = auth.uid()::text
        AND mb.is_active
        AND o.type = 'comercio'
        AND o.status = 'approved'
    );
$$;

GRANT EXECUTE ON FUNCTION fetch_oportunidades_comercio(text) TO authenticated;
