-- Ensure profile polish fields exist on projects that applied the original
-- account migration before those columns were added to the local schema file.
alter table public.profiles add column if not exists bio text;
alter table public.profiles add column if not exists time_zone text;
alter table public.profiles add column if not exists preferred_platform text;
alter table public.profiles add column if not exists website_url text;
alter table public.profiles add column if not exists github_url text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_bio_length'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_bio_length check (bio is null or char_length(bio) <= 280);
  end if;

  if not exists (
    select 1
    from pg_constraint
    where conname = 'profiles_platform_valid'
      and conrelid = 'public.profiles'::regclass
  ) then
    alter table public.profiles
      add constraint profiles_platform_valid check (preferred_platform is null or preferred_platform in ('windows', 'linux', 'macos', 'server'));
  end if;
end $$;
