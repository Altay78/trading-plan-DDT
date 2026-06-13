-- ============================================================
-- DDT — Schéma Supabase
-- À coller dans : Supabase → SQL Editor → New query → Run
-- ============================================================

-- 1) PROFILES : 1 ligne par utilisateur (rôle + nom)
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  name text,
  role text not null default 'member',
  created_at timestamptz default now()
);

-- 2) PLANS : 1 plan par membre (stocké en JSON)
create table if not exists public.plans (
  user_id uuid primary key references auth.users(id) on delete cascade,
  data jsonb not null,
  updated_at timestamptz default now()
);

-- 3) TRADES : journal
create table if not exists public.trades (
  id uuid primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  date date,
  asset text,
  direction text,
  session text,
  emotion text,
  rr_target numeric,
  sl_pips numeric,
  rr_result numeric,
  risk_pct numeric,
  status text,
  realized_amount numeric,
  followed_plan boolean,
  confluences jsonb,
  notes text,
  created_at timestamptz default now()
);

-- ============================================================
-- ROW LEVEL SECURITY : chacun ne voit QUE ses données
-- ============================================================
alter table public.profiles enable row level security;
alter table public.plans    enable row level security;
alter table public.trades   enable row level security;

-- Helper : l'utilisateur courant est-il mentor ? (security definer = pas de récursion RLS)
create or replace function public.is_mentor()
returns boolean
language sql
security definer
stable
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'mentor'
  );
$$;

-- PROFILES : on lit son propre profil ; le mentor lit tous les profils
drop policy if exists "profiles_select" on public.profiles;
create policy "profiles_select" on public.profiles
  for select using (auth.uid() = id or public.is_mentor());

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own" on public.profiles
  for update using (auth.uid() = id);

-- PLANS : accès complet à son propre plan uniquement
drop policy if exists "plans_own" on public.plans;
create policy "plans_own" on public.plans
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- TRADES : accès complet à ses propres trades uniquement
drop policy if exists "trades_own" on public.trades;
create policy "trades_own" on public.trades
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ============================================================
-- TRIGGER : crée le profil à l'inscription
-- Le TOUT PREMIER inscrit devient automatiquement "mentor".
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
as $$
declare
  existing int;
begin
  select count(*) into existing from public.profiles;
  insert into public.profiles (id, email, name, role)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', ''),
    case when existing = 0 then 'mentor'
         else coalesce(new.raw_user_meta_data->>'role', 'member') end
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
