-- Materialise the comment classification.
--
-- 0008 scored all 25,693 comments on every read: two regex chains per row, per
-- query, six queries per page load. v_signal_coverage measured 2,699 ms, which
-- overruns the anon role's statement timeout, so the Market page fell back to
-- its empty state even though the data was there.
--
-- Stored generated columns move that work to write time. Reads become grouped
-- counts over indexed columns, and unlike a materialised view there is no
-- refresh step to forget: Postgres recomputes a row when it is inserted or its
-- text changes, so the next ingest stays correct for free.
--
-- CHANGING THE LEXICON: Postgres will not replace a function a generated column
-- depends on, and stored values do not recompute on their own. To edit either
-- lexicon, run: alter table post_comments drop column cohort, drop column
-- territory; then create or replace the function; then re-add the columns from
-- this file. Re-adding rewrites the table, which is seconds at this size.
--
-- The column holding the comment body is itself called "text", so it is quoted
-- throughout to keep it from being read as the type name.

alter table post_comments
  add column if not exists cohort text
    generated always as (audience_cohort("text")) stored,
  add column if not exists territory text
    generated always as (market_territory("text")) stored;

create index if not exists post_comments_territory_idx
  on post_comments (territory) where territory is not null;
create index if not exists post_comments_cohort_idx
  on post_comments (cohort) where cohort is not null;

-- Rebuild the signal view over the stored columns. Everything downstream reads
-- through this view, so the aggregate views need no change.
drop view if exists v_signal_coverage;
drop view if exists v_territory_momentum;
drop view if exists v_cohort_series;
drop view if exists v_cohort_territory;
drop view if exists v_territory_demand;
drop view if exists v_comment_signals;

create view v_comment_signals
with (security_invoker = true) as
select
  pc.id,
  pc.post_id,
  p.platform,
  pc.published_at as commented_at,
  coalesce(pc.like_count, 0) as like_count,
  coalesce(cc.slug, 'uncategorized') as series_slug,
  coalesce(cc.name, 'Uncategorized') as series_name,
  pc.cohort,
  pc.territory
from post_comments pc
join posts p on p.id = pc.post_id
left join content_categories cc on cc.id = p.category_id;

create view v_territory_demand
with (security_invoker = true) as
select
  platform,
  territory,
  count(*)                  as signals,
  count(distinct post_id)   as posts_mentioning,
  sum(like_count)           as signal_likes
from v_comment_signals
where territory is not null
group by platform, territory;

create view v_cohort_territory
with (security_invoker = true) as
select
  platform,
  cohort,
  territory,
  count(*)        as signals,
  sum(like_count) as signal_likes
from v_comment_signals
where cohort is not null and territory is not null
group by platform, cohort, territory;

create view v_cohort_series
with (security_invoker = true) as
select
  platform,
  cohort,
  series_slug,
  series_name,
  count(*) as signals
from v_comment_signals
where cohort is not null
group by platform, cohort, series_slug, series_name;

create view v_territory_momentum
with (security_invoker = true) as
select
  platform,
  territory,
  extract(year from commented_at)::int as year,
  count(*) as signals
from v_comment_signals
where territory is not null and commented_at is not null
group by platform, territory, 3;

create view v_signal_coverage
with (security_invoker = true) as
select
  platform,
  count(*)                as comments,
  count(cohort)           as cohort_signals,
  count(territory)        as territory_signals,
  count(distinct post_id) as posts_with_comments
from v_comment_signals
group by platform;
