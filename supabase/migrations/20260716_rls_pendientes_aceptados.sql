-- Cierre de RLS pendientes (auditoría 2026-07-16) — ya aplicado vía MCP, este
-- archivo solo respalda. Decisión de negocio: proyectos/tarifas solo con
-- sesión; creación de organizaciones solo vía RPC de registro o admin.

DROP POLICY IF EXISTS org_insert_self ON organizations;
CREATE POLICY org_insert_admin_only ON organizations FOR INSERT WITH CHECK (is_platform_admin());

DROP POLICY IF EXISTS proyectos_select_public ON proyectos;
CREATE POLICY proyectos_select_authenticated ON proyectos FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS tarifas_bancos_select_all ON tarifas_bancos;
CREATE POLICY tarifas_bancos_select_authenticated ON tarifas_bancos FOR SELECT TO authenticated USING (true);
