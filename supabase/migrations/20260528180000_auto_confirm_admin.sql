-- Auto-confirm the admin@ymnak.sa email so the admin can sign in immediately
-- without going through the email-confirmation flow. All other users still
-- need to confirm their email normally.

-- 1) Confirm the admin user if they already exist but are unconfirmed.
update auth.users
set email_confirmed_at = coalesce(email_confirmed_at, now())
where email = 'admin@ymnak.sa';

-- 2) Extend handle_new_user so future signups with admin@ymnak.sa are
--    auto-confirmed at signup time. Other emails are left untouched and
--    must confirm via the email link as usual.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  assigned_role public.app_role;
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name',''),
    coalesce(new.raw_user_meta_data->>'phone','')
  );

  if new.email = 'admin@ymnak.sa' then
    assigned_role := 'admin';
    -- Auto-confirm the admin so they can log in without an email link.
    update auth.users
      set email_confirmed_at = coalesce(email_confirmed_at, now())
      where id = new.id;
  else
    assigned_role := coalesce((new.raw_user_meta_data->>'role')::public.app_role, 'customer');
  end if;

  insert into public.user_roles (user_id, role) values (new.id, assigned_role);

  if assigned_role = 'employee' then
    insert into public.employees (user_id) values (new.id);
  end if;

  return new;
end;
$$;
