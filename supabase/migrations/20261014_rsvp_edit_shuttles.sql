-- Apply only after approval, before enabling the RSVP v2 Edge Function.
alter table public.rsvps
  add column if not exists pin_hash text,
  add column if not exists gumi_outbound integer not null default 0,
  add column if not exists gumi_return integer not null default 0,
  add column if not exists gimcheon_outbound integer not null default 0,
  add column if not exists gimcheon_return integer not null default 0,
  add column if not exists updated_at timestamptz;

-- A round trip is represented by one guest using both outward and return legs.
-- Nonidentical origins are allowed for outgoing and return trips.
alter table public.rsvps drop constraint if exists rsvp_shuttle_legs_valid;
alter table public.rsvps add constraint rsvp_shuttle_legs_valid check (
  gumi_outbound >= 0 and gumi_return >= 0 and
  gimcheon_outbound >= 0 and gimcheon_return >= 0 and
  gumi_outbound + gimcheon_outbound <= guests and
  gumi_return + gimcheon_return <= guests
);
create unique index if not exists rsvp_name_pin_unique on public.rsvps (name,pin_hash) where pin_hash is not null;

-- Account-level protection against online guessing. Access only via service-role Edge Function.
create table if not exists public.rsvp_pin_attempts (
  identity_key text primary key,
  attempt_count integer not null default 0,
  window_start timestamptz not null default now()
);
alter table public.rsvp_pin_attempts enable row level security;
revoke all on public.rsvp_pin_attempts from anon, authenticated;
create or replace function public.rsvp_pin_attempt(p_key text, p_success boolean default false)
returns boolean
language plpgsql security definer set search_path = public as $$
declare v_count integer; v_start timestamptz;
begin
  insert into public.rsvp_pin_attempts(identity_key,attempt_count,window_start)
  values (p_key,0,now()) on conflict(identity_key) do nothing;
  select attempt_count, window_start into v_count,v_start
  from public.rsvp_pin_attempts where identity_key=p_key for update;
  if v_start < now() - interval '1 hour' then
    update public.rsvp_pin_attempts set attempt_count=0,window_start=now() where identity_key=p_key;
    v_count := 0;
  end if;
  if p_success then
    update public.rsvp_pin_attempts set attempt_count=0,window_start=now() where identity_key=p_key;
    return true;
  end if;
  if v_count >= 5 then return false; end if;
  update public.rsvp_pin_attempts set attempt_count=attempt_count+1 where identity_key=p_key;
  return true;
end $$;
revoke all on function public.rsvp_pin_attempt(text,boolean) from public, anon,authenticated;
grant execute on function public.rsvp_pin_attempt(text,boolean) to service_role;

-- Public editing is forbidden. Only the Edge Function holding the service-role key can edit.
-- Legacy INSERT access removal happens in a separate, post-merge hardening migration.
-- This additive migration intentionally preserves the current RSVP service until switchover.
