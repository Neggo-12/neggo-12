-- Sello de Confianza: cobro mensual recurrente por franja de ingresos declarados.
-- Contexto: comercios pagan una suscripción mensual aparte del CPL/comisión de su plan,
-- calculada automáticamente según el nivel de ingresos que declaran (o negociada por Admin,
-- incluido dejarla en $0 para comercios a los que se les regala el sello). Sin prorrateo:
-- el primer cobro sale completo en el primer ciclo mensual donde ya haya ingreso declarado.

-- 1. Ingreso mensual declarado por el comercio (o asignado por Admin al aprobar).
alter table public.organizations
  add column if not exists ingresos_mensuales_declarados numeric,
  add column if not exists ingresos_declarados_at timestamptz,
  add column if not exists ingresos_declarados_por text;

-- 2. Tarifa del Sello negociada por comercio — mismo patrón append-only que tarifas_comercio_negociadas.
create table if not exists public.tarifas_sello_negociadas (
  id text primary key default (gen_random_uuid())::text,
  comercio_organization_id text not null references public.organizations(id),
  valor_mensual numeric not null,
  periodo_vigente_desde text not null,
  creado_por text not null,
  motivo text,
  created_at timestamptz not null default now()
);

alter table public.tarifas_sello_negociadas enable row level security;

create policy tarifas_sello_negociadas_insert_admin
  on public.tarifas_sello_negociadas
  for insert
  with check (is_platform_admin() and creado_por = auth.uid()::text);

create policy tarifas_sello_negociadas_select
  on public.tarifas_sello_negociadas
  for select
  using (is_platform_admin() or user_belongs_to_organization(comercio_organization_id));

-- 3. Declarar ingresos: solo el propio comercio o un Admin, nunca UPDATE directo desde cliente.
create or replace function public.declarar_ingresos_comercio(p_organization_id text, p_valor numeric)
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
begin
  if p_valor is null or p_valor < 0 then
    raise exception 'El ingreso declarado debe ser un valor numérico no negativo';
  end if;

  if not (user_belongs_to_organization(p_organization_id) or is_platform_admin()) then
    raise exception 'No autorizado: solo el propio comercio o un administrador puede declarar este dato';
  end if;

  update organizations
  set ingresos_mensuales_declarados = p_valor,
      ingresos_declarados_at = now(),
      ingresos_declarados_por = case when is_platform_admin() then 'admin:' || auth.uid()::text else 'comercio' end
  where id = p_organization_id and type = 'comercio';

  if not found then
    raise exception 'Comercio % no existe', p_organization_id;
  end if;
end;
$function$;

-- 4. Resolver el valor mensual vigente del Sello: negociado > franja automática > sin cobro.
--    Franjas (ajustables por Admin caso a caso vía tarifas_sello_negociadas):
--    < $300.000        -> $5.000
--    $300.000–$10.000.000  -> $20.000
--    $10.000.001–$20.000.000 -> $28.000
--    > $20.000.000      -> $40.000
create or replace function public.resolver_sello_comercio(p_comercio_id text)
returns numeric
language sql
stable
set search_path to 'public'
as $function$
  select coalesce(
    (
      select valor_mensual from tarifas_sello_negociadas
      where comercio_organization_id = p_comercio_id
        and periodo_vigente_desde <= to_char(now(), 'YYYY-MM')
      order by periodo_vigente_desde desc, created_at desc
      limit 1
    ),
    (
      select case
        when o.ingresos_mensuales_declarados is null then null
        when o.ingresos_mensuales_declarados < 300000 then 5000
        when o.ingresos_mensuales_declarados <= 10000000 then 20000
        when o.ingresos_mensuales_declarados <= 20000000 then 28000
        else 40000
      end
      from organizations o
      where o.id = p_comercio_id
    )
  );
$function$;

-- 5. Generar el cargo del Sello en el ledger antes de consolidar, solo para comercios con
--    el sello activo (has_trust_seal) y valor resuelto > 0, sin duplicar si ya se generó.
create or replace function public.consolidar_facturacion_mensual()
returns void
language plpgsql
security definer
set search_path to 'public'
as $function$
declare
  v_periodo_anterior text;
  v_fecha_limite date;
  v_org record;
  v_factura_id text;
  v_monto_total numeric;
  v_snapshot jsonb;
begin
  if not (
    is_platform_admin()
    or current_user in ('postgres', 'supabase_admin')
    or session_user in ('postgres', 'supabase_admin')
  ) then
    raise exception 'No autorizado: consolidación mensual restringida a administración/cron';
  end if;

  v_periodo_anterior := to_char(now() - interval '1 month', 'YYYY-MM');
  v_fecha_limite := (date_trunc('month', now())::date + interval '4 days')::date;

  insert into facturas_ledger (organization_id, concepto, monto, periodo, detalle)
  select o.id,
         'Sello de Confianza — Suscripción mensual',
         resolver_sello_comercio(o.id),
         v_periodo_anterior,
         jsonb_build_object('origen', 'sello_confianza_suscripcion')
  from organizations o
  where o.type = 'comercio'
    and o.has_trust_seal = true
    and resolver_sello_comercio(o.id) is not null
    and resolver_sello_comercio(o.id) > 0
    and not exists (
      select 1 from facturas_ledger fl2
      where fl2.organization_id = o.id
        and fl2.periodo = v_periodo_anterior
        and fl2.concepto = 'Sello de Confianza — Suscripción mensual'
    );

  for v_org in
    select distinct fl.organization_id, o.type as organization_type
    from facturas_ledger fl
    join organizations o on o.id = fl.organization_id
    where fl.periodo = v_periodo_anterior and fl.factura_mensual_id is null
  loop
    select coalesce(sum(monto), 0) into v_monto_total
      from facturas_ledger
      where organization_id = v_org.organization_id
        and periodo = v_periodo_anterior
        and factura_mensual_id is null;

    if v_org.organization_type = 'banco' then
      select jsonb_object_agg(
        clave,
        jsonb_build_object('tipoTarifa', tipo_tarifa, 'valor', valor, 'origen', origen)
      ) into v_snapshot
      from (
        select
          g.clave,
          coalesce(ov.tipo_tarifa, g.tipo_tarifa) as tipo_tarifa,
          coalesce(ov.valor, g.valor) as valor,
          case when ov.valor is not null then 'override' else 'global' end as origen
        from tarifas_bancos g
        left join lateral (
          select tipo_tarifa, valor
          from tarifas_bancos_por_organizacion
          where banco_organization_id = v_org.organization_id and clave = g.clave
            and periodo_vigente_desde <= v_periodo_anterior
          order by periodo_vigente_desde desc, updated_at desc
          limit 1
        ) ov on true
      ) resolved;

    elsif v_org.organization_type = 'comercio' then
      select jsonb_build_object(
        'plan', coalesce(o.plan_negociacion, 'balanceado'),
        'cpl', pc.cpl,
        'comisionPct', pc.comision_pct,
        'selloMensual', resolver_sello_comercio(o.id)
      ) into v_snapshot
      from organizations o
      left join planes_comercio pc on pc.clave = coalesce(o.plan_negociacion, 'balanceado')
      where o.id = v_org.organization_id;

    else
      v_snapshot := jsonb_build_object('successFeeRate', 0.0225);
    end if;

    v_factura_id := null;
    insert into facturas_mensuales (organization_id, periodo, monto_total, fecha_limite_pago, tarifas_snapshot)
    values (v_org.organization_id, v_periodo_anterior, v_monto_total, v_fecha_limite, v_snapshot)
    on conflict (organization_id, periodo) do nothing
    returning id into v_factura_id;

    if v_factura_id is null then
      select id into v_factura_id from facturas_mensuales
        where organization_id = v_org.organization_id and periodo = v_periodo_anterior;
    end if;

    update facturas_ledger
      set factura_mensual_id = v_factura_id
      where organization_id = v_org.organization_id
        and periodo = v_periodo_anterior
        and factura_mensual_id is null;
  end loop;
end;
$function$;
