-- Keep application email records aligned with the provider identity.
create function private.sync_identity_email() returns trigger language plpgsql security definer set search_path='' as $$
declare account public.users; allowed text[];
begin
  select * into account from public.users where id=new.id;
  if not found then return new; end if;
  select student_domains into allowed from public.universities where id=account.university_id;
  if account.role='student' and not(lower(split_part(new.email,'@',2))=any(allowed)) then raise exception 'University email is not supported'; end if;
  update public.users set email=lower(new.email) where id=new.id;
  return new;
end $$;
create trigger friday_identity_email after update of email on auth.users for each row execute function private.sync_identity_email();
revoke all on function private.sync_identity_email() from public,anon,authenticated;

-- In-app delivery is transactional with publication; email jobs remain separate.
create function private.notify_published_notice() returns trigger language plpgsql security definer set search_path='' as $$
begin
  if new.status='published' and (tg_op='INSERT' or old.status is distinct from 'published') then
    insert into public.notifications(university_id,user_id,title,body,link,dedupe_key)
    select new.university_id,u.id,new.title,left(new.body,500),'/app/notices/'||new.id,'notice:'||new.id||':'||u.id
    from public.users u left join public.notification_preferences p on p.user_id=u.id
    where u.university_id=new.university_id and u.role='student' and u.status='active'
      and (new.importance='emergency' or coalesce(p.in_app_enabled,true))
    on conflict(dedupe_key) do nothing;
  end if;
  return new;
end $$;
create trigger friday_notice_notifications after insert or update on public.notices for each row execute function private.notify_published_notice();
revoke all on function private.notify_published_notice() from public,anon,authenticated;
