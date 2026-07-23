-- Código de verificación único por solicitud (comercio_contactos) — cierra el
-- vector de suplantación en el Buscador de Comercios: un estafador que cite de
-- memoria un código genérico del comercio ya no puede hacerse pasar por el
-- negocio real, porque el código es único por conversación cliente-comercio
-- y lo genera Neggo, no el comercio.

alter table public.comercio_contactos
  add column if not exists codigo_verificacion text;

create or replace function public.generar_codigo_verificacion(p_id text)
 returns text
 language plpgsql
 immutable
as $function$
DECLARE
  v_hash bigint;
  v_code text;
BEGIN
  v_hash := abs(('x' || substring(md5(p_id || 'neggo-salt-2026'), 1, 15))::bit(60)::bigint);
  v_code := lpad((v_hash % 1000000)::text, 6, '0');
  RETURN substring(v_code, 1, 3) || ' ' || substring(v_code, 4, 3);
END;
$function$;

create or replace function public.set_codigo_verificacion()
 returns trigger
 language plpgsql
as $function$
BEGIN
  NEW.codigo_verificacion := generar_codigo_verificacion(NEW.id);
  RETURN NEW;
END;
$function$;

drop trigger if exists trg_set_codigo_verificacion on public.comercio_contactos;
create trigger trg_set_codigo_verificacion
  before insert on public.comercio_contactos
  for each row execute function public.set_codigo_verificacion();

-- Backfill de filas existentes antes de exigir NOT NULL.
update public.comercio_contactos
  set codigo_verificacion = generar_codigo_verificacion(id)
  where codigo_verificacion is null;

alter table public.comercio_contactos
  alter column codigo_verificacion set not null;
