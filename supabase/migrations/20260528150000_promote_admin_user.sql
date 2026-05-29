-- Promote admin@ymnak.sa to the admin role and ensure future signups
-- with that email are auto-assigned the admin role instead of the default customer.

-- 1) Update existing user (if present): clear non-admin roles, ensure admin row.
do $$
declare
  admin_uid uuid;
begin
  select id into admin_uid from auth.users where email = 'admin@ymnak.sa';
  if admin_uid is not null then
    delete from public.user_roles
      where user_id = admin_uid and role <> 'admin';
    insert into public.user_roles (user_id, role)
      values (admin_uid, 'admin')
      on conflict (user_id, role) do nothing;
  end if;
end $$;

-- 2) Future-proof the signup trigger so admin@ymnak.sa always gets the admin role.
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
