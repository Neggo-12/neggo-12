-- comercio_contactos.comercio_id references organizations(id), not the
-- authenticated user directly. The SELECT/UPDATE policies compared
-- comercio_id = auth.uid()::text, which can never match: a comercio's
-- auth user id and its organization id are different values, linked via
-- memberships (same relationship already handled correctly elsewhere via
-- user_belongs_to_organization(), e.g. facturas_ledger, me_interesa_destinatarios).
-- This left every comercio unable to read or update its own contactos.

drop policy if exists "comercio_contactos_select" on public.comercio_contactos;
create policy "comercio_contactos_select" on public.comercio_contactos
  for select
  using (
    cliente_id = auth.uid()::text
    or user_belongs_to_organization(comercio_id)
    or is_platform_admin()
  );

drop policy if exists "comercio_contactos_update_comercio" on public.comercio_contactos;
create policy "comercio_contactos_update_comercio" on public.comercio_contactos
  for update
  using (user_belongs_to_organization(comercio_id))
  with check (user_belongs_to_organization(comercio_id));
