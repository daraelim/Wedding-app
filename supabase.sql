-- Execute in Supabase SQL Editor. Do not use the service_role key in the browser.
create table if not exists public.rsvps (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(trim(name)) between 1 and 60),
  relationship text not null check (relationship in ('가족','직장','학교','친구','기타')),
  attendance text not null check (attendance in ('참석','불참')),
  guests integer not null default 0 check (guests between 0 and 30),
  meals integer not null default 0 check (meals between 0 and 30),
  shuttle_count integer not null default 0 check (shuttle_count between 0 and 30),
  checked_in boolean not null default false,
  created_at timestamptz not null default now(),
  constraint valid_counts check (meals <= guests and shuttle_count <= guests and ((attendance='불참' and guests=0 and meals=0 and shuttle_count=0) or (attendance='참석' and guests>=1)))
);
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade
);
alter table public.rsvps enable row level security;
alter table public.admin_users enable row level security;
revoke all on public.rsvps from anon, authenticated;
revoke all on public.admin_users from anon, authenticated;
grant insert on public.rsvps to anon, authenticated;
grant select, insert, update on public.rsvps to authenticated;
grant select on public.admin_users to authenticated;
create policy "admin can identify self" on public.admin_users for select to authenticated using (user_id = (select auth.uid()));
create policy "public can submit RSVP" on public.rsvps for insert to anon, authenticated with check (
  checked_in = false and name = trim(name) and
  (select auth.uid()) is null
);
create policy "admins can read RSVPs" on public.rsvps for select to authenticated using (
  exists(select 1 from public.admin_users where user_id=(select auth.uid()))
);
create policy "admins can update checkins" on public.rsvps for update to authenticated using (
  exists(select 1 from public.admin_users where user_id=(select auth.uid()))
) with check (
  exists(select 1 from public.admin_users where user_id=(select auth.uid()))
);
create policy "admins can add walkins" on public.rsvps for insert to authenticated with check (
  exists(select 1 from public.admin_users where user_id=(select auth.uid()))
);
-- AFTER creating an admin in Supabase Authentication > Users, add their UUID here:
-- insert into public.admin_users(user_id) values ('REPLACE_WITH_AUTH_USER_UUID');
-- Public insert can be abused by bots. Before public launch, enable CAPTCHA/rate limits
-- using a server-side endpoint or Supabase Edge Function, and close submissions at deadline.
