-- =====================================================================
-- Trading Plan — schéma Supabase
-- À coller dans Supabase → SQL Editor → Run.
-- =====================================================================

-- 1) Tables --------------------------------------------------------------

create table if not exists public.profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  name       text,
  role       text not null default 'member',  -- 'member' | 'mentor'
  created_at timestamptz not null default now()
);

create table if not exists public.plans (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

create table if not exists public.trades (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  date          date not null,
  asset         text,
  direction     text,
  session       text,
  emotion       text,
  rr_target     double precision,
  rr_result     double precision,
  risk_pct      double precision,
  followed_plan boolean,
  confluences   jsonb,
  notes         text,
  created_at    timestamptz not null default now()
);

create index if not exists trades_user_date_idx on public.trades (user_id, date desc);

-- 2) Création auto du profil à l'inscription -----------------------------

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, name)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- 3) Helper "est-ce un mentor ?" (security definer pour éviter la récursion RLS)

create or replace function public.is_mentor()
returns boolean
language sql
security definer stable set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'mentor'
  );
$$;

-- 4) Row Level Security --------------------------------------------------

alter table public.profiles enable row level security;
alter table public.plans    enable row level security;
alter table public.trades   enable row level security;

-- profiles : chacun le sien ; le mentor voit tout
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles
  for select using (id = auth.uid() or public.is_mentor());

drop policy if exists profiles_update_own on public.profiles;
create policy profiles_update_own on public.profiles
  for update using (id = auth.uid());

-- plans : chacun le sien ; le mentor lit tout
drop policy if exists plans_select on public.plans;
create policy plans_select on public.plans
  for select using (user_id = auth.uid() or public.is_mentor());

drop policy if exists plans_write_own on public.plans;
create policy plans_write_own on public.plans
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- trades : chacun les siens ; le mentor lit tout
drop policy if exists trades_select on public.trades;
create policy trades_select on public.trades
  for select using (user_id = auth.uid() or public.is_mentor());

drop policy if exists trades_write_own on public.trades;
create policy trades_write_own on public.trades
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =====================================================================
-- Te désigner comme mentor (remplace par ton email) :
--   update public.profiles set role = 'mentor'
--   where id = (select id from auth.users where email = 'toi@email.com');
-- =====================================================================
