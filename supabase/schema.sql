-- Supabase schema for PouApp friends system
-- Enable required extensions
create extension if not exists "pgcrypto";

-- Profiles table mirrors auth.users 1:1 and stores display names + friend codes
create table if not exists public.profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  display_name text,
  code text not null unique,
  created_at timestamptz not null default now()
);

create or replace function public.prevent_display_name_change()
returns trigger
language plpgsql
as $$
begin
  if coalesce(old.display_name, '') <> '' and old.display_name is distinct from new.display_name then
    raise exception 'display_name_locked';
  end if;
  return new;
end;
$$;

drop trigger if exists trg_prevent_display_name_change on public.profiles;
create trigger trg_prevent_display_name_change
before update of display_name on public.profiles
for each row
execute function public.prevent_display_name_change();

-- Friend requests table
do $$
begin
  create type public.friend_request_status as enum ('pending','accepted','declined');
exception
  when duplicate_object then null;
end $$;

alter table public.profiles add column if not exists pet_type text;
alter table public.profiles add column if not exists xp integer not null default 0;
alter table public.profiles alter column xp set default 0;
alter table public.profiles add column if not exists equipped jsonb not null default '{}'::jsonb;
alter table public.profiles add column if not exists last_seen timestamptz default now();
create table if not exists public.friend_requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id) on delete cascade default auth.uid(),
  addressee_id uuid not null references auth.users(id) on delete cascade,
  status public.friend_request_status not null default 'pending',
  created_at timestamptz not null default now(),
  responded_at timestamptz,
  constraint friend_requests_unique_pair unique (requester_id, addressee_id)
);

-- Friendships store a directed edge (two rows per accepted friendship)
create table if not exists public.friendships (
  user_id uuid not null references auth.users(id) on delete cascade,
  friend_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, friend_id)
);

-- Generate unique friend codes (6 uppercase chars)
create or replace function public.generate_unique_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  candidate text;
begin
  loop
    candidate := upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 6));
    exit when not exists(select 1 from public.profiles where code = candidate);
  end loop;
  return candidate;
end;
$$;

-- Accept friend request RPC: marks request accepted + creates friendship rows
create or replace function public.accept_friend_request(req_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  req record;
begin
  select * into req
  from public.friend_requests
  where id = req_id
    and status = 'pending'
    for update;

  if not found then
    raise exception 'request_not_found';
  end if;

  if req.addressee_id <> auth.uid() then
    raise exception 'not_authorized';
  end if;

  update public.friend_requests
     set status = 'accepted', responded_at = now()
   where id = req_id;

  insert into public.friendships (user_id, friend_id)
  values (req.requester_id, req.addressee_id)
  on conflict do nothing;

  insert into public.friendships (user_id, friend_id)
  values (req.addressee_id, req.requester_id)
  on conflict do nothing;
end;
$$;

create table if not exists public.friend_visits (
  host_id uuid primary key references auth.users(id) on delete cascade,
  visitor_id uuid not null references auth.users(id) on delete cascade,
  visitor_name text,
  visitor_pet_type text,
  visitor_equipped jsonb not null default '{}'::jsonb,
  visitor_started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.friend_visits enable row level security;

drop policy if exists friend_visits_select on public.friend_visits;
create policy friend_visits_select on public.friend_visits
  for select using (auth.uid() = host_id or auth.uid() = visitor_id);

drop policy if exists friend_visits_insert on public.friend_visits;
create policy friend_visits_insert on public.friend_visits
  for insert with check (auth.uid() = visitor_id);

drop policy if exists friend_visits_update on public.friend_visits;
create policy friend_visits_update on public.friend_visits
  for update using (auth.uid() = visitor_id) with check (auth.uid() = visitor_id);

drop policy if exists friend_visits_delete on public.friend_visits;
create policy friend_visits_delete on public.friend_visits
  for delete using (auth.uid() = host_id or auth.uid() = visitor_id);

-- Friend game invites (multiplayer sessions / challenges)
do $$
begin
  create type public.friend_game_status as enum ('pending','active','declined','cancelled','finished');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.friend_game_invites (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references auth.users(id) on delete cascade,
  opponent_id uuid not null references auth.users(id) on delete cascade,
  game_type text not null default 'tictactoe',
  status public.friend_game_status not null default 'pending',
  board jsonb not null default '[]'::jsonb,
  turn uuid,
  winner uuid,
  host_symbol text not null default 'X',
  opponent_symbol text not null default 'O',
  host_name text,
  opponent_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.set_friend_game_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

drop trigger if exists trg_friend_game_updated_at on public.friend_game_invites;
create trigger trg_friend_game_updated_at
before update on public.friend_game_invites
for each row
execute function public.set_friend_game_updated_at();

alter table public.friend_game_invites enable row level security;

drop policy if exists friend_game_invites_select on public.friend_game_invites;
create policy friend_game_invites_select on public.friend_game_invites
  for select using (auth.uid() = host_id or auth.uid() = opponent_id);

drop policy if exists friend_game_invites_insert on public.friend_game_invites;
create policy friend_game_invites_insert on public.friend_game_invites
  for insert with check (auth.uid() = host_id);

drop policy if exists friend_game_invites_update on public.friend_game_invites;
create policy friend_game_invites_update on public.friend_game_invites
  for update using (auth.uid() = host_id or auth.uid() = opponent_id)
  with check (auth.uid() = host_id or auth.uid() = opponent_id);

drop policy if exists friend_game_invites_delete on public.friend_game_invites;
create policy friend_game_invites_delete on public.friend_game_invites
  for delete using (auth.uid() = host_id or auth.uid() = opponent_id);

create or replace function public.remove_friendship(target_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'not_authenticated';
  end if;

  delete from public.friendships where user_id = uid and friend_id = target_id;
  delete from public.friendships where user_id = target_id and friend_id = uid;

  delete from public.friend_requests where requester_id = uid and addressee_id = target_id;
  delete from public.friend_requests where requester_id = target_id and addressee_id = uid;
end;
$$;


-- User progress table (sync game state)
create table if not exists public.user_progress (
  user_id uuid primary key references auth.users(id) on delete cascade,
  hunger smallint not null default 80,
  fun smallint not null default 80,
  clean smallint not null default 80,
  energy smallint not null default 80,
  xp integer not null default 0,
  coins integer not null default 0,
  pet_type text,
  inventory jsonb not null default '{}'::jsonb,
  equipped jsonb not null default '{}'::jsonb,
  is_sleeping boolean not null default false,
  saved_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Convenience views
create or replace view public.friends_view as
select
  f.user_id,
  f.friend_id,
  p.code as friend_code,
  coalesce(p.display_name, '') as friend_name
from public.friendships f
join public.profiles p on p.user_id = f.friend_id;

create or replace view public.friend_requests_view as
select
  fr.id,
  fr.requester_id,
  fr.addressee_id,
  fr.status,
  fr.created_at,
  fr.responded_at,
  pr.code as requester_code,
  coalesce(pr.display_name, '') as requester_name
from public.friend_requests fr
join public.profiles pr on pr.user_id = fr.requester_id;

-- Row Level Security
alter table public.user_progress enable row level security;
-- Row Level Security
alter table public.profiles enable row level security;
alter table public.friend_requests enable row level security;
alter table public.friendships enable row level security;

drop policy if exists user_progress_select on public.user_progress;
drop policy if exists user_progress_insert on public.user_progress;
drop policy if exists user_progress_update on public.user_progress;
create policy user_progress_select on public.user_progress
  for select using (auth.uid() = user_id);
create policy user_progress_insert on public.user_progress
  for insert with check (auth.uid() = user_id);
create policy user_progress_update on public.user_progress
  for update using (auth.uid() = user_id);

drop policy if exists profiles_select on public.profiles;
drop policy if exists profiles_insert on public.profiles;
drop policy if exists profiles_update on public.profiles;
create policy profiles_select on public.profiles
  for select using (true);
create policy profiles_insert on public.profiles
  for insert with check (auth.uid() = user_id);
create policy profiles_update on public.profiles
  for update using (auth.uid() = user_id);

drop policy if exists friend_requests_select on public.friend_requests;
drop policy if exists friend_requests_insert on public.friend_requests;
drop policy if exists friend_requests_update on public.friend_requests;
create policy friend_requests_select on public.friend_requests
  for select using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy friend_requests_insert on public.friend_requests
  for insert with check (auth.uid() = requester_id);
create policy friend_requests_update on public.friend_requests
  for update using (auth.uid() = addressee_id);

drop policy if exists friendships_select on public.friendships;
drop policy if exists friendships_insert on public.friendships;
drop policy if exists friendships_delete on public.friendships;
create policy friendships_select on public.friendships
  for select using (auth.uid() = user_id);
create policy friendships_insert on public.friendships
  for insert with check (auth.uid() = user_id);
create policy friendships_delete on public.friendships
  for delete using (auth.uid() = user_id);
