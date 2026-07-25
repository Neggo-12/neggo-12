-- Fase 2 del "SIEM-lite": tabla donde queda el resultado de cada revisión
-- periódica de advisors de Supabase (la tarea programada de Fase 3 escribe acá,
-- vía Supabase MCP con credenciales de gestión — el cliente de la app NUNCA
-- escribe en esta tabla, por eso no tiene política de INSERT para
-- anon/authenticated). El panel de Seguridad del Admin (Fase 2) solo LEE el
-- último snapshot.
create table if not exists public.seguridad_advisors_snapshot (
  id text primary key default gen_random_uuid()::text,
  checked_at timestamptz not null default now(),
  security_warnings_count integer not null default 0,
  performance_warnings_count integer,
  hallazgos jsonb not null default '[]'::jsonb,
  notas text,
  created_at timestamptz not null default now()
);

alter table public.seguridad_advisors_snapshot enable row level security;

-- Solo Admin puede leer. Sin política de INSERT/UPDATE/DELETE para
-- anon/authenticated a propósito — la tabla la alimenta exclusivamente la
-- revisión periódica externa (Supabase MCP), nunca el cliente de la app.
create policy seguridad_snapshot_select_admin_only
  on public.seguridad_advisors_snapshot
  for select
  using (is_platform_admin());
