-- Mi Presupuesto: categorías de presupuesto mensual del cliente (Fase 1 de
-- Finanzas Personales). Reemplaza el mock de ControlFinancieroView.tsx por
-- datos reales. Alcance de esta primera versión: solo categorías (nombre,
-- presupuesto, gastado) por mes — deudas, ingresos y OCR de facturas quedan
-- para fases siguientes (ver docs/spec-finanzas-personales-fase1-2026-08-08.md).

create table if not exists public.presupuesto_categorias (
  id text primary key,
  cliente_id text not null,
  mes text not null, -- formato 'YYYY-MM'
  nombre text not null,
  presupuesto bigint not null default 0,
  gastado bigint not null default 0,
  color text not null default 'blue',
  icono text not null default 'MoreHorizontal',
  created_at timestamptz not null default now()
);

create index if not exists idx_presupuesto_categorias_cliente_mes
  on public.presupuesto_categorias (cliente_id, mes);

alter table public.presupuesto_categorias enable row level security;

create policy presupuesto_categorias_select_own
  on public.presupuesto_categorias for select
  using (cliente_id = (auth.uid())::text or is_platform_admin());

create policy presupuesto_categorias_insert_own
  on public.presupuesto_categorias for insert
  with check (cliente_id = (auth.uid())::text);

create policy presupuesto_categorias_update_own
  on public.presupuesto_categorias for update
  using (cliente_id = (auth.uid())::text or is_platform_admin());

create policy presupuesto_categorias_delete_own
  on public.presupuesto_categorias for delete
  using (cliente_id = (auth.uid())::text);
