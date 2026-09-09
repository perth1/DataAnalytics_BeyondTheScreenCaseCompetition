-- Thai labels for the taxonomy and the view fallbacks.
--
-- The site reads Thai, but theme and series names are DATA, not UI copy — they
-- live in content_themes / content_categories and are what the charts and
-- tables print. Translating the components alone left "Love & Relationships"
-- and "Talk & Interview" on screen, so the labels are translated here.
--
-- Proper nouns keep their own spelling: Friendsfly, My Ambulove, This or That
-- and CarราCarซัง are the programmes' actual names, and มื้อสุดท้ายก่อนตาย /
-- Last Supper is how that show brands itself. Only the generic buckets change.
--
-- Slugs are untouched on purpose — lib/classify.ts matches on them, so renaming
-- a slug would silently unclassify every post that carries it.

update content_themes set name = case slug
  when 'love'      then 'ความรัก & ความสัมพันธ์'
  when 'friends'   then 'มิตรภาพ'
  when 'life'      then 'ชีวิต & มุมมองต่อชีวิต'
  when 'game'      then 'เกม & ชาเลนจ์'
  when 'travel'    then 'ท่องเที่ยว'
  when 'food'      then 'อาหาร'
  when 'music'     then 'เพลง & ศิลปิน'
  when 'celeb'     then 'คนดัง & แขกรับเชิญ'
  when 'behind'    then 'เบื้องหลัง'
  when 'lifestyle' then 'ความสวย & ไลฟ์สไตล์'
  when 'product'   then 'สินค้า & สปอนเซอร์'
  when 'other'     then 'อื่น ๆ'
  else name
end
where slug in ('love','friends','life','game','travel','food','music','celeb',
               'behind','lifestyle','product','other');

update content_categories set name = case slug
  when 'music'     then 'เพลง / MV'
  when 'game'      then 'เกม & ชาเลนจ์'
  when 'travel'    then 'ท่องเที่ยว'
  when 'food'      then 'อาหาร'
  when 'talk'      then 'พูดคุย & สัมภาษณ์'
  when 'sponsored' then 'สปอนเซอร์ / ไทอิน'
  when 'other'     then 'อื่น ๆ'
  else name
end
where slug in ('music','game','travel','food','talk','sponsored','other');

-- ---------------------------------------------------------------- views
-- The performance views label unclassified rows in their own COALESCE, so the
-- English fallbacks have to be replaced too.
drop view if exists v_category_performance;
drop view if exists v_theme_performance;

create view v_category_performance
with (security_invoker = true) as
select
  platform,
  coalesce(category_slug, 'uncategorized')      as category_slug,
  coalesce(category_name, 'ยังไม่จัดหมวดหมู่')      as category_name,
  count(*)                                    as post_count,
  coalesce(sum(views), 0)                     as total_views,
  coalesce(sum(likes), 0)                     as total_likes,
  coalesce(sum(comments), 0)                  as total_comments,
  coalesce(sum(shares), 0)                    as total_shares,
  coalesce(round(avg(views)), 0)              as avg_views,
  coalesce(round(avg(engagement_rate), 4), 0) as avg_engagement_rate
from v_post_latest_metrics
group by platform, category_slug, category_name;

create view v_theme_performance
with (security_invoker = true) as
select
  platform,
  coalesce(theme_slug, 'unclassified') as theme_slug,
  coalesce(theme_name, 'ไม่ระบุธีม')       as theme_name,
  count(*)                                    as post_count,
  coalesce(sum(views), 0)                     as total_views,
  coalesce(sum(likes), 0)                     as total_likes,
  coalesce(sum(comments), 0)                  as total_comments,
  coalesce(sum(shares), 0)                    as total_shares,
  coalesce(round(avg(views)), 0)              as avg_views,
  coalesce(round(avg(engagement_rate), 4), 0) as avg_engagement_rate
from v_post_latest_metrics
group by platform, theme_slug, theme_name;

-- v_comment_signals labels the series a comment sits under, and five views read
-- through it, so the whole chain is rebuilt to change that one fallback.
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
  coalesce(cc.name, 'ยังไม่จัดหมวดหมู่') as series_name,
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
