-- ===== SITE SETTINGS (singleton, publicly readable) =====
-- Branding + operational/dispatch config that any visitor or signed-in user may need.
create table public.site_settings (
  id text primary key default 'global' check (id = 'global'),
  site_names jsonb not null default jsonb_build_object('ar', '', 'en', '', 'tr', ''),
  logo_url text,
  favicon_url text,
  colors jsonb not null default jsonb_build_object('primary', null, 'primaryForeground', null),
  default_language text not null default 'ar' check (default_language in ('ar','en','tr')),
  currency text not null default 'SAR' check (currency in ('SAR','USD','TRY','EUR')),
  timezone text not null default 'Asia/Riyadh',
  max_distance int not null default 25 check (max_distance between 1 and 500),
  commission_rate numeric(5,2) not null default 10 check (commission_rate between 0 and 100),
  min_request_amount numeric(12,2) not null default 50 check (min_request_amount >= 0),
  auto_assign boolean not null default false,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
grant select on public.site_settings to anon, authenticated;
grant all on public.site_settings to service_role;
alter table public.site_settings enable row level security;

create policy "site_settings public read"
  on public.site_settings for select
  to anon, authenticated
  using (true);

create policy "site_settings admin write"
  on public.site_settings for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

insert into public.site_settings (id) values ('global');

-- ===== SITE SETTINGS PRIVATE (singleton, admin-only) =====
-- SMTP credentials + access/security policy + internal notification flags.
create table public.site_settings_private (
  id text primary key default 'global' check (id = 'global'),
  smtp jsonb not null default jsonb_build_object(
    'host', 'smtp.gmail.com',
    'port', 465,
    'secure', true,
    'user', '',
    'password', '',
    'fromEmail', '',
    'fromName', 'Ymnak'
  ),
  notifications jsonb not null default jsonb_build_object(
    'emailNotifications', true,
    'pushNotifications', true,
    'smsNotifications', false
  ),
  security jsonb not null default jsonb_build_object(
    'require2fa', false,
    'sessionTimeout', 60
  ),
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);
grant all on public.site_settings_private to service_role;
alter table public.site_settings_private enable row level security;

create policy "private settings admin read"
  on public.site_settings_private for select
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

create policy "private settings admin write"
  on public.site_settings_private for all
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

insert into public.site_settings_private (id) values ('global');

-- ===== BRANDING STORAGE BUCKET (public read, admin write) =====
insert into storage.buckets (id, name, public)
values ('branding', 'branding', true)
on conflict (id) do update set public = true;

create policy "branding bucket public read"
  on storage.objects for select
  to anon, authenticated
  using (bucket_id = 'branding');

create policy "branding bucket admin insert"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'branding' and public.has_role(auth.uid(), 'admin'));

create policy "branding bucket admin update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'branding' and public.has_role(auth.uid(), 'admin'));

create policy "branding bucket admin delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'branding' and public.has_role(auth.uid(), 'admin'));
