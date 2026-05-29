-- Fix request detail page: customers must be able to see assigned-employee and applicant names.

-- profiles RLS only allowed reading own profile. Allow reading profiles of anyone who is
-- registered as an employee, since employees are public-facing service providers.
create policy "profiles read employees" on public.profiles for select to authenticated
  using (exists(select 1 from public.employees where user_id = profiles.id));

-- Add a direct FK from employees.user_id to profiles.id so PostgREST can resolve the
-- nested embed `employees -> profiles` on the customer request detail query.
-- profiles.id already references auth.users.id, which is where employees.user_id points,
-- so this is consistent with the existing FK to auth.users.
alter table public.employees
  add constraint employees_user_id_profile_fkey
  foreign key (user_id) references public.profiles(id) on delete cascade;

-- Employees browsing open/nearby requests could see the request row (via `req employee read open`)
-- but the images/history policies only allowed the assigned employee, so the detail page showed
-- "No images" for pending requests. Align both policies with request visibility.
drop policy "img read related" on public.request_images;
create policy "img read related" on public.request_images for select to authenticated using (
  exists(select 1 from public.service_requests r where r.id = request_id and (
    r.customer_id = auth.uid() or
    r.assigned_employee_id in (select id from public.employees where user_id = auth.uid()) or
    (public.has_role(auth.uid(),'employee') and r.status in ('pending','applications_received')) or
    public.has_role(auth.uid(),'admin')
  ))
);

drop policy "hist read related" on public.request_history;
create policy "hist read related" on public.request_history for select to authenticated using (
  exists(select 1 from public.service_requests r where r.id = request_id and (
    r.customer_id = auth.uid() or
    r.assigned_employee_id in (select id from public.employees where user_id = auth.uid()) or
    (public.has_role(auth.uid(),'employee') and r.status in ('pending','applications_received')) or
    public.has_role(auth.uid(),'admin')
  ))
);
