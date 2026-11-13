-- Self-reported Connect imports stay private and never write to the shared catalog.
create function private.valid_connect_courses(courses jsonb, semester integer)
returns boolean language plpgsql immutable set search_path='' as $$
declare row jsonb; schedule jsonb; meeting jsonb; key text; value text;
begin
  if jsonb_typeof(courses) is distinct from 'array' or jsonb_array_length(courses) not between 1 and 100
    or octet_length(courses::text)>262144 then return false; end if;
  if (select count(distinct item->>'sectionId') from jsonb_array_elements(courses) item) <> jsonb_array_length(courses) then return false; end if;
  for row in select * from jsonb_array_elements(courses) loop
    if jsonb_typeof(row) is distinct from 'object'
      or not (row ?& array['courseId','courseCode','courseCredit','courseType','sectionId','sectionName','semesterSessionId','sectionSchedule'])
      or row - array['courseId','courseCode','courseCredit','courseType','sectionId','sectionName','parentSectionId','faculties','roomName','capacity','consumedSeat','semesterSessionId','sectionSchedule'] <> '{}'::jsonb
      then return false; end if;
    foreach key in array array['courseId','sectionId','semesterSessionId'] loop
      if jsonb_typeof(row->key) is distinct from 'number' or (row->>key) !~ '^[0-9]+$'
        or (row->>key)::bigint not between 1 and 2147483647 then return false; end if;
    end loop;
    if (row->>'semesterSessionId')::integer <> semester then return false; end if;
    foreach key in array array['courseCode','sectionName'] loop
      if jsonb_typeof(row->key) is distinct from 'string' or length(btrim(row->>key)) not between 1 and 40 then return false; end if;
    end loop;
    if jsonb_typeof(row->'courseCredit') is distinct from 'number' or (row->>'courseCredit')::numeric not between 0 and 12
      or jsonb_typeof(row->'courseType') is distinct from 'string'
      or row->>'courseType' not in ('THEORY','LAB') then return false; end if;
    foreach key in array array['faculties','roomName'] loop
      if row->key is not null and row->key <> 'null'::jsonb then
        if jsonb_typeof(row->key)<>'string' or length(row->>key)>200 then return false; end if;
      end if;
    end loop;
    foreach key in array array['parentSectionId','capacity','consumedSeat'] loop
      if row->key is not null and row->key <> 'null'::jsonb then
        if jsonb_typeof(row->key)<>'number' or (row->>key) !~ '^[0-9]+$' then return false; end if;
        if key='parentSectionId' then
          if (row->>key)::bigint not between 1 and 2147483647 or row->>key=row->>'sectionId' then return false; end if;
        elsif (row->>key)::bigint not between 0 and 10000 then return false; end if;
      end if;
    end loop;
    schedule := row->'sectionSchedule';
    if jsonb_typeof(schedule) is distinct from 'object'
      or schedule - array['classStartDate','classEndDate','classSchedules','midExamDate','midExamStartTime','midExamEndTime','finalExamDate','finalExamStartTime','finalExamEndTime'] <> '{}'::jsonb
      or jsonb_typeof(schedule->'classSchedules') is distinct from 'array'
      or jsonb_array_length(schedule->'classSchedules')>14 then return false; end if;
    foreach key in array array['classStartDate','classEndDate','midExamDate','finalExamDate'] loop
      value := schedule->>key;
      if value is not null then
        if jsonb_typeof(schedule->key)<>'string' or value !~ '^\d{4}-\d{2}-\d{2}$' or (value::date)::text <> value then return false; end if;
      end if;
    end loop;
    foreach key in array array['midExamStartTime','midExamEndTime','finalExamStartTime','finalExamEndTime'] loop
      value := schedule->>key;
      if value is not null and (jsonb_typeof(schedule->key)<>'string' or value !~ '^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$') then return false; end if;
    end loop;
    if schedule->>'classEndDate'<schedule->>'classStartDate'
      or schedule->>'midExamEndTime'<=schedule->>'midExamStartTime'
      or schedule->>'finalExamEndTime'<=schedule->>'finalExamStartTime' then return false; end if;
    for meeting in select * from jsonb_array_elements(schedule->'classSchedules') loop
      if jsonb_typeof(meeting) is distinct from 'object' or not (meeting ?& array['day','startTime','endTime'])
        or meeting - array['day','startTime','endTime'] <> '{}'::jsonb
        or jsonb_typeof(meeting->'day') is distinct from 'string'
        or meeting->>'day' not in ('SUNDAY','MONDAY','TUESDAY','WEDNESDAY','THURSDAY','FRIDAY','SATURDAY')
        or jsonb_typeof(meeting->'startTime') is distinct from 'string'
        or jsonb_typeof(meeting->'endTime') is distinct from 'string'
        or (meeting->>'startTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$'
        or (meeting->>'endTime') !~ '^([01][0-9]|2[0-3]):[0-5][0-9]:[0-5][0-9]$'
        or meeting->>'endTime'<=meeting->>'startTime' then return false; end if;
    end loop;
  end loop;
  return true;
exception when others then return false;
end $$;

create table public.connect_schedule_imports (
  user_id uuid not null,
  university_id uuid not null,
  semester_session_id integer not null check(semester_session_id>0),
  courses jsonb not null check(private.valid_connect_courses(courses,semester_session_id)),
  imported_at timestamptz not null default now(),
  primary key(user_id,semester_session_id),
  foreign key(user_id,university_id) references public.users(id,university_id) on delete cascade
);
create function private.stamp_connect_import() returns trigger language plpgsql set search_path='' as $$
begin new.imported_at := now(); return new; end $$;
create trigger connect_import_stamp before insert or update on public.connect_schedule_imports
  for each row execute function private.stamp_connect_import();
alter table public.connect_schedule_imports enable row level security;
revoke all on public.connect_schedule_imports from anon,authenticated;
create policy connect_import_owner on public.connect_schedule_imports for all to authenticated
  using(user_id=auth.uid() and university_id=private.tenant_id() and private.app_role()='student')
  with check(user_id=auth.uid() and university_id=private.tenant_id() and private.app_role()='student');
grant select,insert,update,delete on public.connect_schedule_imports to authenticated;
revoke all on function private.valid_connect_courses(jsonb,integer) from public;
grant execute on function private.valid_connect_courses(jsonb,integer) to authenticated;
revoke all on function private.stamp_connect_import() from public;
