-- Execute uma vez no SQL Editor do projeto SalaInfo.
begin;
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 100),
  active boolean not null default true
);
alter table public.profiles enable row level security;

-- Cadastro autorizado somente pelo administrador no painel/SQL.
create function public.salainfo_member() returns boolean
language sql stable security definer set search_path = ''
as $$ select exists(select 1 from public.profiles where id = auth.uid() and active); $$;
revoke all on function public.salainfo_member() from public;
grant execute on function public.salainfo_member() to authenticated;

create policy "Membros leem nomes" on public.profiles for select to authenticated
using (public.salainfo_member());
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;

create table public.reservations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references public.profiles(id),
  room_id text not null default 'informatica' check (room_id = 'informatica'),
  date date not null,
  lesson smallint not null check (lesson between 1 and 5),
  school_class text not null check (school_class in ('1º ano A','2º ano A','3º ano A','4º ano A','5º ano A','6º ano A','7º ano A','8º ano A','9º ano A')),
  purpose text not null default '' check (char_length(purpose) <= 300),
  created_at timestamptz not null default now(),
  unique (room_id,date,lesson)
);
alter table public.reservations enable row level security;
revoke all on public.reservations from anon, authenticated;
grant select, delete on public.reservations to authenticated;
grant insert (date,lesson,school_class,purpose) on public.reservations to authenticated;
create policy "Membros consultam reservas" on public.reservations
for select to authenticated using (public.salainfo_member());
create policy "Membro reserva em seu nome" on public.reservations
for insert to authenticated with check (
  public.salainfo_member() and user_id = auth.uid()
  and date >= (now() at time zone 'America/Sao_Paulo')::date
);
create policy "Proprietario cancela" on public.reservations
for delete to authenticated using (
  public.salainfo_member() and user_id = auth.uid()
  and date >= (now() at time zone 'America/Sao_Paulo')::date
);
commit;
