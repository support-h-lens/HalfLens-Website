-- Bootstrap for a NEW Half Lens project. Existing publishing migration follows this one.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.website_cms_members (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  cms_role text not null check (cms_role in ('owner', 'editor', 'viewer')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.website_cms_members enable row level security;
revoke all on public.website_cms_members from anon, authenticated;
grant select on public.website_cms_members to authenticated;
create policy "members read own membership" on public.website_cms_members
  for select to authenticated using (user_id = (select auth.uid()));

-- Kept outside the exposed API schema, with a fixed search path to avoid RLS recursion.
create function private.website_cms_role() returns text
language sql stable security definer set search_path = '' as $$
  select cms_role from public.website_cms_members
  where user_id = (select auth.uid()) and is_active = true
$$;
revoke all on function private.website_cms_role() from public, anon;
grant execute on function private.website_cms_role() to authenticated;

create function public.website_cms_current_user_id() returns uuid
language sql stable security invoker set search_path = '' as $$ select auth.uid() $$;
revoke all on function public.website_cms_current_user_id() from public, anon;
grant execute on function public.website_cms_current_user_id() to authenticated;

create function private.website_stamp_content() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if new.status = 'published' then
    new.published_at := coalesce(new.published_at, now());
  else
    new.published_at := null;
  end if;
  return new;
end $$;
revoke all on function private.website_stamp_content() from public, anon, authenticated;

create table public.website_projects (
  id uuid primary key default gen_random_uuid(),
  project_code text not null unique,
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null, category text not null, client text not null,
  production_role text not null, format text not null default '',
  project_year integer check (project_year between 1900 and 2100),
  palette text not null default 'amber' check (palette in ('amber','violet','cyan','crimson','silver')),
  image_url text, youtube_id text, youtube_url text, youtube_poster_url text,
  aspect_ratio numeric not null default 1.77777778 check (aspect_ratio > 0),
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  seo_title text, seo_description text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  published_at timestamptz
);
create table public.website_clients (
  id uuid primary key default gen_random_uuid(), client_code text not null unique,
  name text not null, abbreviation text not null, logo_url text,
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  published_at timestamptz
);
create table public.website_sections (
  id uuid primary key default gen_random_uuid(), section_key text not null unique,
  label text not null, content jsonb not null default '{}', sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  published_at timestamptz
);
create table public.website_redirects (
  id uuid primary key default gen_random_uuid(), source_path text not null unique,
  target_path text not null, status_code integer not null default 301 check (status_code in (301,308)),
  is_active boolean not null default true, notes text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  check (source_path ~ '^/[^/]' and target_path ~ '^/[^/]')
);

do $$ declare table_name text; begin
  foreach table_name in array array['website_projects','website_clients','website_sections','website_redirects'] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('revoke all on public.%I from anon, authenticated', table_name);
    execute format('grant select, insert, update, delete on public.%I to authenticated', table_name);
    execute format('create policy cms_read on public.%I for select to authenticated using ((select private.website_cms_role()) is not null)', table_name);
    execute format('create policy cms_insert on public.%I for insert to authenticated with check ((select private.website_cms_role()) in (''owner'',''editor''))', table_name);
    execute format('create policy cms_update on public.%I for update to authenticated using ((select private.website_cms_role()) in (''owner'',''editor'')) with check ((select private.website_cms_role()) in (''owner'',''editor''))', table_name);
    execute format('create policy cms_delete on public.%I for delete to authenticated using ((select private.website_cms_role()) = ''owner'')', table_name);
    if table_name <> 'website_redirects' then
      execute format('grant select on public.%I to anon', table_name);
      execute format('create policy public_published on public.%I for select to anon, authenticated using (status = ''published'')', table_name);
      execute format('create trigger stamp_content before insert or update on public.%I for each row execute function private.website_stamp_content()', table_name);
      execute format('create index on public.%I (status, sort_order, created_at)', table_name);
    end if;
  end loop;
end $$;
grant select (source_path, target_path, status_code, is_active) on public.website_redirects to anon;
create policy public_active_redirects on public.website_redirects for select to anon, authenticated using (is_active);

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('website-media','website-media',true,5242880,array['image/svg+xml','image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;
create policy cms_media_read on storage.objects for select to authenticated
  using (bucket_id = 'website-media' and (select private.website_cms_role()) is not null);
create policy cms_media_insert on storage.objects for insert to authenticated
  with check (bucket_id = 'website-media' and (storage.foldername(name))[1] = 'clients' and (select private.website_cms_role()) in ('owner','editor'));
create policy cms_media_update on storage.objects for update to authenticated
  using (bucket_id = 'website-media' and (storage.foldername(name))[1] = 'clients' and (select private.website_cms_role()) in ('owner','editor'))
  with check (bucket_id = 'website-media' and (storage.foldername(name))[1] = 'clients' and (select private.website_cms_role()) in ('owner','editor'));
create policy cms_media_delete on storage.objects for delete to authenticated
  using (bucket_id = 'website-media' and (storage.foldername(name))[1] = 'clients' and (select private.website_cms_role()) in ('owner','editor'));
