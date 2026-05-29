
-- ===== ENUMS =====
create type public.app_role as enum ('customer', 'employee', 'admin');
create type public.request_status as enum (
  'pending','applications_received','assigned','on_the_way',
  'inspection_started','quotation_provided','customer_approved_quotation',
  'work_in_progress','waiting_customer_response','completed','cancelled','disputed'
);
create type public.application_status as enum ('pending','accepted','rejected','cancelled');
create type public.image_type as enum ('issue_photo','progress_photo','completion_proof','avatar');

-- ===== PROFILES =====
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  address text,
  city text,
  preferred_language text default 'ar',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select, insert, update on public.profiles to authenticated;
grant all on public.profiles to service_role;
alter table public.profiles enable row level security;
create policy "profiles select own" on public.profiles for select to authenticated using (auth.uid() = id);
create policy "profiles update own" on public.profiles for update to authenticated using (auth.uid() = id);
create policy "profiles insert own" on public.profiles for insert to authenticated with check (auth.uid() = id);

-- ===== USER ROLES =====
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role app_role not null,
  created_at timestamptz not null default now(),
  unique(user_id, role)
);
grant select on public.user_roles to authenticated;
grant all on public.user_roles to service_role;
alter table public.user_roles enable row level security;
create policy "user_roles select own" on public.user_roles for select to authenticated using (auth.uid() = user_id);

create or replace function public.has_role(_user_id uuid, _role app_role)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.user_roles where user_id = _user_id and role = _role)
$$;

create or replace function public.get_user_role(_user_id uuid)
returns app_role language sql stable security definer set search_path = public as $$
  select role from public.user_roles where user_id = _user_id
  order by case role when 'admin' then 1 when 'employee' then 2 else 3 end limit 1
$$;

-- ===== SERVICE CATEGORIES =====
create table public.service_categories (
  id uuid primary key default gen_random_uuid(),
  name_ar text not null,
  name_en text not null,
  name_tr text,
  icon text,
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);
grant select on public.service_categories to anon, authenticated;
grant all on public.service_categories to service_role;
alter table public.service_categories enable row level security;
create policy "categories public read" on public.service_categories for select to anon, authenticated using (true);
create policy "categories admin write" on public.service_categories for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- Seed categories
insert into public.service_categories (name_ar, name_en, name_tr, icon) values
  ('سباكة','Plumbing','Tesisat','wrench'),
  ('كهرباء','Electrical','Elektrik','zap'),
  ('تنظيف','Cleaning','Temizlik','sparkles'),
  ('صيانة مكيفات','AC Maintenance','Klima Bakımı','wind'),
  ('دهان','Painting','Boya','paintbrush'),
  ('نجارة','Carpentry','Marangozluk','hammer'),
  ('تركيب أثاث','Furniture Assembly','Mobilya Montajı','sofa'),
  ('صيانة أجهزة','Appliance Repair','Cihaz Tamiri','settings');

-- ===== EMPLOYEES =====
create table public.employees (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users(id) on delete cascade,
  bio text,
  years_experience int,
  city text,
  lat double precision,
  lng double precision,
  is_available boolean not null default false,
  is_verified boolean not null default false,
  avg_rating numeric(3,2) not null default 0,
  total_reviews int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
grant select on public.employees to anon, authenticated;
grant insert, update on public.employees to authenticated;
grant all on public.employees to service_role;
alter table public.employees enable row level security;
create policy "employees public read" on public.employees for select to anon, authenticated using (true);
create policy "employees insert own" on public.employees for insert to authenticated with check (auth.uid() = user_id);
create policy "employees update own" on public.employees for update to authenticated using (auth.uid() = user_id);
create policy "employees admin all" on public.employees for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ===== EMPLOYEE CATEGORIES =====
create table public.employee_categories (
  id uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  category_id uuid not null references public.service_categories(id) on delete cascade,
  unique(employee_id, category_id)
);
grant select on public.employee_categories to anon, authenticated;
grant insert, delete on public.employee_categories to authenticated;
grant all on public.employee_categories to service_role;
alter table public.employee_categories enable row level security;
create policy "emp_cat public read" on public.employee_categories for select to anon, authenticated using (true);
create policy "emp_cat own write" on public.employee_categories for all to authenticated
  using (exists(select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid()))
  with check (exists(select 1 from public.employees e where e.id = employee_id and e.user_id = auth.uid()));

-- ===== SERVICE REQUESTS =====
create table public.service_requests (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  category_id uuid not null references public.service_categories(id),
  assigned_employee_id uuid references public.employees(id),
  title text not null,
  description text not null,
  address text not null,
  city text,
  lat double precision,
  lng double precision,
  status request_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
grant select, insert, update on public.service_requests to authenticated;
grant all on public.service_requests to service_role;
alter table public.service_requests enable row level security;
create policy "req customer read own" on public.service_requests for select to authenticated using (auth.uid() = customer_id);
create policy "req customer insert" on public.service_requests for insert to authenticated with check (auth.uid() = customer_id);
create policy "req customer update own" on public.service_requests for update to authenticated using (auth.uid() = customer_id);
create policy "req employee read open" on public.service_requests for select to authenticated using (
  public.has_role(auth.uid(),'employee') and (
    status in ('pending','applications_received') or
    assigned_employee_id in (select id from public.employees where user_id = auth.uid())
  )
);
create policy "req employee update assigned" on public.service_requests for update to authenticated using (
  assigned_employee_id in (select id from public.employees where user_id = auth.uid())
);
create policy "req admin all" on public.service_requests for all to authenticated using (public.has_role(auth.uid(),'admin')) with check (public.has_role(auth.uid(),'admin'));

-- ===== REQUEST IMAGES =====
create table public.request_images (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  uploaded_by uuid not null references auth.users(id),
  url text not null,
  type image_type not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.request_images to authenticated;
grant all on public.request_images to service_role;
alter table public.request_images enable row level security;
create policy "img read related" on public.request_images for select to authenticated using (
  exists(select 1 from public.service_requests r where r.id = request_id and (
    r.customer_id = auth.uid() or
    r.assigned_employee_id in (select id from public.employees where user_id = auth.uid()) or
    public.has_role(auth.uid(),'admin')
  ))
);
create policy "img insert related" on public.request_images for insert to authenticated with check (
  uploaded_by = auth.uid() and exists(select 1 from public.service_requests r where r.id = request_id and (
    r.customer_id = auth.uid() or
    r.assigned_employee_id in (select id from public.employees where user_id = auth.uid())
  ))
);

-- ===== REQUEST APPLICATIONS =====
create table public.request_applications (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  employee_id uuid not null references public.employees(id) on delete cascade,
  message text,
  estimated_arrival_minutes int,
  estimated_price numeric(10,2),
  status application_status not null default 'pending',
  created_at timestamptz not null default now(),
  unique(request_id, employee_id)
);
grant select, insert, update on public.request_applications to authenticated;
grant all on public.request_applications to service_role;
alter table public.request_applications enable row level security;
create policy "app read by owner" on public.request_applications for select to authenticated using (
  exists(select 1 from public.service_requests r where r.id = request_id and r.customer_id = auth.uid())
  or employee_id in (select id from public.employees where user_id = auth.uid())
  or public.has_role(auth.uid(),'admin')
);
create policy "app insert by employee" on public.request_applications for insert to authenticated with check (
  employee_id in (select id from public.employees where user_id = auth.uid())
);
create policy "app update by owner or employee" on public.request_applications for update to authenticated using (
  exists(select 1 from public.service_requests r where r.id = request_id and r.customer_id = auth.uid())
  or employee_id in (select id from public.employees where user_id = auth.uid())
);

-- ===== REQUEST HISTORY (immutable) =====
create table public.request_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  actor_id uuid references auth.users(id),
  event_type text not null,
  from_status request_status,
  to_status request_status,
  metadata jsonb,
  created_at timestamptz not null default now()
);
grant select, insert on public.request_history to authenticated;
grant all on public.request_history to service_role;
alter table public.request_history enable row level security;
create policy "hist read related" on public.request_history for select to authenticated using (
  exists(select 1 from public.service_requests r where r.id = request_id and (
    r.customer_id = auth.uid() or
    r.assigned_employee_id in (select id from public.employees where user_id = auth.uid()) or
    public.has_role(auth.uid(),'admin')
  ))
);
create policy "hist insert related" on public.request_history for insert to authenticated with check (
  exists(select 1 from public.service_requests r where r.id = request_id and (
    r.customer_id = auth.uid() or
    r.assigned_employee_id in (select id from public.employees where user_id = auth.uid())
  ))
);

-- ===== REQUEST NOTES =====
create table public.request_notes (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references public.service_requests(id) on delete cascade,
  author_id uuid not null references auth.users(id),
  body text not null,
  created_at timestamptz not null default now()
);
grant select, insert on public.request_notes to authenticated;
grant all on public.request_notes to service_role;
alter table public.request_notes enable row level security;
create policy "notes read related" on public.request_notes for select to authenticated using (
  exists(select 1 from public.service_requests r where r.id = request_id and (
    r.customer_id = auth.uid() or
    r.assigned_employee_id in (select id from public.employees where user_id = auth.uid()) or
    public.has_role(auth.uid(),'admin')
  ))
);
create policy "notes insert related" on public.request_notes for insert to authenticated with check (
  author_id = auth.uid() and exists(select 1 from public.service_requests r where r.id = request_id and (
    r.customer_id = auth.uid() or
    r.assigned_employee_id in (select id from public.employees where user_id = auth.uid())
  ))
);

-- ===== REVIEWS =====
create table public.reviews (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.service_requests(id) on delete cascade,
  customer_id uuid not null references auth.users(id),
  employee_id uuid not null references public.employees(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now()
);
grant select, insert on public.reviews to authenticated;
grant select on public.reviews to anon;
grant all on public.reviews to service_role;
alter table public.reviews enable row level security;
create policy "reviews public read" on public.reviews for select to anon, authenticated using (true);
create policy "reviews insert by owner" on public.reviews for insert to authenticated with check (
  customer_id = auth.uid() and exists(
    select 1 from public.service_requests r where r.id = request_id and r.customer_id = auth.uid() and r.status = 'completed'
  )
);

-- ===== NOTIFICATIONS =====
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text not null,
  body text,
  link text,
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
grant select, update on public.notifications to authenticated;
grant all on public.notifications to service_role;
alter table public.notifications enable row level security;
create policy "notif read own" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "notif update own" on public.notifications for update to authenticated using (user_id = auth.uid());

-- ===== TRIGGERS =====
-- Auto profile + default customer role on signup
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name',''), coalesce(new.raw_user_meta_data->>'phone',''));
  insert into public.user_roles (user_id, role)
  values (new.id, coalesce((new.raw_user_meta_data->>'role')::app_role, 'customer'));
  if coalesce(new.raw_user_meta_data->>'role','customer') = 'employee' then
    insert into public.employees (user_id) values (new.id);
  end if;
  return new;
end;
$$;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- Auto append request history on status change
create or replace function public.log_request_status_change()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'INSERT') then
    insert into public.request_history(request_id, actor_id, event_type, to_status)
    values (new.id, new.customer_id, 'request_created', new.status);
  elsif (tg_op = 'UPDATE' and old.status is distinct from new.status) then
    insert into public.request_history(request_id, actor_id, event_type, from_status, to_status)
    values (new.id, auth.uid(), 'status_changed', old.status, new.status);
    if new.status = 'completed' then
      update public.service_requests set completed_at = now() where id = new.id;
    end if;
  end if;
  return new;
end;
$$;
create trigger trg_request_history after insert or update on public.service_requests
  for each row execute function public.log_request_status_change();

-- On application accept: reject siblings + assign request
create or replace function public.handle_application_accept()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if (tg_op = 'UPDATE' and old.status <> 'accepted' and new.status = 'accepted') then
    update public.request_applications
      set status = 'rejected'
      where request_id = new.request_id and id <> new.id and status = 'pending';
    update public.service_requests
      set assigned_employee_id = new.employee_id, status = 'assigned'
      where id = new.request_id;
    insert into public.notifications(user_id, title, body, link)
    select e.user_id, 'تم قبول طلبك', 'تم قبولك لتنفيذ طلب الخدمة', '/employee/requests/' || new.request_id
    from public.employees e where e.id = new.employee_id;
  end if;
  return new;
end;
$$;
create trigger trg_application_accept after update on public.request_applications
  for each row execute function public.handle_application_accept();

-- Notify customer on new application
create or replace function public.notify_new_application()
returns trigger language plpgsql security definer set search_path = public as $$
declare cust_id uuid;
begin
  select customer_id into cust_id from public.service_requests where id = new.request_id;
  insert into public.notifications(user_id, title, body, link)
  values (cust_id, 'عرض جديد على طلبك', 'تقدم مقدم خدمة بعرض جديد', '/customer/requests/' || new.request_id);
  update public.service_requests set status = 'applications_received'
    where id = new.request_id and status = 'pending';
  return new;
end;
$$;
create trigger trg_new_application after insert on public.request_applications
  for each row execute function public.notify_new_application();

-- Recalc avg rating
create or replace function public.recalc_employee_rating()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  update public.employees e set
    avg_rating = coalesce((select avg(rating)::numeric(3,2) from public.reviews where employee_id = e.id),0),
    total_reviews = (select count(*) from public.reviews where employee_id = e.id)
  where e.id = new.employee_id;
  return new;
end;
$$;
create trigger trg_recalc_rating after insert on public.reviews
  for each row execute function public.recalc_employee_rating();

-- ===== STORAGE BUCKETS =====
insert into storage.buckets (id, name, public) values
  ('avatars','avatars',true),
  ('request-images','request-images',true),
  ('completion-proofs','completion-proofs',true)
on conflict (id) do nothing;

create policy "avatars public read" on storage.objects for select using (bucket_id = 'avatars');
create policy "avatars auth upload" on storage.objects for insert to authenticated with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "avatars auth update own" on storage.objects for update to authenticated using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "req-images public read" on storage.objects for select using (bucket_id = 'request-images');
create policy "req-images auth upload" on storage.objects for insert to authenticated with check (bucket_id = 'request-images');

create policy "proofs public read" on storage.objects for select using (bucket_id = 'completion-proofs');
create policy "proofs auth upload" on storage.objects for insert to authenticated with check (bucket_id = 'completion-proofs');

-- Realtime
alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.request_applications;
alter publication supabase_realtime add table public.request_history;
alter publication supabase_realtime add table public.service_requests;
