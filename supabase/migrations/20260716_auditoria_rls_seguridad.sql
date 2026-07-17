-- Auditoría de seguridad RLS (skill neggo-security) — 2 hallazgos cerrados.
--
-- 1) mem_insert_self_or_admin (memberships, INSERT) permitía a un usuario
--    autenticado insertarse a sí mismo como miembro de CUALQUIER
--    organización — no solo la propia. Secuenciado sin romper flujos vivos:
--    el registro atómico (registrar_b2b/b2c_completo) crea memberships desde
--    dentro de una función SECURITY DEFINER, que no pasa por esta policy
--    (corre con privilegios de la función, no del cliente) — cerrar el INSERT
--    directo del cliente a solo-admin no afecta ese flujo.
--
-- 2) fetchBancosAprobados leía organizations directamente desde pantallas
--    SIN sesión (registro, login) — organizations tiene columnas con PII
--    (nit, representante_legal) fuera del alcance de lo que un selector de
--    "bancos aprobados" necesita mostrar. bancos_aprobados_publicos()
--    expone solo id+name, con acceso mínimo (anon + authenticated).

-- ───── 1. memberships: cierra la auto-inserción a organización ajena ─────

DROP POLICY IF EXISTS mem_insert_self_or_admin ON memberships;

CREATE POLICY mem_insert_admin_only
ON memberships
FOR INSERT
WITH CHECK (is_platform_admin());

-- ───── 2. bancos_aprobados_publicos() ─────

CREATE OR REPLACE FUNCTION public.bancos_aprobados_publicos()
RETURNS TABLE (id text, name text)
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT id, name
  FROM organizations
  WHERE type = 'banco' AND status = 'approved'
  ORDER BY name ASC;
$$;

REVOKE ALL ON FUNCTION public.bancos_aprobados_publicos() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.bancos_aprobados_publicos() TO anon, authenticated;

-- ───── 3. organizations: cierra fuga de PII a anon ─────
--
-- org_select_public permitía SELECT sin sesión (anon) sobre organizations,
-- que incluye columnas con PII (nit, representante_legal, email, teléfono
-- vía otras relaciones). El único flujo anon legítimo que dependía de leer
-- esta tabla (selector de bancos aprobados en registro/login) ya migró a
-- bancos_aprobados_publicos(), que expone solo id+name. Cierra la fuga sin
-- romper nada: los consumidores autenticados (comercio/admin dashboards)
-- siguen leyendo organizations vía esta misma tabla, ahora solo con sesión.

DROP POLICY IF EXISTS org_select_public ON organizations;

CREATE POLICY org_select_authenticated
ON organizations
FOR SELECT
TO authenticated
USING (true);
