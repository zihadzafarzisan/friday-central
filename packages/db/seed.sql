-- Sample catalog, not an official BRACU degree audit. Safe to rerun.
insert into public.universities(id,name,code,student_domains,timezone) values('11111111-1111-4111-8111-111111111111','BRAC University','bracu',array['g.bracu.ac.bd'],'Asia/Dhaka') on conflict(id) do nothing;
insert into public.programs(id,university_id,code,name,credits_required) values('33333333-3333-4333-8333-333333333333','11111111-1111-4111-8111-111111111111','CSE-SAMPLE','Computer science (sample requirements)',124) on conflict(id) do nothing;
insert into public.semesters(id,university_id,name,start_date,end_date) values
('44444444-4444-4444-8444-444444444444','11111111-1111-4111-8111-111111111111','Autumn 2026','2026-09-01','2026-12-31'),
('44444444-4444-4444-8444-444444444445','11111111-1111-4111-8111-111111111111','Spring 2027','2027-01-01','2027-04-30') on conflict(id) do nothing;
insert into public.courses(id,university_id,code,title,credits) values
('00000000-0000-4000-8000-000000000001','11111111-1111-4111-8111-111111111111','CSE220','Data structures',3),
('00000000-0000-4000-8000-000000000002','11111111-1111-4111-8111-111111111111','MAT215','Mathematics III',3),
('00000000-0000-4000-8000-000000000003','11111111-1111-4111-8111-111111111111','ENG102','Composition',3),
('00000000-0000-4000-8000-000000000004','11111111-1111-4111-8111-111111111111','CSE221','Algorithms',3) on conflict(id) do nothing;
insert into public.prerequisite_groups(id,university_id,course_id) values('00000000-0000-4000-8000-000000000081','11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000004') on conflict(id) do nothing;
insert into public.prerequisite_items(id,university_id,group_id,required_course_id) values('00000000-0000-4000-8000-000000000082','11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000081','00000000-0000-4000-8000-000000000001') on conflict(id) do nothing;
insert into public.sections(id,university_id,course_id,semester_id,section_number,faculty,room,capacity,seats_available,meetings) values
('00000000-0000-4000-8000-000000000011','11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000001','44444444-4444-4444-8444-444444444444','1','ABC','UB201',30,12,'[{"day_of_week":0,"start_minute":600,"end_minute":680}]'),
('00000000-0000-4000-8000-000000000012','11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000002','44444444-4444-4444-8444-444444444444','1','XYZ','UB202',30,12,'[{"day_of_week":1,"start_minute":700,"end_minute":780}]'),
('00000000-0000-4000-8000-000000000013','11111111-1111-4111-8111-111111111111','00000000-0000-4000-8000-000000000003','44444444-4444-4444-8444-444444444444','1','DEF','UB203',30,12,'[{"day_of_week":0,"start_minute":800,"end_minute":880}]') on conflict(id) do nothing;
