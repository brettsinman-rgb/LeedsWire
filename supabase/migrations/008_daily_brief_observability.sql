alter table public.push_notification_events
  add column if not exists eligible_subscribers integer not null default 0,
  add column if not exists attempted_deliveries integer not null default 0,
  add column if not exists expired_subscriptions integer not null default 0,
  add column if not exists failure_summary jsonb not null default '{}'::jsonb;

alter table public.push_daily_brief_status
  add column if not exists last_dispatch_attempt_at timestamptz,
  add column if not exists eligible_subscribers integer not null default 0,
  add column if not exists attempted_deliveries integer not null default 0,
  add column if not exists expired_subscriptions integer not null default 0,
  add column if not exists failure_summary jsonb not null default '{}'::jsonb;

comment on column public.push_daily_brief_status.last_evaluated_at is
  'Most recent scheduler evaluation, including skipped evaluations.';
comment on column public.push_daily_brief_status.last_dispatch_attempt_at is
  'Most recent evaluation that attempted one or more push deliveries.';
comment on column public.push_daily_brief_status.last_successful_dispatch_at is
  'Most recent dispatch where at least one push service accepted the notification.';
