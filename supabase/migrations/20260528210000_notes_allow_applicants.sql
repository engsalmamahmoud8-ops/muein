-- The notes RLS only allowed the customer and the assigned employee, but the employee
-- request detail page shows the notes input to anyone with an application on the request
-- (isAssigned || data.myApp). Applicants got "new row violates row-level security policy
-- for table request_notes". Align RLS with the UI by also letting employees who have
-- applied participate in the conversation.

drop policy "notes read related" on public.request_notes;
create policy "notes read related" on public.request_notes for select to authenticated using (
  exists(select 1 from public.service_requests r where r.id = request_id and (
    r.customer_id = auth.uid() or
    r.assigned_employee_id in (select id from public.employees where user_id = auth.uid()) or
    public.has_role(auth.uid(),'admin')
  ))
  or exists(
    select 1 from public.request_applications a
    join public.employees e on e.id = a.employee_id
    where a.request_id = request_notes.request_id and e.user_id = auth.uid()
  )
);

drop policy "notes insert related" on public.request_notes;
create policy "notes insert related" on public.request_notes for insert to authenticated with check (
  author_id = auth.uid() and (
    exists(select 1 from public.service_requests r where r.id = request_id and (
      r.customer_id = auth.uid() or
      r.assigned_employee_id in (select id from public.employees where user_id = auth.uid())
    ))
    or exists(
      select 1 from public.request_applications a
      join public.employees e on e.id = a.employee_id
      where a.request_id = request_notes.request_id and e.user_id = auth.uid()
    )
  )
);
