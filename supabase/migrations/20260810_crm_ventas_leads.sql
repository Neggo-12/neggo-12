-- CRM Ventas (panel admin de Neggo) — Fase 1 de Neggo OS.
-- Reemplaza el CRM manual en Excel (docs/crm-ventas-neggo.xlsx) por una tabla
-- real: los agentes de Growth (LinkedIn/Instagram) crean leads acá vía
-- crm_ventas_crear_lead, el agente de Ventas lee/actualiza vía las funciones
-- de abajo, y Jhey trabaja el pipeline a diario desde la UI ("CRM Ventas" en
-- el panel admin). Herramienta 100% interna — nunca la ve un comercio ni un
-- cliente. Ver docs/spec-crm-ventas-admin.md para el spec completo.

-- ───── 1. Tabla — una sola fuente de verdad ─────
-- Las 3 vistas de la UI (Leads Instagram / Leads LinkedIn / Prospectos) son
-- filtros sobre esta misma tabla, nunca tablas separadas.

create table public.crm_ventas_leads (
  id text primary key default (gen_random_uuid())::text,
  fecha_alta timestamptz not null default now(),
  nombre_negocio text not null,
  celular_whatsapp text,
  pagina_web text,
  categoria text,                  -- uno de los 14 valores de ComercioCategory, o null si es Conector/Banco-Constructora
  tipo_perfil text not null check (tipo_perfil in ('Comercio directo', 'Conector', 'Banco-Constructora')),
  cuenta_grande boolean not null default false,
  canal_principal text not null check (canal_principal in ('Instagram', 'LinkedIn', 'Facebook', 'Web', 'Email', 'WhatsApp')),
  contacto text,                   -- @usuario / link de perfil / correo (lo que no cabe en celular_whatsapp o pagina_web)
  ciudad_zona text,
  gancho_personalizacion text,
  mensaje_armado text,
  estado_envio text not null default 'Pendiente de envío'
    check (estado_envio in ('Pendiente de envío', 'Enviado')),
  -- Etapa: máquina de estados cerrada, nunca texto libre desde la UI (dropdown,
  -- no input). Este constraint es lo que impide que vuelva a pasar el bug del
  -- Excel viejo (columna Estado mezclando etapa con texto real de respuesta).
  etapa text not null default 'Pendiente de envío'
    check (etapa in ('Pendiente de envío', 'En seguimiento', 'Respondió', 'Agendado', 'Cerrado - ganado', 'Perdido', 'Descartado')),
  respuesta_real text,             -- texto literal de lo que respondió el negocio
  respuesta_sugerida text,         -- generada por el agente de Ventas al llenarse respuesta_real
  fecha_proxima_accion date,
  proxima_accion text,
  plan_elegido text                -- solo si etapa = 'Cerrado - ganado' (docs/marketing-neggo.md 5.1)
    check (plan_elegido is null or plan_elegido in ('Solo Pauta', 'Balanceado', 'Solo Resultados')),
  valor_mensual_estimado numeric,  -- solo si etapa = 'Cerrado - ganado'
  notas text,
  origen text,                     -- de qué agente/corrida vino (ej. 'neggo-instagram-prospeccion', 'manual-jhey', 'migracion-excel-2026-08-10')
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.crm_ventas_leads is
  'CRM Ventas interno (prospección B2B) — nunca visible para comercios/clientes. Ver docs/spec-crm-ventas-admin.md.';

create index crm_ventas_leads_etapa_idx on public.crm_ventas_leads (etapa);
create index crm_ventas_leads_canal_idx on public.crm_ventas_leads (canal_principal);
create index crm_ventas_leads_fecha_alta_idx on public.crm_ventas_leads (fecha_alta desc);

-- Reutiliza el trigger genérico ya existente (20260724_hardening_search_path_triggers.sql).
create trigger crm_ventas_leads_set_updated_at
  before update on public.crm_ventas_leads
  for each row execute function public.update_updated_at();

alter table public.crm_ventas_leads enable row level security;

create policy crm_ventas_leads_select on public.crm_ventas_leads
  for select using (is_platform_admin());

create policy crm_ventas_leads_insert on public.crm_ventas_leads
  for insert with check (is_platform_admin());

-- Nunca UPDATE directo desde el cliente para cambios de etapa/estado — mismo
-- patrón que el resto del proyecto (CLAUDE.md, "Patrones de seguridad
-- establecidos"). A propósito no hay policy de update: todo cambio de
-- estado_envio/etapa/respuesta_real/respuesta_sugerida/plan_elegido pasa por
-- las funciones SECURITY DEFINER de abajo.

-- ───── 2. Funciones SECURITY DEFINER ─────
-- Mismo patrón confirmado en declarar_ingresos_comercio: search_path fijo,
-- valida is_platform_admin() antes de escribir, chequea filas afectadas
-- (RLS puede bloquear un UPDATE en silencio sin lanzar error).

-- 2.1 Marcar enviado — Pendiente de envío -> En seguimiento en una transacción.
create or replace function public.crm_ventas_marcar_enviado(p_lead_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_updated_id text;
begin
  if not is_platform_admin() then
    raise exception 'No autorizado: solo un administrador puede marcar un lead como enviado';
  end if;

  update crm_ventas_leads
  set estado_envio = 'Enviado', etapa = 'En seguimiento'
  where id = p_lead_id
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'Lead % no existe', p_lead_id;
  end if;
end;
$function$;

-- 2.2 Registrar respuesta real -> etapa 'Respondió'. Deja el lead marcado
-- para que el agente de Ventas genere respuesta_sugerida en su próxima corrida.
create or replace function public.crm_ventas_registrar_respuesta(p_lead_id text, p_respuesta text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_updated_id text;
begin
  if not is_platform_admin() then
    raise exception 'No autorizado: solo un administrador puede registrar una respuesta';
  end if;
  if p_respuesta is null or btrim(p_respuesta) = '' then
    raise exception 'La respuesta no puede estar vacía';
  end if;

  update crm_ventas_leads
  set respuesta_real = p_respuesta, etapa = 'Respondió', respuesta_sugerida = null
  where id = p_lead_id
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'Lead % no existe', p_lead_id;
  end if;
end;
$function$;

-- 2.3 Guardar la respuesta sugerida generada por el agente de Ventas (no
-- cambia etapa — la genera para un lead que ya está en 'Respondió').
create or replace function public.crm_ventas_guardar_respuesta_sugerida(p_lead_id text, p_texto text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_updated_id text;
begin
  -- El agente de Ventas escribe acá vía el MCP de Supabase conectado directo a
  -- la corrida programada (rol postgres/supabase_admin, sin sesión de usuario
  -- real) — mismo criterio ya establecido en consolidar_facturacion_mensual
  -- para automatización interna sin auth.uid().
  if not (
    is_platform_admin()
    or current_user in ('postgres', 'supabase_admin')
    or session_user in ('postgres', 'supabase_admin')
  ) then
    raise exception 'No autorizado: solo un administrador o el agente de Ventas (automatización interna) puede guardar la respuesta sugerida';
  end if;
  if p_texto is null or btrim(p_texto) = '' then
    raise exception 'El texto de la respuesta sugerida no puede estar vacío';
  end if;

  update crm_ventas_leads
  set respuesta_sugerida = p_texto
  where id = p_lead_id and etapa = 'Respondió'
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'Lead % no existe o no está en etapa Respondió', p_lead_id;
  end if;
end;
$function$;

-- 2.4 Transiciones manuales (Agendado / Cerrado - ganado / Perdido / Descartado).
create or replace function public.crm_ventas_cambiar_etapa(p_lead_id text, p_nueva_etapa text, p_extra jsonb default '{}'::jsonb)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_updated_id text;
  v_plan_elegido text;
  v_valor_mensual numeric;
begin
  if not is_platform_admin() then
    raise exception 'No autorizado: solo un administrador puede cambiar la etapa de un lead';
  end if;

  if p_nueva_etapa not in ('Pendiente de envío', 'En seguimiento', 'Respondió', 'Agendado', 'Cerrado - ganado', 'Perdido', 'Descartado') then
    raise exception 'Etapa inválida: %', p_nueva_etapa;
  end if;

  if p_nueva_etapa = 'Agendado' and not (p_extra ? 'fecha_proxima_accion') then
    raise exception 'Agendado requiere fecha_proxima_accion en p_extra';
  end if;

  if p_nueva_etapa = 'Cerrado - ganado' then
    v_plan_elegido := p_extra->>'plan_elegido';
    v_valor_mensual := (p_extra->>'valor_mensual_estimado')::numeric;
    if v_plan_elegido is null or v_plan_elegido not in ('Solo Pauta', 'Balanceado', 'Solo Resultados') then
      raise exception 'Cerrado - ganado requiere plan_elegido válido (Solo Pauta / Balanceado / Solo Resultados) en p_extra';
    end if;
    if v_valor_mensual is null or v_valor_mensual < 0 then
      raise exception 'Cerrado - ganado requiere valor_mensual_estimado (numérico, no negativo) en p_extra';
    end if;
  end if;

  update crm_ventas_leads
  set etapa = p_nueva_etapa,
      fecha_proxima_accion = case when p_extra ? 'fecha_proxima_accion' then (p_extra->>'fecha_proxima_accion')::date else fecha_proxima_accion end,
      proxima_accion = case when p_extra ? 'proxima_accion' then p_extra->>'proxima_accion' else proxima_accion end,
      plan_elegido = case when p_nueva_etapa = 'Cerrado - ganado' then v_plan_elegido else plan_elegido end,
      valor_mensual_estimado = case when p_nueva_etapa = 'Cerrado - ganado' then v_valor_mensual else valor_mensual_estimado end,
      notas = case when p_extra ? 'notas' then p_extra->>'notas' else notas end
  where id = p_lead_id
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'Lead % no existe', p_lead_id;
  end if;
end;
$function$;

-- 2.5 Crear lead — la usan los agentes de prospección (LinkedIn/Instagram)
-- vía el MCP de Supabase, y también la UI para altas manuales de Jhey.
create or replace function public.crm_ventas_crear_lead(
  p_nombre_negocio text,
  p_tipo_perfil text,
  p_canal_principal text,
  p_celular_whatsapp text default null,
  p_pagina_web text default null,
  p_categoria text default null,
  p_cuenta_grande boolean default false,
  p_contacto text default null,
  p_ciudad_zona text default null,
  p_gancho_personalizacion text default null,
  p_mensaje_armado text default null,
  p_notas text default null,
  p_origen text default null
)
returns text
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_id text;
begin
  -- Mismo criterio que crm_ventas_guardar_respuesta_sugerida: los agentes de
  -- prospección (LinkedIn/Instagram) escriben acá vía el MCP de Supabase de la
  -- corrida programada, sin sesión de usuario real.
  if not (
    is_platform_admin()
    or current_user in ('postgres', 'supabase_admin')
    or session_user in ('postgres', 'supabase_admin')
  ) then
    raise exception 'No autorizado: solo un administrador o un agente de prospección (automatización interna) puede crear leads';
  end if;
  if p_nombre_negocio is null or btrim(p_nombre_negocio) = '' then
    raise exception 'nombre_negocio es requerido';
  end if;
  if p_tipo_perfil not in ('Comercio directo', 'Conector', 'Banco-Constructora') then
    raise exception 'tipo_perfil inválido: %', p_tipo_perfil;
  end if;
  if p_canal_principal not in ('Instagram', 'LinkedIn', 'Facebook', 'Web', 'Email', 'WhatsApp') then
    raise exception 'canal_principal inválido: %', p_canal_principal;
  end if;

  v_id := 'CRMV-' || replace(gen_random_uuid()::text, '-', '');

  insert into crm_ventas_leads (
    id, nombre_negocio, tipo_perfil, canal_principal, celular_whatsapp, pagina_web,
    categoria, cuenta_grande, contacto, ciudad_zona, gancho_personalizacion,
    mensaje_armado, notas, origen
  ) values (
    v_id, p_nombre_negocio, p_tipo_perfil, p_canal_principal, p_celular_whatsapp, p_pagina_web,
    p_categoria, coalesce(p_cuenta_grande, false), p_contacto, p_ciudad_zona, p_gancho_personalizacion,
    p_mensaje_armado, p_notas, p_origen
  );

  return v_id;
end;
$function$;
