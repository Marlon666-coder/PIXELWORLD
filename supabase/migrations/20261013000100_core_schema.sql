-- PIXEL QUEST — core schema
-- Administrators, competitions, helper functions, triggers, and Row Level Security.

-- ─────────────────────────────────────────────────────────────────────────────
-- Administrators
-- ─────────────────────────────────────────────────────────────────────────────

create table public.admin_users (
  user_id uuid primary key references auth.users (id) on delete cascade,
  note text check (note is null or char_length(note) <= 200),
  created_at timestamptz not null default now()
);

comment on table public.admin_users is
  'Supabase Auth users allowed to manage competitions. Provisioned only by trusted operators '
  '(SQL editor or service role). API clients (anon/authenticated) can neither read nor write it.';

alter table public.admin_users enable row level security;

-- No RLS policies on purpose: with RLS enabled and no policy, every API request is denied.
revoke all on table public.admin_users from anon, authenticated;
grant all on table public.admin_users to service_role;

-- is_admin() is SECURITY DEFINER so policies can consult admin_users without
-- granting clients access to it and without recursive RLS evaluation.
-- Identity comes from the verified JWT (auth.uid()), never from user-editable metadata.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.admin_users au
    where au.user_id = (select auth.uid())
  );
$$;

comment on function public.is_admin() is
  'True when the current JWT subject is listed in public.admin_users.';

revoke all on function public.is_admin() from public;
revoke all on function public.is_admin() from anon;
grant execute on function public.is_admin() to authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Competitions
-- ─────────────────────────────────────────────────────────────────────────────

create table public.competitions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  organizer text not null,
  category text not null,
  description text,
  poster_path text,
  poster_width integer,
  poster_height integer,
  registration_url text,
  registration_deadline timestamptz,
  event_date timestamptz,
  status text not null default 'draft',
  created_by uuid default auth.uid() references auth.users (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),

  constraint competitions_title_check
    check (char_length(btrim(title)) between 3 and 160),
  constraint competitions_organizer_check
    check (char_length(btrim(organizer)) between 2 and 120),
  constraint competitions_description_check
    check (description is null or char_length(description) <= 5000),
  -- Category validation strategy: a CHECK constraint mirroring CATEGORY_VALUES in lib/categories.ts.
  -- Adding a category requires updating both (see docs/SUPABASE.md).
  constraint competitions_category_check
    check (category in (
      'programming',
      'hackathon',
      'ui-ux-design',
      'business',
      'data-science',
      'artificial-intelligence',
      'scientific-writing',
      'photography',
      'graphic-design',
      'other'
    )),
  constraint competitions_status_check
    check (status in ('draft', 'published')),
  constraint competitions_poster_path_format_check
    check (poster_path is null or poster_path ~ '^posters/[0-9a-f-]{36}\.(jpg|png|webp)$'),
  constraint competitions_poster_path_unique
    unique (poster_path),
  constraint competitions_poster_dimensions_check
    check (
      (poster_width is null and poster_height is null)
      or (poster_width between 1 and 12000 and poster_height between 1 and 12000)
    ),
  constraint competitions_published_requires_poster
    check (status = 'draft' or poster_path is not null),
  constraint competitions_registration_url_check
    check (
      registration_url is null
      or (registration_url ~* '^https?://[^\s/$.?#].[^\s]*$' and char_length(registration_url) <= 2048)
    )
);

comment on table public.competitions is 'Competitions shown in the PIXEL QUEST explorer.';
comment on column public.competitions.poster_path is
  'Object path inside the competition-posters bucket (posters/<uuid>.<ext>). Required once published.';
comment on column public.competitions.created_by is
  'Administrator who created the record. Set from auth.uid() by trigger; clients cannot spoof it.';

-- Indexes for the queries the application actually runs.
create index competitions_status_created_at_idx on public.competitions (status, created_at desc);
create index competitions_status_deadline_idx on public.competitions (status, registration_deadline);
create index competitions_category_idx on public.competitions (category);
create index competitions_created_by_idx on public.competitions (created_by);

-- Maintains timestamps and protects immutable columns regardless of what the client sends.
create or replace function public.competitions_before_write()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    if auth.uid() is not null then
      new.created_by := auth.uid();
      new.created_at := now();
    end if;
    new.updated_at := now();
  else
    new.id := old.id;
    new.created_by := old.created_by;
    new.created_at := old.created_at;
    new.updated_at := now();
  end if;

  new.title := btrim(new.title);
  new.organizer := btrim(new.organizer);
  return new;
end;
$$;

create trigger competitions_before_write
before insert or update on public.competitions
for each row execute function public.competitions_before_write();

-- Computed fields used for "nearest deadline" ordering:
-- upcoming deadlines first (soonest first), then closed ones (most recently closed first),
-- then competitions without a deadline.
create or replace function public.deadline_rank(c public.competitions)
returns integer
language sql
stable
set search_path = ''
as $$
  select case
    when c.registration_deadline is null then 2
    when c.registration_deadline > now() then 0
    else 1
  end;
$$;

create or replace function public.deadline_distance(c public.competitions)
returns double precision
language sql
stable
set search_path = ''
as $$
  select abs(extract(epoch from (c.registration_deadline - now())))::double precision;
$$;

-- Per-category totals for the public category tiles (RLS applies: SECURITY INVOKER).
create or replace function public.published_category_counts()
returns table (category text, total bigint)
language sql
stable
security invoker
set search_path = ''
as $$
  select c.category, count(*)::bigint as total
  from public.competitions c
  where c.status = 'published'
  group by c.category;
$$;

revoke all on function public.deadline_rank(public.competitions) from public;
revoke all on function public.deadline_distance(public.competitions) from public;
revoke all on function public.published_category_counts() from public;
grant execute on function public.deadline_rank(public.competitions) to anon, authenticated, service_role;
grant execute on function public.deadline_distance(public.competitions) to anon, authenticated, service_role;
grant execute on function public.published_category_counts() to anon, authenticated, service_role;

-- ─────────────────────────────────────────────────────────────────────────────
-- Row Level Security
-- ─────────────────────────────────────────────────────────────────────────────

alter table public.competitions enable row level security;

revoke all on table public.competitions from anon, authenticated;
grant select on table public.competitions to anon, authenticated;
grant insert, update, delete on table public.competitions to authenticated;
grant all on table public.competitions to service_role;

create policy "Published competitions are visible to everyone"
  on public.competitions
  for select
  to anon, authenticated
  using (status = 'published');

create policy "Administrators can read all competitions"
  on public.competitions
  for select
  to authenticated
  using ((select public.is_admin()));

create policy "Administrators can create competitions"
  on public.competitions
  for insert
  to authenticated
  with check ((select public.is_admin()) and created_by = (select auth.uid()));

create policy "Administrators can update competitions"
  on public.competitions
  for update
  to authenticated
  using ((select public.is_admin()))
  with check ((select public.is_admin()));

create policy "Administrators can delete competitions"
  on public.competitions
  for delete
  to authenticated
  using ((select public.is_admin()));
