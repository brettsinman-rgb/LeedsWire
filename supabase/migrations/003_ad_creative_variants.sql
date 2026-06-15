alter table public.ad_creatives
  add column if not exists creative_variant text not null default 'default',
  add column if not exists width integer,
  add column if not exists height integer;

update public.ad_creatives
set creative_variant = case
  when placement in ('homepage-top', 'homepage-mid', 'homepage-bottom') then 'desktop'
  when placement = 'sideskin-left' then 'left'
  when placement = 'sideskin-right' then 'right'
  else 'default'
end
where creative_variant = 'default';

drop index if exists ad_creatives_one_active_per_placement_idx;

create unique index if not exists ad_creatives_one_active_per_variant_idx
  on public.ad_creatives (placement, creative_variant)
  where is_active = true;

create index if not exists ad_creatives_variant_idx
  on public.ad_creatives (creative_variant);
