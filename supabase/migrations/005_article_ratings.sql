create extension if not exists "pgcrypto";

create table if not exists public.article_rating_articles (
  article_id text primary key,
  source_id text,
  team text not null default 'Leeds United',
  category text,
  updated_at timestamptz not null default now()
);

create table if not exists public.article_ratings (
  id uuid primary key default gen_random_uuid(),
  article_id text not null,
  rating text not null check (rating in ('worth_reading', 'must_read', 'skip')),
  created_at timestamptz not null default now(),
  visitor_id uuid not null,
  constraint article_ratings_one_vote_per_visitor unique (article_id, visitor_id)
);

create index if not exists article_ratings_article_id_idx
  on public.article_ratings (article_id);

create index if not exists article_ratings_rating_idx
  on public.article_ratings (rating);

create table if not exists public.article_rating_aggregates (
  article_id text primary key,
  worth_reading_count integer not null default 0,
  must_read_count integer not null default 0,
  skip_count integer not null default 0,
  total_count integer not null default 0,
  positive_count integer not null default 0,
  positive_percentage numeric(5,2) not null default 0,
  updated_at timestamptz not null default now()
);

alter table public.article_rating_articles enable row level security;
alter table public.article_ratings enable row level security;
alter table public.article_rating_aggregates enable row level security;

drop policy if exists "article_rating_articles_select" on public.article_rating_articles;
drop policy if exists "article_rating_articles_insert" on public.article_rating_articles;
drop policy if exists "article_rating_articles_update" on public.article_rating_articles;
drop policy if exists "article_ratings_select" on public.article_ratings;
drop policy if exists "article_ratings_insert" on public.article_ratings;
drop policy if exists "article_ratings_update" on public.article_ratings;
drop policy if exists "article_rating_aggregates_select" on public.article_rating_aggregates;

create policy "article_rating_articles_select"
on public.article_rating_articles
for select
to anon, authenticated
using (true);

create policy "article_rating_articles_insert"
on public.article_rating_articles
for insert
to anon, authenticated
with check (true);

create policy "article_rating_articles_update"
on public.article_rating_articles
for update
to anon, authenticated
using (true)
with check (true);

create policy "article_ratings_select"
on public.article_ratings
for select
to anon, authenticated
using (true);

create policy "article_ratings_insert"
on public.article_ratings
for insert
to anon, authenticated
with check (
  rating in ('worth_reading', 'must_read', 'skip')
  and article_id is not null
  and visitor_id is not null
);

create policy "article_ratings_update"
on public.article_ratings
for update
to anon, authenticated
using (true)
with check (
  rating in ('worth_reading', 'must_read', 'skip')
  and article_id is not null
  and visitor_id is not null
);

create policy "article_rating_aggregates_select"
on public.article_rating_aggregates
for select
to anon, authenticated
using (true);

grant select, insert, update on public.article_rating_articles to anon, authenticated;
grant select, insert, update on public.article_ratings to anon, authenticated;
grant select on public.article_rating_aggregates to anon, authenticated;

create or replace function public.refresh_article_rating_aggregate(target_article_id text)
returns void
language plpgsql
as $$
begin
  insert into public.article_rating_aggregates (
    article_id,
    worth_reading_count,
    must_read_count,
    skip_count,
    total_count,
    positive_count,
    positive_percentage,
    updated_at
  )
  select
    target_article_id,
    count(*) filter (where rating = 'worth_reading')::integer,
    count(*) filter (where rating = 'must_read')::integer,
    count(*) filter (where rating = 'skip')::integer,
    count(*)::integer,
    count(*) filter (where rating in ('worth_reading', 'must_read'))::integer,
    coalesce(
      round(
        (
          count(*) filter (where rating in ('worth_reading', 'must_read'))::numeric
          / nullif(count(*)::numeric, 0)
        ) * 100,
        2
      ),
      0
    ),
    now()
  from public.article_ratings
  where article_id = target_article_id
  on conflict (article_id) do update set
    worth_reading_count = excluded.worth_reading_count,
    must_read_count = excluded.must_read_count,
    skip_count = excluded.skip_count,
    total_count = excluded.total_count,
    positive_count = excluded.positive_count,
    positive_percentage = excluded.positive_percentage,
    updated_at = excluded.updated_at;
end;
$$;

create or replace function public.article_ratings_refresh_aggregate_trigger()
returns trigger
language plpgsql
as $$
begin
  perform public.refresh_article_rating_aggregate(coalesce(new.article_id, old.article_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists article_ratings_refresh_aggregate on public.article_ratings;

create trigger article_ratings_refresh_aggregate
after insert or update or delete on public.article_ratings
for each row
execute function public.article_ratings_refresh_aggregate_trigger();

create or replace view public.article_ratings_most_rated as
select
  aggregate.article_id,
  article.source_id,
  article.team,
  article.category,
  aggregate.total_count,
  aggregate.positive_count,
  aggregate.positive_percentage
from public.article_rating_aggregates aggregate
left join public.article_rating_articles article
  on article.article_id = aggregate.article_id
order by aggregate.total_count desc, aggregate.positive_percentage desc;

create or replace view public.article_ratings_highest_rated as
select
  aggregate.article_id,
  article.source_id,
  article.team,
  article.category,
  aggregate.total_count,
  aggregate.positive_count,
  aggregate.positive_percentage
from public.article_rating_aggregates aggregate
left join public.article_rating_articles article
  on article.article_id = aggregate.article_id
where aggregate.total_count > 0
order by aggregate.positive_percentage desc, aggregate.total_count desc;

create or replace view public.article_ratings_lowest_rated as
select
  aggregate.article_id,
  article.source_id,
  article.team,
  article.category,
  aggregate.total_count,
  aggregate.positive_count,
  aggregate.positive_percentage
from public.article_rating_aggregates aggregate
left join public.article_rating_articles article
  on article.article_id = aggregate.article_id
where aggregate.total_count > 0
order by aggregate.positive_percentage asc, aggregate.total_count desc;

create or replace view public.article_ratings_by_source as
select
  coalesce(article.source_id, 'unknown') as source_id,
  count(rating.id)::integer as rating_count,
  count(rating.id) filter (where rating.rating in ('worth_reading', 'must_read'))::integer as positive_count,
  count(rating.id) filter (where rating.rating = 'skip')::integer as skip_count,
  coalesce(
    round(
      (
        count(rating.id) filter (where rating.rating in ('worth_reading', 'must_read'))::numeric
        / nullif(count(rating.id)::numeric, 0)
      ) * 100,
      2
    ),
    0
  ) as positive_percentage
from public.article_ratings rating
left join public.article_rating_articles article
  on article.article_id = rating.article_id
group by coalesce(article.source_id, 'unknown')
order by rating_count desc;

create or replace view public.article_ratings_by_team as
select
  coalesce(article.team, 'Leeds United') as team,
  count(rating.id)::integer as rating_count,
  count(rating.id) filter (where rating.rating in ('worth_reading', 'must_read'))::integer as positive_count,
  count(rating.id) filter (where rating.rating = 'skip')::integer as skip_count,
  coalesce(
    round(
      (
        count(rating.id) filter (where rating.rating in ('worth_reading', 'must_read'))::numeric
        / nullif(count(rating.id)::numeric, 0)
      ) * 100,
      2
    ),
    0
  ) as positive_percentage
from public.article_ratings rating
left join public.article_rating_articles article
  on article.article_id = rating.article_id
group by coalesce(article.team, 'Leeds United')
order by rating_count desc;
