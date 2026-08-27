alter table public.push_subscriptions
  add column if not exists notification_daily_brief boolean not null default false;

alter table public.push_notification_events
  alter column fixture_id drop not null,
  alter column home_team drop not null,
  alter column away_team drop not null,
  alter column provider drop not null,
  alter column provider_status drop not null,
  add column if not exists article_id text,
  add column if not exists canonical_url text,
  add column if not exists canonical_url_hash text,
  add column if not exists headline text,
  add column if not exists source_id text,
  add column if not exists dispatch_date date,
  add column if not exists successful_deliveries integer not null default 0,
  add column if not exists failed_deliveries integer not null default 0,
  add column if not exists click_count integer not null default 0;

create unique index if not exists push_daily_brief_article_once_idx
  on public.push_notification_events (canonical_url_hash)
  where event_type = 'daily_brief';

create unique index if not exists push_daily_brief_date_once_idx
  on public.push_notification_events (dispatch_date)
  where event_type = 'daily_brief';

create table if not exists public.push_daily_brief_status (
  singleton boolean primary key default true check (singleton),
  last_evaluated_at timestamptz,
  last_successful_dispatch_at timestamptz,
  selected_article_id text,
  selected_headline text,
  successful_deliveries integer not null default 0,
  failed_deliveries integer not null default 0,
  skip_reason text,
  updated_at timestamptz not null default now()
);

alter table public.push_daily_brief_status enable row level security;
revoke all on public.push_daily_brief_status from anon, authenticated;
grant all on public.push_daily_brief_status to service_role;

create or replace function public.reserve_daily_brief_event(
  input_article_id text,
  input_canonical_url text,
  input_canonical_url_hash text,
  input_headline text,
  input_source_id text,
  input_detected_at timestamptz,
  input_dispatch_date date
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  reserved_id uuid;
begin
  insert into public.push_notification_events (
    event_type,
    article_id,
    canonical_url,
    canonical_url_hash,
    headline,
    source_id,
    detected_at,
    dispatch_date
  ) values (
    'daily_brief',
    input_article_id,
    input_canonical_url,
    input_canonical_url_hash,
    input_headline,
    input_source_id,
    input_detected_at,
    input_dispatch_date
  )
  on conflict do nothing
  returning id into reserved_id;

  return reserved_id;
end;
$$;

create or replace function public.record_daily_brief_click(input_event_id uuid)
returns void
language sql
security definer
set search_path = public
as $$
  update public.push_notification_events
  set click_count = click_count + 1
  where id = input_event_id and event_type = 'daily_brief';
$$;

revoke all on function public.reserve_daily_brief_event(text, text, text, text, text, timestamptz, date)
  from public, anon, authenticated;
grant execute on function public.reserve_daily_brief_event(text, text, text, text, text, timestamptz, date)
  to service_role;

revoke all on function public.record_daily_brief_click(uuid) from public, anon, authenticated;
grant execute on function public.record_daily_brief_click(uuid) to service_role;
