create extension if not exists "pgcrypto";

create table if not exists public.ad_settings (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null unique,
  setting_value boolean not null default true,
  updated_at timestamptz not null default now()
);

create table if not exists public.ad_settings_audit (
  id uuid primary key default gen_random_uuid(),
  setting_key text not null,
  old_value boolean,
  new_value boolean not null,
  updated_by text,
  updated_at timestamptz not null default now()
);

insert into public.ad_settings (setting_key, setting_value)
values
  ('ADS_ENABLED', true),
  ('TOP_AD_ENABLED', true),
  ('MID_AD_ENABLED', true),
  ('BOTTOM_AD_ENABLED', true),
  ('SIDE_SKINS_ENABLED', true),
  ('SPONSOR_BACKGROUND_ENABLED', true),
  ('POPUP_ENABLED', true),
  ('HOUSE_ADS_ENABLED', true)
on conflict (setting_key) do nothing;
