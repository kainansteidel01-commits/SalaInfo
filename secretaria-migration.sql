-- Execute APÓS supabase-setup.sql. Preserva professores e reservas.
begin;
alter table public.profiles add column if not exists role text not null default 'teacher'
  check (role in ('teacher','secretary'));
create or replace function public.salainfo_secretary() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where id = auth.uid() and active and role = 'secretary'); $$;
revoke all on function public.salainfo_secretary() from public;
grant execute on function public.salainfo_secretary() to authenticated;
drop policy if exists "Secretaria cancela reservas" on public.reservations;
create policy "Secretaria cancela reservas" on public.reservations
for delete to authenticated using (public.salainfo_secretary());
commit;

-- Autorize SOMENTE a conta que deve administrar a escola:
-- update public.profiles set role = 'secretary' where id = 'UUID-DA-SECRETARIA';
