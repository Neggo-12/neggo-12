-- Rediseño de "Facturación del Ecosistema" en Admin para escalar a miles de
-- negocios: en vez de traer el ledger completo al cliente y agregar en JS,
-- 2 vistas hacen la agregación en Postgres.
--
-- security_invoker = true es crítico aquí: sin esto, una vista corre con los
-- permisos de su dueño (normalmente postgres), bypaseando el RLS de
-- facturas_ledger — cualquier usuario autenticado vería la facturación de
-- TODOS los negocios, no solo la propia. Con security_invoker=true, la vista
-- hereda las 2 policies de SELECT que ya existen en facturas_ledger (una
-- organización ve la suya, Admin ve todas) — no hace falta ninguna policy
-- nueva.

CREATE OR REPLACE VIEW facturas_resumen_por_negocio
WITH (security_invoker = true) AS
SELECT
  o.id AS organization_id,
  o.name AS organization_name,
  o.type AS organization_type,
  COUNT(f.id) AS cantidad_cargos,
  COALESCE(SUM(f.monto) FILTER (WHERE f.estado_pago = 'Pendiente de conciliación'), 0) AS total_pendiente,
  COALESCE(SUM(f.monto) FILTER (WHERE f.estado_pago = 'Facturado'), 0) AS total_facturado,
  COALESCE(SUM(f.monto) FILTER (WHERE f.estado_pago = 'Pagado'), 0) AS total_pagado
FROM organizations o
JOIN facturas_ledger f ON f.organization_id = o.id
GROUP BY o.id, o.name, o.type;

CREATE OR REPLACE VIEW facturas_totales_globales
WITH (security_invoker = true) AS
SELECT
  COALESCE(SUM(monto) FILTER (WHERE concepto = 'CPL'), 0) AS total_cpl,
  COALESCE(SUM(monto) FILTER (WHERE concepto = 'Success Fee'), 0) AS total_success_fee,
  COALESCE(SUM(monto) FILTER (WHERE estado_pago = 'Facturado'), 0) AS total_facturado,
  COALESCE(SUM(monto) FILTER (WHERE estado_pago = 'Pendiente de conciliación'), 0) AS total_pendiente
FROM facturas_ledger;

-- Vista normal (no materializada) por decisión explícita: se recalcula en
-- cada consulta. Si el volumen real hace lenta la agregación, se migra a
-- una vista materializada con refresh periódico — diferido hasta que haya
-- evidencia de que hace falta.
