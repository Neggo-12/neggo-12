-- Sistema de Puntos Neggo — Nivel 1 (respaldo de esquema ya aplicado vía MCP).
-- Diseño completo: docs/sistema-puntos-neggo.md
--
-- 3 tablas + 4 funciones:
--  - puntos_tasas_comercio: append-only, mismo patrón que tarifas_comercio_negociadas.
--  - puntos_movimientos: ledger (ganado/canjeado/vencido); saldo = SUM(puntos).
--    Sin política INSERT directa — solo se escribe vía las funciones
--    SECURITY DEFINER (emitir_puntos_por_compra, canjear_puntos).
--  - puntos_liquidaciones: cuando Neggo le paga a un comercio los puntos canjeados.

-- ───── Tablas ─────

create table if not exists public.puntos_tasas_comercio (
  id text primary key default (gen_random_uuid())::text,
  comercio_organization_id text not null references public.organizations(id),
  puntos_por_1000 numeric not null check (puntos_por_1000 >= 0),
  plan_origen text,
  periodo_vigente_desde text not null,
  creado_por text not null references public.users(id),
  motivo text check (motivo is null or char_length(motivo) <= 500),
  created_at timestamptz not null default now()
);

create table if not exists public.puntos_movimientos (
  id text primary key default (gen_random_uuid())::text,
  cliente_id text not null references public.users(id),
  tipo text not null check (tipo in ('ganado', 'canjeado', 'vencido')),
  puntos integer not null,
  comercio_origen_id text references public.organizations(id),
  comercio_canje_id text references public.organizations(id),
  factura_cliente_id text references public.facturas_cliente(id),
  fecha_vencimiento date,
  created_at timestamptz not null default now(),
  constraint puntos_ganado_tiene_origen check (
    (tipo = 'ganado' and comercio_origen_id is not null and puntos > 0)
    or (tipo = 'canjeado' and comercio_canje_id is not null and puntos < 0)
    or (tipo = 'vencido' and puntos < 0)
  )
);

create table if not exists public.puntos_liquidaciones (
  id text primary key default (gen_random_uuid())::text,
  comercio_organization_id text not null references public.organizations(id),
  puntos_movimiento_id text not null unique references public.puntos_movimientos(id),
  monto_pagado numeric not null check (monto_pagado >= 0),
  pagado_por text not null references public.users(id),
  created_at timestamptz not null default now()
);

alter table public.puntos_tasas_comercio enable row level security;
alter table public.puntos_movimientos enable row level security;
alter table public.puntos_liquidaciones enable row level security;

-- ───── RLS ─────
-- puntos_movimientos no tiene política INSERT: solo se escribe vía las
-- funciones SECURITY DEFINER de abajo (bypasean RLS), nunca desde el cliente.

create policy puntos_tasas_select on public.puntos_tasas_comercio
  for select using (is_platform_admin() or user_belongs_to_organization(comercio_organization_id));

create policy puntos_tasas_insert_admin on public.puntos_tasas_comercio
  for insert with check (is_platform_admin() and creado_por = auth.uid()::text);

create policy puntos_movimientos_select on public.puntos_movimientos
  for select using (
    cliente_id = auth.uid()::text
    or user_belongs_to_organization(comercio_origen_id)
    or user_belongs_to_organization(comercio_canje_id)
    or is_platform_admin()
  );

create policy puntos_liquidaciones_select on public.puntos_liquidaciones
  for select using (is_platform_admin() or user_belongs_to_organization(comercio_organization_id));

create policy puntos_liquidaciones_insert_admin on public.puntos_liquidaciones
  for insert with check (is_platform_admin() and pagado_por = auth.uid()::text);

-- ───── Funciones ─────

create or replace function public.resolver_tasa_puntos_comercio(p_comercio_id text)
 returns numeric
 language sql
 stable
 set search_path to 'public'
as $function$
  select coalesce(
    (
      select puntos_por_1000 from puntos_tasas_comercio
      where comercio_organization_id = p_comercio_id
        and periodo_vigente_desde <= to_char(now(), 'YYYY-MM')
      order by periodo_vigente_desde desc, created_at desc
      limit 1
    ),
    1 -- default: 1 punto por $1.000 si el comercio nunca configuró tasa.
  );
$function$;

create or replace function public.saldo_puntos_cliente(p_cliente_id text)
 returns integer
 language sql
 stable
 set search_path to 'public'
as $function$
  select coalesce(sum(puntos), 0)::integer from puntos_movimientos where cliente_id = p_cliente_id;
$function$;

create or replace function public.emitir_puntos_por_compra(p_factura_cliente_id text)
 returns void
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_uid text;
  v_comercio_id text;
  v_cliente_id text;
  v_monto numeric;
  v_tasa numeric;
  v_puntos integer;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión no establecida.';
  END IF;

  SELECT oc.comercio_id, m.cliente_id, fc.monto
    INTO v_comercio_id, v_cliente_id, v_monto
    FROM facturas_cliente fc
    JOIN ofertas_comercios oc ON oc.id = fc.oferta_id
    JOIN metas m ON m.id = oc.meta_id
    WHERE fc.id = p_factura_cliente_id;

  IF v_comercio_id IS NULL THEN
    RAISE EXCEPTION 'Factura % no existe o no tiene comercio/cliente asociado', p_factura_cliente_id;
  END IF;

  -- Solo el comercio dueño de esa factura (o admin) puede disparar la emisión.
  IF NOT (v_comercio_id = v_uid OR is_platform_admin()) THEN
    RAISE EXCEPTION 'No autorizado para emitir puntos de esta factura';
  END IF;

  -- Idempotencia: si ya se emitieron puntos por esta factura, no duplicar.
  IF EXISTS (SELECT 1 FROM puntos_movimientos WHERE factura_cliente_id = p_factura_cliente_id AND tipo = 'ganado') THEN
    RETURN;
  END IF;

  v_tasa := resolver_tasa_puntos_comercio(v_comercio_id);
  v_puntos := floor(v_monto / 1000 * v_tasa);

  IF v_puntos <= 0 THEN
    RETURN;
  END IF;

  INSERT INTO puntos_movimientos (cliente_id, tipo, puntos, comercio_origen_id, factura_cliente_id, fecha_vencimiento)
  VALUES (v_cliente_id, 'ganado', v_puntos, v_comercio_id, p_factura_cliente_id, (now() + interval '12 months')::date);
END;
$function$;

create or replace function public.canjear_puntos(p_comercio_id text, p_puntos integer)
 returns text
 language plpgsql
 security definer
 set search_path to 'public'
as $function$
DECLARE
  v_uid text;
  v_saldo integer;
  v_movimiento_id text;
BEGIN
  v_uid := auth.uid()::text;
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Sesión no establecida.';
  END IF;

  IF p_puntos IS NULL OR p_puntos <= 0 THEN
    RAISE EXCEPTION 'La cantidad de puntos a canjear debe ser mayor a cero';
  END IF;

  IF NOT EXISTS (SELECT 1 FROM organizations WHERE id = p_comercio_id AND type IN ('comercio', 'constructora') AND status = 'approved') THEN
    RAISE EXCEPTION 'Comercio/constructora no válido para canje';
  END IF;

  v_saldo := saldo_puntos_cliente(v_uid);
  IF v_saldo < p_puntos THEN
    RAISE EXCEPTION 'Saldo insuficiente: tienes % puntos, intentas canjear %', v_saldo, p_puntos;
  END IF;

  v_movimiento_id := gen_random_uuid()::text;
  INSERT INTO puntos_movimientos (id, cliente_id, tipo, puntos, comercio_canje_id)
  VALUES (v_movimiento_id, v_uid, 'canjeado', -p_puntos, p_comercio_id);

  RETURN v_movimiento_id;
END;
$function$;
