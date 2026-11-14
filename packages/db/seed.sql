-- Bootstrap only. No demo catalog or personal records are seeded.
insert into public.universities(id,name,code,student_domains,timezone)
values('11111111-1111-4111-8111-111111111111','BRAC University','bracu',array['g.bracu.ac.bd'],'Asia/Dhaka')
on conflict(id) do nothing;
