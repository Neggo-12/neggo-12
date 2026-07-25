-- Eventos de uso del cliente B2C — analítica propia (no PostHog) para
-- "comercios más buscados" y "secciones más usadas" en el Admin.
--
-- Decisión de arquitectura (25 jul 2026): se evaluó usar la Query API de
-- PostHog en lugar de esto, pero requeriría una Personal API Key nueva
-- (credencial de solo-lectura, distinta de la key de cliente que ya existe
-- para autocapture) y una Edge Function que la use de forma segura. Jhey
-- eligió la opción "más segura y de mejor práctica de arquitectura": seguir
-- el mismo patrón que el resto del sistema (todo pasa por Supabase, sin
-- credenciales externas nuevas). PostHog sigue activo aparte para sus
-- propios dashboards (funnels, session replay).
--
-- No es un cambio de estado sensible (financiero/pipeline/facturación), así
-- que no necesita una función SECURITY DEFINER — es un insert directo con
-- RLS, mismo patrón que busquedas_sin_match.

CREATE TABLE public.eventos_uso_cliente (
  id text PRIMARY KEY DEFAULT (gen_random_uuid())::text,
  tipo_evento text NOT NULL CHECK (tipo_evento IN ('seleccion_comercio', 'cambio_seccion')),
  organization_id text REFERENCES public.organizations(id) ON DELETE CASCADE,
  seccion text,
  cliente_id text DEFAULT (auth.uid())::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT eventos_uso_cliente_payload_check CHECK (
    (tipo_evento = 'seleccion_comercio' AND organization_id IS NOT NULL)
    OR (tipo_evento = 'cambio_seccion' AND seccion IS NOT NULL)
  )
);

CREATE INDEX idx_eventos_uso_cliente_comercio
  ON public.eventos_uso_cliente (organization_id, created_at)
  WHERE tipo_evento = 'seleccion_comercio';

CREATE INDEX idx_eventos_uso_cliente_seccion
  ON public.eventos_uso_cliente (seccion, created_at)
  WHERE tipo_evento = 'cambio_seccion';

ALTER TABLE public.eventos_uso_cliente ENABLE ROW LEVEL SECURITY;

-- Mismo patrón que busquedas_sin_match: cualquier autenticado puede insertar
-- su propio evento de analítica (no hay dato sensible acá), solo el admin
-- puede leer el detalle crudo.
CREATE POLICY eventos_uso_cliente_insert
  ON public.eventos_uso_cliente
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY eventos_uso_cliente_select_admin
  ON public.eventos_uso_cliente
  FOR SELECT
  TO public
  USING (public.is_platform_admin());

-- Vistas pre-agregadas para el ranking en Admin (mismo patrón que
-- facturas_resumen_por_negocio) — evita agregar en el cliente.
CREATE VIEW public.comercios_mas_buscados
WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  o.name,
  o.ciudad,
  count(*) AS total_selecciones,
  max(e.created_at) AS ultima_seleccion
FROM public.eventos_uso_cliente e
JOIN public.organizations o ON o.id = e.organization_id
WHERE e.tipo_evento = 'seleccion_comercio'
GROUP BY o.id, o.name, o.ciudad
ORDER BY total_selecciones DESC;

CREATE VIEW public.secciones_mas_usadas
WITH (security_invoker = true) AS
SELECT
  seccion,
  count(*) AS total_vistas,
  max(created_at) AS ultima_vista
FROM public.eventos_uso_cliente
WHERE tipo_evento = 'cambio_seccion'
GROUP BY seccion
ORDER BY total_vistas DESC;
