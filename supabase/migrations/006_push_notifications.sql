create extension if not exists "pgcrypto";

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  platform text,
  notification_match_alerts boolean not null default true,
  notification_full_time boolean not null default true,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  last_success_at timestamptz,
  last_failure_at timestamptz,
  failure_count integer not null default 0 check (failure_count >= 0)
);

create index if not exists push_subscriptions_active_idx
  on public.push_subscriptions (is_active)
  where is_active = true;

create table if not exists public.push_notification_events (
  id uuid primary key default gen_random_uuid(),
  event_type text not null,
  fixture_id text not null,
  home_team text not null,
  away_team text not null,
  home_score integer,
  away_score integer,
  provider text not null,
  provider_status text not null,
  detected_at timestamptz not null,
  sent_at timestamptz,
  created_at timestamptz not null default now(),
  constraint push_notification_events_once unique (event_type, fixture_id)
);

create index if not exists push_notification_events_unsent_idx
  on public.push_notification_events (event_type, detected_at)
  where sent_at is null;

alter table public.push_subscriptions enable row level security;
alter table public.push_notification_events enable row level security;

revoke all on public.push_subscriptions from anon, authenticated;
revoke all on public.push_notification_events from anon, authenticated;
grant all on public.push_subscriptions to service_role;
grant all on public.push_notification_events to service_role;

create or replace function public.set_push_subscription_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists push_subscriptions_updated_at on public.push_subscriptions;
create trigger push_subscriptions_updated_at
before update on public.push_subscriptions
for each row execute function public.set_push_subscription_updated_at();

create or replace function public.increment_push_failure(subscription_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_subscriptions
  set failure_count = failure_count + 1
  where id = subscription_id;
$$;

revoke all on function public.increment_push_failure(uuid) from public, anon, authenticated;
grant execute on function public.increment_push_failure(uuid) to service_role;
