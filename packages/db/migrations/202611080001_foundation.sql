-- Supabase Auth owns identities, passwords, and sessions.
create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to authenticated;

create table public.universities (
  id uuid primary key default gen_random_uuid(), name text not null,
  code text not null unique, student_domains text[] not null,
  timezone text not null default 'Asia/Dhaka', created_at timestamptz not null default now()
);
create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  university_id uuid not null references public.universities(id),
  full_name text not null check (length(full_name) between 2 and 100), email text not null,
  role text not null default 'student' check (role in ('student','admin','super_admin')),
  status text not null default 'active' check (status in ('active','deactivated')),
  created_at timestamptz not null default now(), unique(id, university_id), unique(university_id, email)
);
create function private.tenant_id() returns uuid language sql stable security definer set search_path = '' as $$
  select u.university_id from public.users u join auth.users a on a.id=u.id
  where u.id=auth.uid() and u.status='active' and a.email_confirmed_at is not null
$$;
create function private.app_role() returns text language sql stable security definer set search_path = '' as $$
  select role from public.users where id=auth.uid() and university_id=private.tenant_id()
$$;
create function private.is_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select coalesce(private.app_role() in ('admin','super_admin'), false)
$$;
revoke all on function private.tenant_id(), private.app_role(), private.is_admin() from public;
grant execute on function private.tenant_id(), private.app_role(), private.is_admin() to authenticated;

create table public.programs (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities(id),
  code text not null, name text not null, credits_required numeric not null check(credits_required>0 and credits_required<=300),
  unique(id,university_id), unique(university_id,code)
);
create table public.semesters (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities(id),
  name text not null, start_date date not null, end_date date not null,
  check(end_date>start_date), unique(id,university_id), unique(university_id,name)
);
create table public.courses (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities(id),
  code text not null check(length(code) between 2 and 20), title text not null check(length(title) between 1 and 200),
  credits numeric not null check(credits between 0.5 and 12), is_active boolean not null default true,
  unique(id,university_id), unique(university_id,code)
);
create table public.prerequisite_groups (
  id uuid primary key default gen_random_uuid(), university_id uuid not null, course_id uuid not null,
  foreign key(course_id,university_id) references public.courses(id,university_id), unique(id,university_id)
);
create table public.prerequisite_items (
  id uuid primary key default gen_random_uuid(), university_id uuid not null, group_id uuid not null, required_course_id uuid not null,
  foreign key(group_id,university_id) references public.prerequisite_groups(id,university_id) on delete cascade,
  foreign key(required_course_id,university_id) references public.courses(id,university_id), unique(group_id,required_course_id)
);
create function private.valid_meetings(value jsonb) returns boolean language plpgsql immutable set search_path='' as $$
declare item jsonb;
begin
  if jsonb_typeof(value)<>'array' or jsonb_array_length(value)>14 then return false; end if;
  for item in select * from jsonb_array_elements(value) loop
    if not(item ?& array['day_of_week','start_minute','end_minute']) then return false; end if;
    if jsonb_typeof(item->'day_of_week')<>'number' or jsonb_typeof(item->'start_minute')<>'number' or jsonb_typeof(item->'end_minute')<>'number' then return false; end if;
    if (item->>'day_of_week')::int not between 0 and 6 or (item->>'start_minute')::int not between 0 and 1439 or (item->>'end_minute')::int not between 1 and 1440 or (item->>'end_minute')::int <= (item->>'start_minute')::int then return false; end if;
  end loop;
  if exists(select 1 from jsonb_array_elements(value) with ordinality a(item,n) cross join jsonb_array_elements(value) with ordinality b(item,n)
    where a.n<b.n and a.item->>'day_of_week'=b.item->>'day_of_week'
      and (a.item->>'start_minute')::int<(b.item->>'end_minute')::int and (b.item->>'start_minute')::int<(a.item->>'end_minute')::int) then return false; end if;
  return true;
exception when others then return false;
end $$;
create table public.sections (
  id uuid primary key default gen_random_uuid(), university_id uuid not null, course_id uuid not null, semester_id uuid not null,
  section_number text not null, faculty text not null default 'TBA', room text not null default 'TBA',
  capacity integer not null check(capacity between 1 and 500), seats_available integer not null check(seats_available>=0 and seats_available<=capacity),
  meetings jsonb not null default '[]' check(private.valid_meetings(meetings)), seats_updated_at timestamptz not null default now(),
  foreign key(course_id,university_id) references public.courses(id,university_id),
  foreign key(semester_id,university_id) references public.semesters(id,university_id),
  unique(id,university_id), unique(university_id,course_id,semester_id,section_number)
);
create table public.student_profiles (
  user_id uuid primary key, university_id uuid not null, student_id text not null check(student_id ~ '^\d{8}$'),
  program_id uuid, semester_id uuid, onboarding_completed_at timestamptz,
  foreign key(user_id,university_id) references public.users(id,university_id) on delete cascade,
  foreign key(program_id,university_id) references public.programs(id,university_id),
  foreign key(semester_id,university_id) references public.semesters(id,university_id),
  check(onboarding_completed_at is null or (program_id is not null and semester_id is not null)),
  unique(university_id,student_id)
);
create table public.completed_courses (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, university_id uuid not null, course_id uuid not null,
  status text not null default 'completed' check(status in ('completed','failed','withdrawn')), grade text check(length(grade)<=8),
  foreign key(user_id,university_id) references public.users(id,university_id) on delete cascade,
  foreign key(course_id,university_id) references public.courses(id,university_id), unique(user_id,course_id)
);
create table public.enrolled_sections (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, university_id uuid not null, section_id uuid not null,
  status text not null default 'enrolled' check(status in ('enrolled','withdrawn')),
  foreign key(user_id,university_id) references public.users(id,university_id) on delete cascade,
  foreign key(section_id,university_id) references public.sections(id,university_id), unique(user_id,section_id), unique(id,user_id,university_id)
);
create table public.attendance_records (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, university_id uuid not null, enrollment_id uuid not null,
  class_date date not null check(class_date<=current_date), status text not null check(status in ('attended','missed','cancelled')),
  foreign key(enrollment_id,user_id,university_id) references public.enrolled_sections(id,user_id,university_id) on delete cascade,
  unique(enrollment_id,class_date)
);
create table public.notices (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities(id),
  title text not null check(length(title) between 1 and 200), body text not null check(length(body) between 1 and 20000),
  category text not null check(category in ('academic','registration','exam','tuition','administrative','holiday','emergency')),
  importance text not null default 'normal' check(importance in ('normal','high','emergency')),
  status text not null default 'draft' check(status in ('draft','review','published','archived')),
  published_at timestamptz, created_at timestamptz not null default now(), unique(id,university_id)
);
create table public.notice_reads (
  id uuid primary key default gen_random_uuid(), user_id uuid not null, university_id uuid not null, notice_id uuid not null,
  foreign key(user_id,university_id) references public.users(id,university_id) on delete cascade,
  foreign key(notice_id,university_id) references public.notices(id,university_id) on delete cascade, unique(user_id,notice_id)
);
create table public.deadlines (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities(id),
  owner_user_id uuid, scope text not null check(scope in ('personal','university')),
  title text not null check(length(title) between 1 and 200), description text not null default '' check(length(description)<=2000),
  due_at timestamptz not null, priority text not null default 'medium' check(priority in ('low','medium','high')),
  status text not null default 'open' check(status in ('open','done')), notice_id uuid,
  foreign key(owner_user_id,university_id) references public.users(id,university_id) on delete cascade,
  foreign key(notice_id,university_id) references public.notices(id,university_id),
  check((scope='personal' and owner_user_id is not null) or (scope='university' and owner_user_id is null))
);
create table public.registration_plans (
  id uuid primary key default gen_random_uuid(), university_id uuid not null, user_id uuid not null, semester_id uuid not null,
  name text not null check(length(name) between 1 and 200), kind text not null check(kind in ('semester','registration')),
  items jsonb not null check(jsonb_typeof(items)='array' and jsonb_array_length(items) between 1 and 12),
  foreign key(user_id,university_id) references public.users(id,university_id) on delete cascade,
  foreign key(semester_id,university_id) references public.semesters(id,university_id)
);
create table public.notifications (
  id uuid primary key default gen_random_uuid(), university_id uuid not null, user_id uuid not null,
  title text not null, body text not null, link text not null check(link like '/app%'), read_at timestamptz,
  created_at timestamptz not null default now(), dedupe_key text unique,
  foreign key(user_id,university_id) references public.users(id,university_id) on delete cascade
);
create table public.notification_preferences (
  user_id uuid primary key, university_id uuid not null, email_enabled boolean not null default true,
  in_app_enabled boolean not null default true, reduce_effects boolean not null default false,
  foreign key(user_id,university_id) references public.users(id,university_id) on delete cascade
);
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(), university_id uuid not null references public.universities(id), actor_id uuid,
  action text not null, entity_type text not null, entity_id uuid, changes jsonb,
  created_at timestamptz not null default now()
);

create function private.bootstrap_user() returns trigger language plpgsql security definer set search_path='' as $$
declare tenant uuid; account_role text := 'student';
begin
  if new.raw_app_meta_data->>'role' in ('admin','super_admin') then
    account_role := new.raw_app_meta_data->>'role';
    select id into tenant from public.universities where id=(new.raw_app_meta_data->>'university_id')::uuid;
  else
    select id into tenant from public.universities where lower(split_part(new.email,'@',2))=any(student_domains);
  end if;
  if tenant is null then raise exception 'University email is not supported'; end if;
  insert into public.users(id,university_id,full_name,email,role) values(new.id,tenant,left(coalesce(nullif(new.raw_user_meta_data->>'full_name',''),'FRIDAY user'),100),lower(new.email),account_role);
  if account_role='student' then
    insert into public.student_profiles(user_id,university_id,student_id) values(new.id,tenant,new.raw_user_meta_data->>'student_id');
  end if;
  insert into public.notification_preferences(user_id,university_id) values(new.id,tenant);
  return new;
end $$;
create trigger friday_auth_user_created after insert on auth.users for each row execute function private.bootstrap_user();

-- Audit catalog and administrative mutations in the same database transaction.
create function private.audit_change() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if auth.uid() is not null then
    insert into public.audit_logs(university_id,actor_id,action,entity_type,entity_id,changes)
    values(new.university_id,auth.uid(),lower(tg_op),tg_table_name,new.id,jsonb_build_object('after',to_jsonb(new)));
  end if;
  return new;
end $$;

do $$ declare tab text; begin
  foreach tab in array array['universities','users','programs','semesters','courses','prerequisite_groups','prerequisite_items','sections','student_profiles','completed_courses','enrolled_sections','attendance_records','notices','notice_reads','deadlines','registration_plans','notifications','notification_preferences','audit_logs'] loop
    execute format('alter table public.%I enable row level security',tab);
    execute format('revoke all on public.%I from anon, authenticated',tab);
    execute format('grant select on public.%I to authenticated',tab);
  end loop;
  foreach tab in array array['programs','semesters','courses','prerequisite_groups','prerequisite_items','sections'] loop
    execute format('create policy catalog_read on public.%I for select to authenticated using(university_id=private.tenant_id())',tab);
    execute format('create policy catalog_write on public.%I for all to authenticated using(university_id=private.tenant_id() and private.is_admin()) with check(university_id=private.tenant_id() and private.is_admin())',tab);
    execute format('grant insert,update on public.%I to authenticated',tab);
    execute format('create trigger audit_change after insert or update on public.%I for each row execute function private.audit_change()',tab);
  end loop;
  foreach tab in array array['student_profiles','completed_courses','enrolled_sections','attendance_records','notification_preferences'] loop
    execute format('create policy own_records on public.%I for all to authenticated using(user_id=auth.uid() and university_id=private.tenant_id() and private.app_role()=''student'') with check(user_id=auth.uid() and university_id=private.tenant_id() and private.app_role()=''student'')',tab);
    execute format('grant insert,update,delete on public.%I to authenticated',tab);
  end loop;
end $$;
create policy university_read on public.universities for select to authenticated using(id=private.tenant_id());
create policy users_read on public.users for select to authenticated using(university_id=private.tenant_id() and (id=auth.uid() or private.is_admin()));
create policy users_name on public.users for update to authenticated using(id=auth.uid() and university_id=private.tenant_id()) with check(id=auth.uid() and university_id=private.tenant_id());
grant update(full_name) on public.users to authenticated;
create policy notices_read on public.notices for select to authenticated using(university_id=private.tenant_id() and (status='published' or private.is_admin()));
create policy notices_write on public.notices for all to authenticated using(university_id=private.tenant_id() and private.is_admin()) with check(university_id=private.tenant_id() and private.is_admin());
grant insert,update on public.notices to authenticated;
create trigger notices_audit after insert or update on public.notices for each row execute function private.audit_change();
create policy read_states on public.notice_reads for all to authenticated using(user_id=auth.uid() and university_id=private.tenant_id()) with check(user_id=auth.uid() and university_id=private.tenant_id() and exists(select 1 from public.notices n where n.id=notice_id and n.status='published'));
grant insert,delete on public.notice_reads to authenticated;
create policy deadlines_read on public.deadlines for select to authenticated using(university_id=private.tenant_id() and (scope='university' or owner_user_id=auth.uid()));
create policy personal_deadline_write on public.deadlines for all to authenticated using(university_id=private.tenant_id() and scope='personal' and owner_user_id=auth.uid() and private.app_role()='student') with check(university_id=private.tenant_id() and scope='personal' and owner_user_id=auth.uid() and private.app_role()='student');
create policy university_deadline_write on public.deadlines for all to authenticated using(university_id=private.tenant_id() and scope='university' and private.is_admin()) with check(university_id=private.tenant_id() and scope='university' and private.is_admin());
grant insert,update,delete on public.deadlines to authenticated;
create trigger deadlines_audit after insert or update on public.deadlines for each row when (new.scope='university') execute function private.audit_change();
create policy plans_read on public.registration_plans for select to authenticated using(user_id=auth.uid() and university_id=private.tenant_id());
create policy plans_delete on public.registration_plans for delete to authenticated using(user_id=auth.uid() and university_id=private.tenant_id());
grant delete on public.registration_plans to authenticated;
create policy notifications_read on public.notifications for select to authenticated using(user_id=auth.uid() and university_id=private.tenant_id());
create policy notifications_update on public.notifications for update to authenticated using(user_id=auth.uid() and university_id=private.tenant_id()) with check(user_id=auth.uid() and university_id=private.tenant_id());
grant update(read_at) on public.notifications to authenticated;
create policy audit_read on public.audit_logs for select to authenticated using(university_id=private.tenant_id() and private.is_admin());

create function public.manage_user(target_id uuid, new_status text default null, new_role text default null) returns void language plpgsql security definer set search_path='' as $$
declare target public.users;
begin
  if not private.is_admin() or target_id=auth.uid() then raise exception 'Not permitted'; end if;
  select * into target from public.users where id=target_id and university_id=private.tenant_id();
  if not found then raise exception 'Not permitted'; end if;
  if new_role is not null and private.app_role()<>'super_admin' then raise exception 'Not permitted'; end if;
  if target.role<>'student' and private.app_role()<>'super_admin' then raise exception 'Not permitted'; end if;
  update public.users set status=coalesce(new_status,status), role=coalesce(new_role,role) where id=target_id;
  insert into public.audit_logs(university_id,actor_id,action,entity_type,entity_id) values(target.university_id,auth.uid(),'manage_user','users',target_id);
end $$;
revoke all on function public.manage_user(uuid,text,text) from public,anon;
grant execute on function public.manage_user(uuid,text,text) to authenticated;

create function public.save_plan(plan_name text, term_id uuid, plan_kind text, course_ids uuid[], section_ids uuid[] default '{}') returns uuid language plpgsql security definer set search_path='' as $$
declare tenant uuid := private.tenant_id(); plan_id uuid; plan_items jsonb;
begin
  if tenant is null or private.app_role()<>'student' then raise exception 'Not permitted'; end if;
  if cardinality(course_ids) not between 1 and 12 or cardinality(course_ids)<>(select count(distinct x) from unnest(course_ids) x) then raise exception 'Invalid course list'; end if;
  if (select count(*) from public.courses where university_id=tenant and id=any(course_ids) and is_active)<>cardinality(course_ids) then raise exception 'Invalid course list'; end if;
  if (select sum(credits) from public.courses where id=any(course_ids))>18 then raise exception 'Credit limit exceeded'; end if;
  if plan_kind='registration' then
    if cardinality(section_ids)<>cardinality(course_ids) or (select count(distinct course_id) from public.sections where id=any(section_ids) and university_id=tenant and semester_id=term_id and course_id=any(course_ids) and seats_available>0 and jsonb_array_length(meetings)>0)<>cardinality(course_ids) then raise exception 'Invalid sections'; end if;
    if exists(select 1 from public.sections a join public.sections b on a.id<b.id cross join lateral jsonb_array_elements(a.meetings) ma cross join lateral jsonb_array_elements(b.meetings) mb where a.id=any(section_ids) and b.id=any(section_ids) and ma->>'day_of_week'=mb->>'day_of_week' and (ma->>'start_minute')::int<(mb->>'end_minute')::int and (mb->>'start_minute')::int<(ma->>'end_minute')::int) then raise exception 'Sections conflict'; end if;
    if exists(select 1 from public.prerequisite_groups g where g.course_id=any(course_ids) and not exists(select 1 from public.prerequisite_items i join public.completed_courses c on c.course_id=i.required_course_id where i.group_id=g.id and c.user_id=auth.uid() and c.status='completed')) then raise exception 'Unmet prerequisites'; end if;
  elsif plan_kind<>'semester' then raise exception 'Invalid plan kind'; end if;
  select jsonb_agg(jsonb_build_object('course_id',c.id,'section_id',s.id)) into plan_items from public.courses c left join public.sections s on s.course_id=c.id and s.id=any(section_ids) and s.university_id=tenant and s.semester_id=term_id where c.id=any(course_ids);
  insert into public.registration_plans(university_id,user_id,semester_id,name,kind,items) values(tenant,auth.uid(),term_id,plan_name,plan_kind,plan_items) returning id into plan_id;
  return plan_id;
end $$;
revoke all on function public.save_plan(text,uuid,text,uuid[],uuid[]) from public,anon;
grant execute on function public.save_plan(text,uuid,text,uuid[],uuid[]) to authenticated;

create index deadlines_tenant_due on public.deadlines(university_id,due_at);
create index notices_tenant_status on public.notices(university_id,status);
create index sections_tenant_term on public.sections(university_id,semester_id);
create index completed_owner on public.completed_courses(user_id);
create index attendance_owner on public.attendance_records(user_id,class_date);
create index audit_tenant_time on public.audit_logs(university_id,created_at desc);
-- Defense against function execution inherited through PUBLIC.
revoke all on function private.bootstrap_user(), private.audit_change() from public,anon,authenticated;
grant execute on function private.valid_meetings(jsonb) to authenticated;
