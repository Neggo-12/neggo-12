-- Bug bloqueante encontrado al construir la vista del cliente para el código de
-- verificación (docs/pipeline-b2b-seguridad.md, punto 1): la única política SELECT
-- de me_interesa_destinatarios solo permitía leer a miembros de la organización
-- (vía memberships). El cliente dueño de la solicitud no podía leer sus propios
-- destinatarios — fetchMeInteresaSolicitudesByCliente siempre devolvía destinatarios
-- vacíos por RLS silenciosa, mostrando "Sin destinatarios disponibles" aunque
-- existieran destinatarios reales (verificado con SOL-MRXT1UKI: 4 destinatarios
-- reales, 0 visibles para el cliente antes de este fix).
--
-- Se reutiliza me_interesa_client_owns_solicitud(), ya usada en la política INSERT
-- de esta misma tabla — no se abre acceso nuevo más allá de las propias solicitudes
-- del cliente. Verificado con sesión simulada (set request.jwt.claims): el dueño ve
-- sus 4 destinatarios, un cliente ajeno ve 0.

DROP POLICY IF EXISTS me_interesa_destinatarios_select_own ON me_interesa_destinatarios;

CREATE POLICY me_interesa_destinatarios_select_own
ON me_interesa_destinatarios
FOR SELECT
USING (
  EXISTS (
    SELECT 1 FROM memberships m
    WHERE m.organization_id = me_interesa_destinatarios.organization_id
      AND m.user_id = auth.uid()::text
      AND m.is_active = true
  )
  OR me_interesa_client_owns_solicitud(solicitud_id)
  OR is_platform_admin()
);
