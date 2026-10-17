-- Apply in Supabase SQL Editor before enabling the shuttle boarding tab.
create table if not exists public.shuttle_boardings (
 rsvp_id uuid not null references public.rsvps(id) on delete cascade,
 route text not null check (route in ('gumi_outbound','gumi_return','gimcheon_outbound','gimcheon_return')),
 boarded_count integer not null default 0 check (boarded_count between 0 and 30),
 updated_at timestamptz not null default now(),
 primary key (rsvp_id,route)
);
alter table public.shuttle_boardings enable row level security;
revoke all on public.shuttle_boardings from anon, authenticated;
grant select on public.shuttle_boardings to authenticated;
drop policy if exists "admins read shuttle boarding" on public.shuttle_boardings;
create policy "admins read shuttle boarding" on public.shuttle_boardings
 for select to authenticated using (exists(select 1 from public.admin_users where user_id=(select auth.uid())));
create or replace function public.admin_set_shuttle_boarding(p_rsvp_id uuid,p_route text,p_count integer)
returns void language plpgsql security definer set search_path=public as $$
declare v_limit integer;
begin
 if not exists(select 1 from public.admin_users where user_id=auth.uid()) then
  raise exception 'Admin permission required';
 end if;
 if p_route not in ('gumi_outbound','gumi_return','gimcheon_outbound','gimcheon_return') then
  raise exception 'Invalid shuttle route';
 end if;
 select case p_route
  when 'gumi_outbound' then gumi_outbound
  when 'gumi_return' then gumi_return
  when 'gimcheon_outbound' then gimcheon_outbound
  when 'gimcheon_return' then gimcheon_return end
 into v_limit from public.rsvps where id=p_rsvp_id and attendance='참석' for update;
 if not found or v_limit is null or p_count is null or p_count<0 or p_count>v_limit then
  raise exception 'Boarding count exceeds the current reservation';
 end if;
 insert into public.shuttle_boardings(rsvp_id,route,boarded_count,updated_at)
 values(p_rsvp_id,p_route,p_count,now())
 on conflict(rsvp_id,route) do update set boarded_count=excluded.boarded_count,updated_at=now();
end $$;
revoke all on function public.admin_set_shuttle_boarding(uuid,text,integer) from public,anon;
grant execute on function public.admin_set_shuttle_boarding(uuid,text,integer) to authenticated;
