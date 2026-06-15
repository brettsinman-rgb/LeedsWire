create extension if not exists "pgcrypto";

insert into storage.buckets (id, name, public)
values ('ads', 'ads', true)
on conflict (id) do update set public = true;

create table if not exists public.ad_creatives (
  id uuid primary key default gen_random_uuid(),
  placement text not null,
  name text not null,
  file_url text not null,
  click_url text,
  is_active boolean not null default false,
  uploaded_at timestamptz not null default now(),
  uploaded_by text,
  start_date timestamptz,
  end_date timestamptz
);

create index if not exists ad_creatives_placement_idx
  on public.ad_creatives (placement);

create index if not exists ad_creatives_is_active_idx
  on public.ad_creatives (is_active);

create unique index if not exists ad_creatives_one_active_per_placement_idx
  on public.ad_creatives (placement)
  where is_active = true;

create table if not exists public.ad_creative_audit (
  id uuid primary key default gen_random_uuid(),
  creative_id uuid,
  action text not null,
  performed_by text,
  timestamp timestamptz not null default now()
);

create index if not exists ad_creative_audit_creative_id_idx
  on public.ad_creative_audit (creative_id);

create index if not exists ad_creative_audit_timestamp_idx
  on public.ad_creative_audit (timestamp desc);
