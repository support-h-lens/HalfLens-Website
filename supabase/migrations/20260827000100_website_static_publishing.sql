alter table public.website_projects
  add column if not exists seo_image text,
  add column if not exists intro text,
  add column if not exists challenge text,
  add column if not exists role_details text,
  add column if not exists services text[] not null default '{}',
  add column if not exists deliverables text[] not null default '{}',
  add column if not exists result text,
  add column if not exists transcript text;

update public.website_projects
set slug = case project_code
  when '01' then 'effective-parenting-campaign'
  when '02' then 'saudi-cup-closing-film'
  when '03' then 'leap-coverage'
  when '04' then 'identity-campaign'
  when '05' then 'identity-campaign-chapter-two'
  else slug
end
where slug in ('project-01', 'project-02', 'project-03', 'project-04', 'project-05');

create table if not exists public.website_deployments (
  id uuid primary key default gen_random_uuid(),
  requested_by uuid not null references auth.users(id) on delete restrict,
  status text not null default 'queued' check (status in ('queued', 'building', 'succeeded', 'failed')),
  git_ref text not null default 'main',
  workflow_run_url text,
  error_message text,
  created_at timestamptz not null default now(),
  started_at timestamptz,
  completed_at timestamptz
);

create index if not exists website_deployments_created_at_idx
  on public.website_deployments (created_at desc);

alter table public.website_deployments enable row level security;

revoke all on table public.website_deployments from anon;
revoke insert, update, delete on table public.website_deployments from authenticated;
grant select on table public.website_deployments to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'website_deployments'
      and policyname = 'website cms members can read deployments'
  ) then
    create policy "website cms members can read deployments"
      on public.website_deployments
      for select
      to authenticated
      using (
        exists (
          select 1
          from public.website_cms_members member
          where member.user_id = auth.uid()
            and member.is_active = true
        )
      );
  end if;
end
$$;

comment on table public.website_deployments is
  'Immutable publishing requests and their GitHub Actions/Hostinger deployment status.';
