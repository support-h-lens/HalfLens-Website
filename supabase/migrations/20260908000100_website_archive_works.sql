-- Independent from homepage projects: adding an archive item never adds a featured project.
create table public.website_archive_works (
  id uuid primary key default gen_random_uuid(),
  work_type text not null check (work_type in ('creative-films','photography','motion-graphics','media-coverage','cinematic-ads')),
  title text not null check (length(btrim(title)) between 1 and 200),
  client text not null check (length(btrim(client)) between 1 and 200),
  project_year integer not null check (project_year between 1900 and 2100),
  link_url text not null check (length(link_url) <= 2048 and link_url ~* '^https?://[^/@[:space:]]+([/?#][^[:space:]]*)?$' and link_url !~ E'[\\\\]'),
  sort_order integer not null default 0,
  status text not null default 'draft' check (status in ('draft','published','archived')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  published_at timestamptz
);
alter table public.website_archive_works enable row level security;
revoke all on public.website_archive_works from anon, authenticated;
grant select on public.website_archive_works to anon;
grant select, insert, update, delete on public.website_archive_works to authenticated;
create policy public_published on public.website_archive_works for select to anon, authenticated using (status = 'published');
create policy cms_read on public.website_archive_works for select to authenticated using ((select private.website_cms_role()) is not null);
create policy cms_insert on public.website_archive_works for insert to authenticated with check ((select private.website_cms_role()) in ('owner','editor'));
create policy cms_update on public.website_archive_works for update to authenticated
  using ((select private.website_cms_role()) in ('owner','editor'))
  with check ((select private.website_cms_role()) in ('owner','editor'));
create policy cms_delete on public.website_archive_works for delete to authenticated using ((select private.website_cms_role()) = 'owner');
create trigger stamp_content before insert or update on public.website_archive_works
  for each row execute function private.website_stamp_content();
create index website_archive_works_public_order on public.website_archive_works (status, sort_order, created_at);
comment on table public.website_archive_works is 'Five-field All Works directory, independent of website_projects (homepage featured work).';
