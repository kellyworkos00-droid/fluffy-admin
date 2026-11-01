-- Fluffy Africa. Safe to run more than once.
--
-- Visitors can read what is published and record an enquiry tap. Everything else
-- needs a signed-in user listed in admin_users. Public sign-ups are turned off,
-- so an account can only be created from scripts/setup-supabase.mjs.

create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;

create table if not exists public.site_settings (
  id integer primary key default 1 check (id = 1),
  business_name text not null default 'Fluffy Africa',
  city text not null default 'Kisumu',
  whatsapp text not null default '254715026069',
  phone_display text not null default '0715 026 069',
  email text not null default '',
  location text not null default '',
  opening_hours text not null default '',
  tiktok text not null default 'fluffyafrica254',
  instagram text not null default '',
  facebook text not null default '',
  logo_url text,
  logo_path text,
  preview boolean not null default true,
  content jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

insert into public.site_settings (id) values (1) on conflict (id) do nothing;

create table if not exists public.hardware_groups (
  name text primary key,
  sort_order integer not null default 0
);

create table if not exists public.listings (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('stay', 'hardware', 'car')),
  name text not null check (length(trim(name)) > 0),
  detail text not null default '',
  description text not null default '',
  group_name text,
  unit text not null default '',
  price integer check (price is null or price >= 0),
  photos jsonb not null default '[]'::jsonb,
  is_published boolean not null default true,
  is_available boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists listings_kind_order on public.listings (kind, sort_order);

create table if not exists public.enquiry_events (
  id bigint generated always as identity primary key,
  kind text not null check (kind in ('stay', 'hardware', 'car')),
  listing_id uuid references public.listings(id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists enquiry_events_recent on public.enquiry_events (created_at desc);

alter table public.admin_users enable row level security;
alter table public.site_settings enable row level security;
alter table public.hardware_groups enable row level security;
alter table public.listings enable row level security;
alter table public.enquiry_events enable row level security;

revoke all on public.admin_users, public.site_settings, public.hardware_groups, public.listings, public.enquiry_events from anon, authenticated;
grant select on public.site_settings, public.hardware_groups, public.listings to anon;
grant insert (kind, listing_id) on public.enquiry_events to anon;
grant select, insert, update, delete on public.site_settings, public.hardware_groups, public.listings to authenticated;
grant select on public.admin_users to authenticated;
grant select, delete on public.enquiry_events to authenticated;
grant insert (kind, listing_id) on public.enquiry_events to authenticated;

drop policy if exists "admins see themselves" on public.admin_users;
create policy "admins see themselves" on public.admin_users for select to authenticated using (user_id = auth.uid());

drop policy if exists "settings are public" on public.site_settings;
create policy "settings are public" on public.site_settings for select to anon, authenticated using (true);
drop policy if exists "admins update settings" on public.site_settings;
create policy "admins update settings" on public.site_settings for update to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "groups are public" on public.hardware_groups;
create policy "groups are public" on public.hardware_groups for select to anon, authenticated using (true);
drop policy if exists "admins manage groups" on public.hardware_groups;
create policy "admins manage groups" on public.hardware_groups for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "published listings are public" on public.listings;
create policy "published listings are public" on public.listings for select to anon, authenticated using (is_published or public.is_admin());
drop policy if exists "admins manage listings" on public.listings;
create policy "admins manage listings" on public.listings for all to authenticated using (public.is_admin()) with check (public.is_admin());

drop policy if exists "anyone records an enquiry" on public.enquiry_events;
create policy "anyone records an enquiry" on public.enquiry_events for insert to anon, authenticated with check (true);
drop policy if exists "admins read enquiries" on public.enquiry_events;
create policy "admins read enquiries" on public.enquiry_events for select to authenticated using (public.is_admin());
drop policy if exists "admins clear enquiries" on public.enquiry_events;
create policy "admins clear enquiries" on public.enquiry_events for delete to authenticated using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('site-images', 'site-images', true, 8388608, array['image/webp', 'image/jpeg', 'image/png', 'image/svg+xml'])
on conflict (id) do update set public = true, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "site images are public" on storage.objects;
create policy "site images are public" on storage.objects for select to anon, authenticated using (bucket_id = 'site-images');
drop policy if exists "admins add site images" on storage.objects;
create policy "admins add site images" on storage.objects for insert to authenticated with check (bucket_id = 'site-images' and public.is_admin());
drop policy if exists "admins change site images" on storage.objects;
create policy "admins change site images" on storage.objects for update to authenticated using (bucket_id = 'site-images' and public.is_admin());
drop policy if exists "admins remove site images" on storage.objects;
create policy "admins remove site images" on storage.objects for delete to authenticated using (bucket_id = 'site-images' and public.is_admin());

-- Changes the signed-in admin's login email at once. Supabase's normal route waits
-- on a confirmation email, and this project has no mail provider to send one.
create or replace function public.change_admin_email(new_email text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  if not public.is_admin() then
    raise exception 'Not an admin' using errcode = '42501';
  end if;
  update auth.users
     set email = lower(new_email), email_change = '', email_change_token_new = '', email_change_sent_at = null, updated_at = now()
   where id = auth.uid();
  update auth.identities
     set identity_data = jsonb_set(identity_data, '{email}', to_jsonb(lower(new_email))), updated_at = now()
   where user_id = auth.uid() and provider = 'email';
end;
$$;

revoke all on function public.change_admin_email(text) from public, anon;
grant execute on function public.change_admin_email(text) to authenticated;

-- Starting content, only on an empty database.
insert into public.hardware_groups (name, sort_order)
select * from (values ('Building', 1), ('Paint', 2), ('Tools', 3), ('Plumbing', 4)) as seed(name, sort_order)
where not exists (select 1 from public.hardware_groups);

insert into public.listings (kind, name, detail, group_name, unit, sort_order)
select * from (values
  ('stay', 'Sample studio', 'Studio · sleeps 2', null, 'per night', 1),
  ('stay', 'Sample one bedroom', '1 bedroom · sleeps 2', null, 'per night', 2),
  ('stay', 'Sample two bedroom', '2 bedrooms · sleeps 4', null, 'per night', 3),
  ('hardware', 'Sample cement', '', 'Building', 'per bag', 1),
  ('hardware', 'Sample iron sheets', '', 'Building', 'per piece', 2),
  ('hardware', 'Sample emulsion paint', '', 'Paint', 'per tin', 3),
  ('hardware', 'Sample gloss paint', '', 'Paint', 'per tin', 4),
  ('hardware', 'Sample hammer', '', 'Tools', 'each', 5),
  ('hardware', 'Sample wheelbarrow', '', 'Tools', 'each', 6),
  ('hardware', 'Sample PVC pipe', '', 'Plumbing', 'per length', 7),
  ('hardware', 'Sample water tap', '', 'Plumbing', 'each', 8),
  ('car', 'Sample saloon', 'Town trips · 5 seats', null, 'per day', 1),
  ('car', 'Sample SUV', 'Long trips · 7 seats', null, 'per day', 2),
  ('car', 'Sample van', 'Groups and luggage · 9 seats', null, 'per day', 3)
) as seed(kind, name, detail, group_name, unit, sort_order)
where not exists (select 1 from public.listings);
