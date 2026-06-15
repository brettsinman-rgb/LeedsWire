alter table public.ad_creatives
  add column if not exists creative_type text not null default 'image',
  add column if not exists entry_url text,
  add column if not exists original_filename text;

update public.ad_creatives
set creative_type = 'image'
where creative_type is null or creative_type = '';

create index if not exists ad_creatives_creative_type_idx
  on public.ad_creatives (creative_type);
