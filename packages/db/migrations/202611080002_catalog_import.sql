create function public.import_courses(input_rows jsonb) returns void language plpgsql security definer set search_path='' as $$
declare tenant uuid := private.tenant_id();
begin
  if not private.is_admin() or tenant is null then raise exception 'Not permitted'; end if;
  if jsonb_typeof(input_rows)<>'array' or jsonb_array_length(input_rows) not between 1 and 200 then raise exception 'Invalid import size'; end if;
  if exists(select 1 from jsonb_to_recordset(input_rows) as row(code text,title text,credits numeric) where code is null or title is null or credits is null) then raise exception 'Missing fields'; end if;
  insert into public.courses(university_id,code,title,credits)
  select tenant,code,title,credits from jsonb_to_recordset(input_rows) as row(code text,title text,credits numeric)
  on conflict(university_id,code) do update set title=excluded.title,credits=excluded.credits;
end $$;
revoke all on function public.import_courses(jsonb) from public,anon;
grant execute on function public.import_courses(jsonb) to authenticated;
