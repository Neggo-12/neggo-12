-- Señales de Interés — negocios no registrados (sección 9.3, roadmap de negocio).
--
-- Dos tablas:
-- - negocios_curados: lista editable desde Admin de negocios grandes conocidos
--   que aún no se han unido a Neggo. Lectura abierta a cualquier autenticado
--   (el cliente la necesita para armar el selector de Me Interesa), escritura
--   solo Admin. `activo` es soft-delete — si Admin "quita" un negocio curado
--   (ej. porque se registró de verdad), las señales de interés viejas que ya
--   lo referencian por nombre siguen intactas.
-- - senales_interes: lo que se crea cuando un cliente elige un negocio curado
--   (no registrado) en vez de uno real. Sin organization_id — el negocio no
--   existe en el sistema. El cliente ve su propia señal (para su historial en
--   el portal); Admin ve todas (panel "Clientes en Espera").

-- ───── negocios_curados ─────

CREATE TABLE negocios_curados (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  sector text NOT NULL CHECK (sector IN ('banco', 'constructora', 'comercio')),
  nombre text NOT NULL,
  ciudad text,
  activo boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),

  UNIQUE (sector, nombre)
);

CREATE INDEX idx_negocios_curados_sector_activo ON negocios_curados (sector, activo);

ALTER TABLE negocios_curados ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_select_negocios_curados"
ON negocios_curados
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "admin_insert_negocios_curados"
ON negocios_curados
FOR INSERT
WITH CHECK (is_platform_admin());

CREATE POLICY "admin_update_negocios_curados"
ON negocios_curados
FOR UPDATE
USING (is_platform_admin())
WITH CHECK (is_platform_admin());

-- ───── senales_interes ─────

CREATE TABLE senales_interes (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  cliente_id text NOT NULL REFERENCES users(id),
  cliente_nombre text NOT NULL,
  cliente_telefono text NOT NULL,
  sector text NOT NULL CHECK (sector IN ('banco', 'constructora', 'comercio')),
  negocio_deseado text NOT NULL,
  producto_bancario text,
  tipo_vivienda text,
  categoria text,
  subcategoria text,
  ciudad text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_senales_interes_cliente_id ON senales_interes (cliente_id);
CREATE INDEX idx_senales_interes_sector ON senales_interes (sector);

ALTER TABLE senales_interes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "cliente_inserta_su_propia_senal"
ON senales_interes
FOR INSERT
WITH CHECK (cliente_id = auth.uid()::text);

CREATE POLICY "cliente_o_admin_selecciona_senales"
ON senales_interes
FOR SELECT
USING (
  cliente_id = auth.uid()::text
  OR is_platform_admin()
);
