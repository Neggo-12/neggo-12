-- Auditoría de seguridad/arquitectura (24 jul, continuación) — cierre de hallazgo del linter:
-- 4 funciones sin search_path fijo. Ninguna es SECURITY DEFINER (son funciones de trigger o
-- un helper IMMUTABLE), así que el riesgo real es bajo — no corren con privilegio elevado,
-- RLS sigue aplicando igual. Se corrige de todas formas porque es gratis y cierra el lint.

create or replace function public.update_updated_at()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.updated_at = now();
  return new;
end;
$function$;

create or replace function public.generar_codigo_verificacion(p_id text)
returns text
language plpgsql
immutable
set search_path to 'public'
as $function$
declare
  v_hash bigint;
  v_code text;
begin
  v_hash := abs(('x' || substring(md5(p_id || 'neggo-salt-2026'), 1, 15))::bit(60)::bigint);
  v_code := lpad((v_hash % 1000000)::text, 6, '0');
  return substring(v_code, 1, 3) || ' ' || substring(v_code, 4, 3);
end;
$function$;

create or replace function public.set_codigo_verificacion()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.codigo_verificacion := generar_codigo_verificacion(new.id);
  return new;
end;
$function$;

create or replace function public.set_codigo_verificacion_me_interesa()
returns trigger
language plpgsql
set search_path to 'public'
as $function$
begin
  new.codigo_verificacion := generar_codigo_verificacion(new.id);
  return new;
end;
$function$;
