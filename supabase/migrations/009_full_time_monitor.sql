-- Durable monitor context and a shared polling gate; delivery uniqueness remains in 006.
-- Apply before deploying the Full-Time monitor. Does not enable sending.
create table if not exists public.push_full_time_status (
  singleton boolean primary key default true check (singleton),
  fixture jsonb,
  provider_fixture_id bigint,
  last_poll_at timestamptz,
  evaluation jsonb,
  last_provider_observation jsonb,
  last_completed_match jsonb,
  last_dispatch jsonb
);
insert into public.push_full_time_status (singleton) values (true) on conflict do nothing;
alter table public.push_full_time_status enable row level security;
revoke all on public.push_full_time_status from anon, authenticated;
grant all on public.push_full_time_status to service_role;

create or replace function public.claim_full_time_poll()
returns boolean language plpgsql security definer set search_path = public as $$
begin
  update public.push_full_time_status set last_poll_at = now()
  where singleton = true and (last_poll_at is null or last_poll_at <= now() - interval '150 seconds');
  return found;
end;
$$;
revoke all on function public.claim_full_time_poll() from public, anon, authenticated;
grant execute on function public.claim_full_time_poll() to service_role;

create or replace function public.record_full_time_click(input_event_id uuid)
returns void language sql security definer set search_path = public as $$
  update public.push_notification_events set click_count = click_count + 1
  where id = input_event_id and event_type = 'full_time';
$$;
revoke all on function public.record_full_time_click(uuid) from public, anon, authenticated;
grant execute on function public.record_full_time_click(uuid) to service_role;

comment on column public.push_full_time_status.last_dispatch is
  'Latest dispatch attempt and aggregate totals. Skipped evaluations must never overwrite this field.';
comment on column public.push_full_time_status.fixture is
  'Context from the existing official Leeds fixture list, retained through the monitoring window.';
