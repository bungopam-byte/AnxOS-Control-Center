-- AnxOS account system: profiles, device authorization, registered devices, and audit history.
-- Apply with: supabase db push

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique,
  display_name text not null,
  avatar_url text,
  role text not null default 'user',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_username_format check (username ~ '^[a-zA-Z0-9_][a-zA-Z0-9_-]{2,31}$'),
  constraint profiles_display_name_length check (char_length(display_name) between 1 and 80),
  constraint profiles_role_valid check (role in ('user', 'owner', 'admin'))
);

create table if not exists public.device_authorization_requests (
  id uuid primary key default gen_random_uuid(),
  device_code_hash text not null unique,
  user_code_hash text not null unique,
  user_code_hint text not null,
  status text not null default 'pending',
  approved_by uuid references auth.users(id) on delete set null,
  denied_by uuid references auth.users(id) on delete set null,
  device_name text not null default 'Unknown device',
  platform text not null default 'desktop',
  arch text,
  app_name text not null default 'AnxOS-Control-Center',
  app_version text,
  request_ip inet,
  user_agent text,
  poll_interval_seconds integer not null default 5,
  poll_count integer not null default 0,
  last_polled_at timestamptz,
  approved_at timestamptz,
  denied_at timestamptz,
  consumed_at timestamptz,
  expires_at timestamptz not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint device_authorization_status_valid check (status in ('pending', 'approved', 'denied', 'consumed', 'expired')),
  constraint device_authorization_poll_interval_valid check (poll_interval_seconds between 3 and 30)
);

create table if not exists public.registered_devices (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_name text not null,
  platform text not null,
  arch text,
  app_name text not null default 'AnxOS-Control-Center',
  app_version text,
  first_seen_at timestamptz not null default now(),
  last_seen_at timestamptz,
  revoked_at timestamptz,
  revoked_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.account_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  device_id uuid references public.registered_devices(id) on delete cascade,
  refresh_token_hash text not null unique,
  user_agent text,
  ip inet,
  created_at timestamptz not null default now(),
  last_seen_at timestamptz,
  expires_at timestamptz not null,
  revoked_at timestamptz,
  rotated_from uuid references public.account_sessions(id) on delete set null
);

create table if not exists public.security_events (
  id bigint generated always as identity primary key,
  user_id uuid references auth.users(id) on delete set null,
  event_type text not null,
  outcome text not null default 'ok',
  ip inet,
  user_agent text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  constraint security_events_outcome_valid check (outcome in ('ok', 'failed', 'denied', 'expired'))
);

create index if not exists idx_device_auth_user_code_hash on public.device_authorization_requests(user_code_hash);
create index if not exists idx_device_auth_device_code_hash on public.device_authorization_requests(device_code_hash);
create index if not exists idx_device_auth_expires_at on public.device_authorization_requests(expires_at);
create index if not exists idx_registered_devices_user_id on public.registered_devices(user_id);
create index if not exists idx_account_sessions_user_id on public.account_sessions(user_id);
create index if not exists idx_account_sessions_device_id on public.account_sessions(device_id);
create index if not exists idx_account_sessions_refresh_token_hash on public.account_sessions(refresh_token_hash);
create index if not exists idx_security_events_user_id_created_at on public.security_events(user_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

drop trigger if exists device_authorization_set_updated_at on public.device_authorization_requests;
create trigger device_authorization_set_updated_at
before update on public.device_authorization_requests
for each row execute function public.set_updated_at();

drop trigger if exists registered_devices_set_updated_at on public.registered_devices;
create trigger registered_devices_set_updated_at
before update on public.registered_devices
for each row execute function public.set_updated_at();

create or replace function public.sanitize_username(value text, fallback text)
returns text
language plpgsql
as $$
declare
  cleaned text;
begin
  cleaned := regexp_replace(coalesce(value, fallback, ''), '[^a-zA-Z0-9_-]', '', 'g');
  cleaned := lower(substr(cleaned, 1, 24));
  if char_length(cleaned) < 3 then
    cleaned := 'user_' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);
  end if;
  return cleaned;
end;
$$;

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  base_username text;
  candidate text;
  suffix int := 0;
begin
  base_username := public.sanitize_username(
    new.raw_user_meta_data ->> 'username',
    split_part(coalesce(new.email, 'user'), '@', 1)
  );
  candidate := base_username;

  while exists (select 1 from public.profiles where username = candidate) loop
    suffix := suffix + 1;
    candidate := substr(base_username, 1, 24) || '_' || suffix::text;
  end loop;

  insert into public.profiles (id, username, display_name, avatar_url, role)
  values (
    new.id,
    candidate,
    coalesce(nullif(substr(new.raw_user_meta_data ->> 'display_name', 1, 80), ''), candidate),
    nullif(substr(new.raw_user_meta_data ->> 'avatar_url', 1, 300), ''),
    'user'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_create_profile on auth.users;
create trigger on_auth_user_created_create_profile
after insert on auth.users
for each row execute function public.create_profile_for_new_user();

alter table public.profiles enable row level security;
alter table public.device_authorization_requests enable row level security;
alter table public.registered_devices enable row level security;
alter table public.account_sessions enable row level security;
alter table public.security_events enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles for select
using (auth.uid() = id);

drop policy if exists "profiles_update_own_safe_fields" on public.profiles;
create policy "profiles_update_own_safe_fields"
on public.profiles for update
using (auth.uid() = id)
with check (
  auth.uid() = id
  and role = (select role from public.profiles existing where existing.id = auth.uid())
);

drop policy if exists "registered_devices_select_own" on public.registered_devices;
create policy "registered_devices_select_own"
on public.registered_devices for select
using (auth.uid() = user_id);

drop policy if exists "registered_devices_update_own_revoke_only" on public.registered_devices;
create policy "registered_devices_update_own_revoke_only"
on public.registered_devices for update
using (auth.uid() = user_id)
with check (auth.uid() = user_id);

drop policy if exists "account_sessions_select_own" on public.account_sessions;
create policy "account_sessions_select_own"
on public.account_sessions for select
using (auth.uid() = user_id);

drop policy if exists "security_events_select_own" on public.security_events;
create policy "security_events_select_own"
on public.security_events for select
using (auth.uid() = user_id);

-- Device authorization requests intentionally have no browser-accessible select/update policy.
-- All lookup, approval, denial, polling, and exchange operations run through the trusted Edge Function.

create or replace function public.revoke_registered_device(target_device_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.registered_devices
  set revoked_at = coalesce(revoked_at, now()), revoked_reason = coalesce(revoked_reason, 'user_revoked')
  where id = target_device_id and user_id = auth.uid();

  update public.account_sessions
  set revoked_at = coalesce(revoked_at, now())
  where device_id = target_device_id and user_id = auth.uid();
end;
$$;

create or replace function public.revoke_current_user_sessions()
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.account_sessions
  set revoked_at = coalesce(revoked_at, now())
  where user_id = auth.uid() and revoked_at is null;
end;
$$;

create or replace function public.cleanup_expired_device_authorizations()
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  affected integer;
begin
  update public.device_authorization_requests
  set status = 'expired'
  where status = 'pending' and expires_at <= now();
  get diagnostics affected = row_count;
  return affected;
end;
$$;
