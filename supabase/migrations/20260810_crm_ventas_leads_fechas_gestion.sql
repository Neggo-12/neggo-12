-- CRM Ventas — fecha_envio / fecha_respuesta (feedback de Jhey tras la primera
-- prueba real del panel: sin estas 2 fechas no sabía cuándo había mandado el
-- primer mensaje ni cuándo respondió el negocio, así que no podía calcular el
-- seguimiento a 24-48h). updated_at ya existe pero es genérico (se pisa con
-- cualquier cambio); estas 2 son específicas de los 2 eventos que más importan.

alter table public.crm_ventas_leads
  add column fecha_envio timestamptz,
  add column fecha_respuesta timestamptz;

comment on column public.crm_ventas_leads.fecha_envio is 'Momento exacto en que Jhey marcó el mensaje como enviado (crm_ventas_marcar_enviado) — base para calcular el seguimiento a 24-48h.';
comment on column public.crm_ventas_leads.fecha_respuesta is 'Momento exacto en que se guardó la respuesta real del negocio (crm_ventas_registrar_respuesta).';

-- crm_ventas_marcar_enviado: ahora también graba fecha_envio.
create or replace function public.crm_ventas_marcar_enviado(p_lead_id text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
declare
  v_updated_id text;
begin
  if not is_platform_admin() then
    raise exception 'No autorizado: solo un administrador puede marcar un lead como enviado';
  end if;

  update crm_ventas_leads
  set estado_envio = 'Enviado', etapa = 'En seguimiento', fecha_envio = now()
  where id = p_lead_id
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'Lead % no existe', p_lead_id;
  end if;
end;
$$;

-- crm_ventas_registrar_respuesta: ahora también graba fecha_respuesta.
create or replace function public.crm_ventas_registrar_respuesta(p_lead_id text, p_respuesta text)
returns void
language plpgsql
security definer
set search_path to 'public'
as $$
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
  set respuesta_real = p_respuesta, etapa = 'Respondió', respuesta_sugerida = null, fecha_respuesta = now()
  where id = p_lead_id
  returning id into v_updated_id;

  if v_updated_id is null then
    raise exception 'Lead % no existe', p_lead_id;
  end if;
end;
$$;
