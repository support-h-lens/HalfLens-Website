-- Real PostgreSQL/RLS integration test. ALL fixtures are rolled back.
begin;
insert into auth.users (id) values
 ('f1000000-0000-4000-8000-000000000001'),
 ('f1000000-0000-4000-8000-000000000002'),
 ('f1000000-0000-4000-8000-000000000003');
insert into public.website_cms_members (user_id,cms_role) values
 ('f1000000-0000-4000-8000-000000000001','owner'),
 ('f1000000-0000-4000-8000-000000000002','editor'),
 ('f1000000-0000-4000-8000-000000000003','viewer');
insert into public.website_archive_works (id,work_type,title,client,project_year,link_url)
 values ('f2000000-0000-4000-8000-000000000001','photography','RLS fixture','QA',2026,'https://example.com/qa');
select set_config('test.homepage', (select md5(coalesce(jsonb_agg(p order by id)::text,'')) from public.website_projects p), true);

set local role anon;
do $$ begin
  assert (select count(*) from public.website_archive_works where id = 'f2000000-0000-4000-8000-000000000001') = 0, 'Anonymous visitor read a draft';
  begin
    insert into public.website_archive_works (work_type,title,client,project_year,link_url) values ('photography','Denied','QA',2026,'https://example.com/qa');
    raise exception 'Anonymous insert was allowed';
  exception when insufficient_privilege then null; end;
  begin
    perform * from public.website_cms_members;
    raise exception 'Anonymous membership read was allowed';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000002',true);
set local role authenticated;
do $$ declare affected integer; begin
  update public.website_archive_works set title = 'Editor edit', status = 'published' where id = 'f2000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  assert affected = 1, 'Editor cannot publish';
  assert (select published_at is not null from public.website_archive_works where id = 'f2000000-0000-4000-8000-000000000001'), 'Publication timestamp missing';
  delete from public.website_archive_works where id = 'f2000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  assert affected = 0, 'Editor can delete';
  begin
    update public.website_cms_members set cms_role = 'owner' where user_id = auth.uid();
    raise exception 'Member can escalate their own role';
  exception when insufficient_privilege then null; end;
  begin
    update public.website_archive_works set link_url = 'javascript:alert(1)' where id = 'f2000000-0000-4000-8000-000000000001';
    raise exception 'Unsafe URL accepted';
  exception when check_violation then null; end;
  begin
    update public.website_archive_works set work_type = 'unknown' where id = 'f2000000-0000-4000-8000-000000000001';
    raise exception 'Unknown category accepted';
  exception when check_violation then null; end;
end $$;
reset role;
set local role anon;
do $$ begin
  assert (select count(*) from public.website_archive_works where id = 'f2000000-0000-4000-8000-000000000001') = 1, 'Published record not public';
end $$;
reset role;
update public.website_archive_works set status = 'draft' where id = 'f2000000-0000-4000-8000-000000000001';

select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000003',true);
set local role authenticated;
do $$ declare affected integer; begin
  assert (select count(*) from public.website_archive_works where id = 'f2000000-0000-4000-8000-000000000001') = 1, 'Viewer cannot review drafts';
  update public.website_archive_works set status = 'published' where id = 'f2000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  assert affected = 0, 'Viewer can update';
  begin
    insert into public.website_archive_works (work_type,title,client,project_year,link_url) values ('photography','Denied','QA',2026,'https://example.com/qa');
    raise exception 'Viewer can insert';
  exception when insufficient_privilege then null; end;
end $$;
reset role;

select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000004',true);
set local role authenticated;
do $$ begin
  assert (select count(*) from public.website_archive_works where id = 'f2000000-0000-4000-8000-000000000001') = 0, 'Non-member can read a draft';
  begin
    insert into public.website_archive_works (work_type,title,client,project_year,link_url) values ('photography','Denied','QA',2026,'https://example.com/qa');
    raise exception 'Non-member can insert';
  exception when insufficient_privilege then null; end;
end $$;
reset role;
select set_config('request.jwt.claim.sub','f1000000-0000-4000-8000-000000000001',true);
set local role authenticated;
do $$ declare affected integer; begin
  delete from public.website_archive_works where id = 'f2000000-0000-4000-8000-000000000001';
  get diagnostics affected = row_count;
  assert affected = 1, 'Owner cannot delete';
end $$;
reset role;
do $$ begin
  assert current_setting('test.homepage') = (select md5(coalesce(jsonb_agg(p order by id)::text,'')) from public.website_projects p), 'Archive changes modified homepage';
end $$;
rollback;
select 'PASS: anon/non-member/viewer/editor/owner, no role escalation, URL/category constraints, homepage isolated; all fixtures rolled back' as result;
