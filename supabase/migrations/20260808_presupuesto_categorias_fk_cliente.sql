-- Consistencia con el patrón ya usado en metas_cliente_id_fkey.
alter table public.presupuesto_categorias
  add constraint presupuesto_categorias_cliente_id_fkey
  foreign key (cliente_id) references public.users(id);
