-- Google does not provide the university's separate student ID. Collect it at onboarding.
alter table public.student_profiles alter column student_id drop not null;
alter table public.student_profiles add constraint onboarded_student_id_required
  check(onboarding_completed_at is null or student_id is not null);

-- Provider identities are written by Supabase Auth, unlike editable user metadata.
-- Supabase preserves Google's verified hosted-domain claim under custom_claims.hd.
create or replace function private.tenant_id() returns uuid language sql stable security definer set search_path='' as $$
  select u.university_id from public.users u join auth.users a on a.id=u.id
  where u.id=auth.uid() and u.status='active' and a.email_confirmed_at is not null
    and (u.role in ('admin','super_admin') or (
      lower(split_part(a.email,'@',2))='g.bracu.ac.bd' and exists(
        select 1 from auth.identities i where i.user_id=a.id and i.provider='google'
          and lower(i.identity_data->>'email')=lower(a.email)
          and i.identity_data->'email_verified'='true'::jsonb
          and lower(i.identity_data #>> '{custom_claims,hd}')='g.bracu.ac.bd'
      )
    ))
$$;
revoke all on function private.tenant_id() from public;
grant execute on function private.tenant_id() to authenticated;
