-- Run in the Supabase SQL Editor as the database owner.
-- Deletes only unchanged rows from the former sample catalog. Preserves accounts,
-- the BRACU tenant and private records. Foreign keys abort the entire transaction
-- if student records still use these catalog rows. No CASCADE or TRUNCATE.
begin;
set local lock_timeout = '5s';
set local statement_timeout = '30s';

lock table public.programs, public.semesters, public.courses, public.sections,
  public.prerequisite_groups, public.prerequisite_items, public.registration_plans
  in share row exclusive mode;

create temporary table friday_sample_catalog (
  position integer, table_name text, id uuid, expected jsonb, removed boolean default false
) on commit drop;

insert into friday_sample_catalog(position,table_name,id,expected) values
(1,'prerequisite_items','00000000-0000-4000-8000-000000000082','{"group_id":"00000000-0000-4000-8000-000000000081","required_course_id":"00000000-0000-4000-8000-000000000001"}'),
(2,'prerequisite_groups','00000000-0000-4000-8000-000000000081','{"course_id":"00000000-0000-4000-8000-000000000004"}'),
(3,'sections','00000000-0000-4000-8000-000000000011','{"course_id":"00000000-0000-4000-8000-000000000001","semester_id":"44444444-4444-4444-8444-444444444444","section_number":"1","faculty":"ABC","room":"UB201","capacity":30,"seats_available":12,"meetings":[{"day_of_week":0,"start_minute":600,"end_minute":680}]}'),
(3,'sections','00000000-0000-4000-8000-000000000012','{"course_id":"00000000-0000-4000-8000-000000000002","semester_id":"44444444-4444-4444-8444-444444444444","section_number":"1","faculty":"XYZ","room":"UB202","capacity":30,"seats_available":12,"meetings":[{"day_of_week":1,"start_minute":700,"end_minute":780}]}'),
(3,'sections','00000000-0000-4000-8000-000000000013','{"course_id":"00000000-0000-4000-8000-000000000003","semester_id":"44444444-4444-4444-8444-444444444444","section_number":"1","faculty":"DEF","room":"UB203","capacity":30,"seats_available":12,"meetings":[{"day_of_week":0,"start_minute":800,"end_minute":880}]}'),
(4,'courses','00000000-0000-4000-8000-000000000001','{"code":"CSE220","title":"Data structures","credits":3,"is_active":true}'),
(4,'courses','00000000-0000-4000-8000-000000000002','{"code":"MAT215","title":"Mathematics III","credits":3,"is_active":true}'),
(4,'courses','00000000-0000-4000-8000-000000000003','{"code":"ENG102","title":"Composition","credits":3,"is_active":true}'),
(4,'courses','00000000-0000-4000-8000-000000000004','{"code":"CSE221","title":"Algorithms","credits":3,"is_active":true}'),
(5,'semesters','44444444-4444-4444-8444-444444444444','{"name":"Autumn 2026","start_date":"2026-09-01","end_date":"2026-12-31"}'),
(5,'semesters','44444444-4444-4444-8444-444444444445','{"name":"Spring 2027","start_date":"2027-01-01","end_date":"2027-04-30"}'),
(6,'programs','33333333-3333-4333-8333-333333333333','{"code":"CSE-SAMPLE","name":"Computer science (sample requirements)","credits_required":124}');

do $cleanup$
declare
  target record;
  unchanged boolean;
  affected integer;
  tenant constant uuid := '11111111-1111-4111-8111-111111111111';
begin
  for target in select * from friday_sample_catalog loop
    execute format('select to_jsonb(r) @> $1 from public.%I r where id=$2 and university_id=$3', target.table_name)
      into unchanged using target.expected,target.id,tenant;
    if unchanged is false then
      raise exception 'Sample cleanup stopped: %.% was modified; inspect it before deleting.',target.table_name,target.id;
    end if;
  end loop;

  -- A seeded prerequisite group cascades to its items; refuse any non-sample child.
  if exists(select 1 from public.prerequisite_items
    where group_id='00000000-0000-4000-8000-000000000081' and university_id=tenant
      and id<>'00000000-0000-4000-8000-000000000082') then
    raise exception 'Sample cleanup stopped: the sample prerequisite group has non-sample items.';
  end if;

  -- Plan items store IDs inside JSON rather than foreign-key columns.
  if exists(select 1 from public.registration_plans p
    cross join lateral jsonb_array_elements(p.items) item
    join friday_sample_catalog sample on
      (sample.table_name='courses' and item->>'course_id'=sample.id::text) or
      (sample.table_name='sections' and item->>'section_id'=sample.id::text)
    where p.university_id=tenant) then
    raise exception 'Sample cleanup stopped: a saved student plan uses sample courses or sections.';
  end if;

  for target in select * from friday_sample_catalog order by position,id loop
    execute format('delete from public.%I where id=$1 and university_id=$2',target.table_name)
      using target.id,tenant;
    get diagnostics affected = row_count;
    update friday_sample_catalog set removed=(affected=1) where id=target.id and table_name=target.table_name;
  end loop;
end $cleanup$;

select table_name,count(*) filter(where removed)::integer as removed_sample_rows
from friday_sample_catalog group by table_name order by table_name;
commit;
