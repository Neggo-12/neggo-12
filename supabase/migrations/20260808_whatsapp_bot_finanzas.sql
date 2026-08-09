-- Bot de WhatsApp con personalidad (Fase 1 de Finanzas Personales, pieza 3) — ver
-- docs/spec-finanzas-personales-fase1-2026-08-08.md. Estas tablas NO las toca el
-- cliente directo vía Supabase Auth (WhatsApp no tiene sesión/JWT) — las escribe
-- únicamente la Edge Function whatsapp-webhook usando el service role, igual que
-- send-notification. Por eso RLS acá solo habilita lectura a is_platform_admin(),
-- sin policies de insert/update para authenticated/anon: el límite de seguridad
-- real es código explícito en la función (filtra siempre por cliente_id ya
-- resuelto y verificado), no RLS.

create table if not exists public.whatsapp_identidades (
  id text primary key,
  cliente_id text not null references public.users(id),
  numero_normalizado text not null unique, -- solo dígitos, ej '573001234567'
  verificado_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_identidades_cliente
  on public.whatsapp_identidades (cliente_id);

alter table public.whatsapp_identidades enable row level security;

create policy whatsapp_identidades_admin_select
  on public.whatsapp_identidades for select
  using (is_platform_admin());

create table if not exists public.whatsapp_mensajes (
  id text primary key,
  cliente_id text not null references public.users(id),
  direccion text not null check (direccion in ('entrante', 'saliente')),
  tipo text not null default 'text' check (tipo in ('text', 'image')),
  texto text,
  movimiento_ocr_id text references public.movimientos_ocr(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists idx_whatsapp_mensajes_cliente
  on public.whatsapp_mensajes (cliente_id, created_at);

alter table public.whatsapp_mensajes enable row level security;

create policy whatsapp_mensajes_admin_select
  on public.whatsapp_mensajes for select
  using (is_platform_admin());
