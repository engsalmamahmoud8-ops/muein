-- Admin-only RPC that returns every provider (employee) row joined with
-- the auth.users email + email_confirmed_at, so admins can see providers
-- who haven't confirmed their account yet and trigger a resend.

create or replace function public.admin_list_providers()
returns table (
  id uuid,
  user_id uuid,
  city text,
  is_verified boolean,
  is_available boolean,
  avg_rating numeric,
  total_reviews int,
  years_experience int,
  created_at timestamptz,
  full_name text,
  phone text,
  email text,
  email_confirmed_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    e.id,
    e.user_id,
    e.city,
    e.is_verified,
    e.is_available,
    e.avg_rating,
    e.total_reviews,
    e.years_experience,
    e.created_at,
    p.full_name,
    p.phone,
    u.email::text,
    u.email_confirmed_at
  from public.employees e
  left join public.profiles p on p.id = e.user_id
  left join auth.users u on u.id = e.user_id
  where public.has_role(auth.uid(), 'admin')
  order by e.created_at desc;
$$;

revoke all on function public.admin_list_providers() from public;
grant execute on function public.admin_list_providers() to authenticated;
