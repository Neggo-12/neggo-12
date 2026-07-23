-- Respaldo de columna ya aplicada vía MCP: plan_origen registra de qué
-- plantilla de planes_comercio vino una tarifa negociada (su clave), o NULL
-- si fue un valor personalizado escrito a mano. Parte de la unificación de
-- asignación de tarifas — el historial de tarifas_comercio_negociadas ahora
-- distingue "vino de una plantilla X" de "fue algo a mano".

alter table public.tarifas_comercio_negociadas
  add column if not exists plan_origen text;
