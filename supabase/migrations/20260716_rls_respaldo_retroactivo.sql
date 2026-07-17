-- Respaldo retroactivo de políticas RLS ya aplicadas en producción (auditoría 2026-07-16). NO ejecutar contra la base actual — solo versiona el estado real, extraído verbatim de pg_policies.

-- audit_log
CREATE POLICY audit_insert_authenticated ON audit_log FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY audit_select_admin_only ON audit_log FOR SELECT USING (is_platform_admin());

-- cliente_banco_productos
CREATE POLICY cliente_banco_productos_insert_own ON cliente_banco_productos FOR INSERT WITH CHECK (cliente_id = (auth.uid())::text);
CREATE POLICY cliente_banco_productos_select_by_bank ON cliente_banco_productos FOR SELECT USING (user_belongs_to_organization(organization_id));
CREATE POLICY cliente_banco_productos_select_own ON cliente_banco_productos FOR SELECT USING (cliente_id = (auth.uid())::text);

-- facturas_ledger
CREATE POLICY admin_select_all_facturas ON facturas_ledger FOR SELECT USING (EXISTS (SELECT 1 FROM users WHERE users.id = (auth.uid())::text AND users.rol = 'Admin'::text));
CREATE POLICY org_members_select_own_facturas ON facturas_ledger FOR SELECT USING (organization_id IN (SELECT memberships.organization_id FROM memberships WHERE memberships.user_id = (auth.uid())::text AND memberships.is_active = true));

-- leads
CREATE POLICY leads_insert_cliente_o_constructora ON leads FOR INSERT WITH CHECK ((cliente_id = (auth.uid())::text) OR (constructora_id = (auth.uid())::text) OR is_platform_admin());
CREATE POLICY leads_select_cliente_o_constructora ON leads FOR SELECT USING ((cliente_id = (auth.uid())::text) OR (constructora_id = (auth.uid())::text) OR is_platform_admin());
CREATE POLICY leads_update_constructora ON leads FOR UPDATE USING ((constructora_id = (auth.uid())::text) OR is_platform_admin());

-- me_interesa_destinatarios
CREATE POLICY me_interesa_destinatarios_insert_by_client ON me_interesa_destinatarios FOR INSERT WITH CHECK (me_interesa_client_owns_solicitud(solicitud_id));
CREATE POLICY me_interesa_destinatarios_select_own ON me_interesa_destinatarios FOR SELECT USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = me_interesa_destinatarios.organization_id AND m.user_id = (auth.uid())::text AND m.is_active = true));
CREATE POLICY me_interesa_destinatarios_update_own ON me_interesa_destinatarios FOR UPDATE USING (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = me_interesa_destinatarios.organization_id AND m.user_id = (auth.uid())::text AND m.is_active = true)) WITH CHECK (EXISTS (SELECT 1 FROM memberships m WHERE m.organization_id = me_interesa_destinatarios.organization_id AND m.user_id = (auth.uid())::text AND m.is_active = true));

-- me_interesa_solicitudes
CREATE POLICY me_interesa_solicitudes_insert ON me_interesa_solicitudes FOR INSERT WITH CHECK (cliente_id = (auth.uid())::text);
CREATE POLICY me_interesa_solicitudes_select ON me_interesa_solicitudes FOR SELECT USING ((cliente_id = (auth.uid())::text) OR me_interesa_user_is_destinatario(id));

-- memberships
CREATE POLICY mem_select_own_or_org ON memberships FOR SELECT USING ((user_id = (auth.uid())::text) OR (organization_id IN (SELECT user_org_ids() AS user_org_ids)) OR is_platform_admin());
CREATE POLICY mem_update_admin_only ON memberships FOR UPDATE USING (is_platform_admin());

-- metas
CREATE POLICY metas_insert_own ON metas FOR INSERT WITH CHECK (cliente_id = (auth.uid())::text);
CREATE POLICY metas_select_own ON metas FOR SELECT USING ((cliente_id = (auth.uid())::text) OR is_platform_admin());
CREATE POLICY metas_update_own ON metas FOR UPDATE USING ((cliente_id = (auth.uid())::text) OR is_platform_admin());

-- metricas_rechazo
CREATE POLICY metricas_insert_authenticated ON metricas_rechazo FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY metricas_select_admin_only ON metricas_rechazo FOR SELECT USING (is_platform_admin());

-- organizations
CREATE POLICY org_insert_self ON organizations FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY org_update_members ON organizations FOR UPDATE USING ((id IN (SELECT user_org_ids() AS user_org_ids)) OR is_platform_admin());

-- planes_comercio
CREATE POLICY planes_comercio_select_all ON planes_comercio FOR SELECT USING (true);
CREATE POLICY planes_comercio_update_admin ON planes_comercio FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- proyectos
CREATE POLICY proyectos_insert_owner ON proyectos FOR INSERT WITH CHECK (constructora_id = (auth.uid())::text);
CREATE POLICY proyectos_select_public ON proyectos FOR SELECT USING (true);
CREATE POLICY proyectos_update_owner ON proyectos FOR UPDATE USING (constructora_id = (auth.uid())::text) WITH CHECK (constructora_id = (auth.uid())::text);

-- solicitudes_banca
CREATE POLICY solicitudes_insert_cliente ON solicitudes_banca FOR INSERT WITH CHECK (cliente_id = (auth.uid())::text);
CREATE POLICY solicitudes_select_cliente_o_banco ON solicitudes_banca FOR SELECT USING ((cliente_id = (auth.uid())::text) OR is_platform_admin() OR (EXISTS (SELECT 1 FROM organizations o WHERE (o.id IN (SELECT user_org_ids() AS user_org_ids)) AND ((o.id = ANY (solicitudes_banca.bancos)) OR (o.name = ANY (solicitudes_banca.bancos))))));
CREATE POLICY solicitudes_update_banco ON solicitudes_banca FOR UPDATE USING (is_platform_admin() OR (EXISTS (SELECT 1 FROM organizations o WHERE (o.id IN (SELECT user_org_ids() AS user_org_ids)) AND ((o.id = ANY (solicitudes_banca.bancos)) OR (o.name = ANY (solicitudes_banca.bancos))))));

-- tarifas_bancos
CREATE POLICY tarifas_bancos_select_all ON tarifas_bancos FOR SELECT USING (true);
CREATE POLICY tarifas_bancos_update_admin ON tarifas_bancos FOR UPDATE USING (is_platform_admin()) WITH CHECK (is_platform_admin());

-- users
CREATE POLICY users_insert_self ON users FOR INSERT WITH CHECK (id = (auth.uid())::text);
CREATE POLICY users_select_own ON users FOR SELECT USING ((id = (auth.uid())::text) OR is_platform_admin());
CREATE POLICY users_select_via_me_interesa ON users FOR SELECT USING (me_interesa_org_has_client(id));
CREATE POLICY users_update_own ON users FOR UPDATE USING ((id = (auth.uid())::text) OR is_platform_admin());

-- ofertas_comercios
CREATE POLICY ofertas_insert_owner ON ofertas_comercios FOR INSERT WITH CHECK (comercio_id = (auth.uid())::text);
CREATE POLICY cliente_comercio_admin_selecciona_ofertas ON ofertas_comercios FOR SELECT USING ((comercio_id = (auth.uid())::text) OR is_platform_admin() OR (EXISTS (SELECT 1 FROM metas m WHERE m.id = ofertas_comercios.meta_id AND m.cliente_id = (auth.uid())::text)));
