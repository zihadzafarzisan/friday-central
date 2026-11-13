create function private.safe_connect_json(value jsonb, depth integer default 0) returns boolean
language plpgsql immutable set search_path='' as $$
declare pair record; item jsonb;
begin
  if depth>20 or value is null then return false; end if;
  if jsonb_typeof(value)='object' then
    for pair in select * from jsonb_each(value) loop
      if pair.key in ('__proto__','constructor','prototype') then return false; end if;
      if regexp_replace(pair.key,'[^a-zA-Z0-9]','','g') ~* '(token|password|passwd|secret|credential|authorization|cookie|csrf|privatekey|apikey|assertion|signature|codeverifier|codechallenge)'
        or lower(regexp_replace(pair.key,'[^a-zA-Z0-9]','','g')) in ('sessionid','sessionkey','publickey','sid') then
        if pair.value <> '"[redacted]"'::jsonb then return false; end if;
      elsif not private.safe_connect_json(pair.value,depth+1) then return false; end if;
    end loop;
  elsif jsonb_typeof(value)='array' then
    for item in select * from jsonb_array_elements(value) loop
      if not private.safe_connect_json(item,depth+1) then return false; end if;
    end loop;
  elsif jsonb_typeof(value)='string' then
    if value #>> '{}' ~ 'eyJ[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+'
      or value #>> '{}' ~* 'Bearer\s+[A-Za-z0-9._~+/-]+' then return false; end if;
  end if;
  return true;
end $$;
create table public.connect_data_records (
  user_id uuid not null,
  university_id uuid not null,
  endpoint text not null check(octet_length(endpoint) between 5 and 1024 and endpoint like '/api/%'
    and endpoint !~* '(^|/)(auth|oauth|sso|token|login|logout|password|credentials|refresh)(/|\?|$)'
    and endpoint !~* '[?&][^=&]*(token|password|secret|credential|authorization|cookie|csrf|assertion|signature)[^=&]*='
    and endpoint !~* '[?&](sessionid|sessionkey|publickey|sid)='
    and endpoint !~ 'eyJ[A-Za-z0-9_-]+\.'),
  method text not null default 'GET' check(method='GET'),
  data jsonb not null check(octet_length(data::text)<=262144 and private.safe_connect_json(data)),
  captured_at timestamptz not null,
  imported_at timestamptz not null default now(),
  primary key(user_id,endpoint),
  foreign key(user_id,university_id) references public.users(id,university_id) on delete cascade
);
alter table public.connect_data_records enable row level security;
revoke all on public.connect_data_records from anon,authenticated;
grant select,insert,update,delete on public.connect_data_records to authenticated;
create policy connect_data_owner on public.connect_data_records for all to authenticated
  using(user_id=auth.uid() and university_id=private.tenant_id() and private.app_role()='student')
  with check(user_id=auth.uid() and university_id=private.tenant_id() and private.app_role()='student');
create trigger connect_data_stamp before insert or update on public.connect_data_records
  for each row execute function private.stamp_connect_import();
revoke all on function private.safe_connect_json(jsonb,integer) from public;
grant execute on function private.safe_connect_json(jsonb,integer) to authenticated;
