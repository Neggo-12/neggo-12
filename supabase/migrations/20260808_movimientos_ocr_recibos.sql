-- OCR de facturas/recibos (Fase 1 de Finanzas Personales, pieza 2) — ver
-- docs/spec-finanzas-personales-fase1-2026-08-08.md. El cliente sube/toma
-- foto de un recibo, el Edge Function `procesar-recibo` llama a Google
-- Document AI y guarda acá lo extraído. NUNCA se escribe un gasto real
-- directo: el cliente siempre confirma (o descarta) antes de que impacte
-- presupuesto_categorias.gastado, vía registrarGastoCategoria ya existente.

create table if not exists public.movimientos_ocr (
  id text primary key,
  cliente_id text not null,
  imagen_path text not null, -- path en el bucket privado recibos-clientes, no URL pública
  comercio_extraido text,
  valor_extraido bigint,
  fecha_extraida date,
  categoria_sugerida text,
  confianza_ocr numeric,
  categoria_id text, -- categoría de presupuesto elegida al confirmar (puede diferir de la sugerida)
  estado text not null default 'pendiente_revision'
    check (estado in ('pendiente_revision', 'confirmado', 'descartado')),
  created_at timestamptz not null default now(),
  revisado_at timestamptz
);

create index if not exists idx_movimientos_ocr_cliente
  on public.movimientos_ocr (cliente_id, estado);

alter table public.movimientos_ocr
  add constraint movimientos_ocr_cliente_id_fkey
  foreign key (cliente_id) references public.users(id);

alter table public.movimientos_ocr
  add constraint movimientos_ocr_categoria_id_fkey
  foreign key (categoria_id) references public.presupuesto_categorias(id) on delete set null;

alter table public.movimientos_ocr enable row level security;

create policy movimientos_ocr_select_own
  on public.movimientos_ocr for select
  using (cliente_id = (auth.uid())::text or is_platform_admin());

create policy movimientos_ocr_insert_own
  on public.movimientos_ocr for insert
  with check (cliente_id = (auth.uid())::text);

create policy movimientos_ocr_update_own
  on public.movimientos_ocr for update
  using (cliente_id = (auth.uid())::text);

-- ───── Storage: bucket privado para las fotos de recibos ─────

insert into storage.buckets (id, name, public)
values ('recibos-clientes', 'recibos-clientes', false)
on conflict (id) do nothing;

create policy cliente_sube_su_propio_recibo
  on storage.objects for insert
  with check (
    bucket_id = 'recibos-clientes'
    and (storage.foldername(name))[1] = (auth.uid())::text
  );

create policy cliente_lee_su_propio_recibo
  on storage.objects for select
  using (
    bucket_id = 'recibos-clientes'
    and ((storage.foldername(name))[1] = (auth.uid())::text or is_platform_admin())
  );
