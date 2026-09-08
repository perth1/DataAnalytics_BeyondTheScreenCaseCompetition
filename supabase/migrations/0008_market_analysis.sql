-- Market analysis: interest territories and audience life-stage cohorts.
--
-- WHY THIS IS DERIVED FROM TEXT, NOT DEMOGRAPHICS
-- 0003 dropped audience_breakdown because age/gender splits need the YouTube
-- Analytics API, which only the channel owner can call. The market question
-- ("which interests does each age group care about") therefore has to be read
-- off language the audience volunteers in comments, and off the language of
-- the titles the channel publishes.
--
-- The point of doing both with ONE lexicon is comparability: demand is measured
-- in comment signals, supply in published posts, and because both sides are
-- scored by the same vocabulary the gap between them is meaningful.
--
-- LIMITS, so the UI can state them: only ~4% of comments volunteer a life-stage
-- marker and comments exist for the sampled mass-reach posts only, so cohort
-- rows are directional reads of a self-selected sample, not measured demographics.

-- ---------------------------------------------------------------- lexicon
-- First match wins, so the specific market territories are tested before the
-- broad ones: a comment that mentions both health and fun counts as health.
-- Appearance terms (ผิว, ครีม, สกินแคร์) belong to beauty, not longevity, so
-- wellness stays health-proper. 'หมอ' is deliberately absent — it collides with
-- หมอดู/หมอลำ — illness is caught by ป่วย|รักษา|โรงพยาบาล|โรค instead.
create or replace function market_territory(src text)
returns text language sql immutable as $$
  select case
    when src is null then null
    when lower(src) ~ 'สุขภาพ|ออกกำลังกาย|ฟิตเนส|โยคะ|วิ่ง|อาหารเสริม|วิตามิน|นอนไม่หลับ|ลดน้ำหนัก|ดูแลตัวเอง|แข็งแรง|ป่วย|รักษา|โรงพยาบาล|โรค|สุขภาพจิต'
      then 'longevity-wellness'
    when lower(src) ~ 'พัฒนาตัวเอง|แรงบันดาลใจ|กำลังใจ|ข้อคิด|บทเรียน|มุมมอง|ทัศนคติ|เติบโต|โตขึ้น|เข้มแข็ง|สู้ต่อ|เป้าหมาย'
      then 'self-development'
    when lower(src) ~ 'ลงทุน|เก็บเงิน|ออมเงิน|หนี้|ธุรกิจ|อาชีพ|รายได้|เงินเดือน|ค่าครองชีพ'
      then 'money-career'
    when lower(src) ~ 'ความรัก|แฟน|คู่รัก|แต่งงาน|ครอบครัว|อกหัก|โสด|จีบ|นอกใจ'
      then 'relationships'
    when lower(src) ~ 'แต่งหน้า|เสื้อผ้า|ทรงผม|ลิป|ครีม|แฟชั่น|สกินแคร์|ตัดผม|ผิว'
      then 'beauty-fashion'
    when lower(src) ~ 'ร้านอาหาร|เมนู|อร่อย|ทำกิน|ของกิน|คาเฟ่|บุฟเฟ่ต์'
      then 'food'
    when lower(src) ~ 'เที่ยว|ทริป|ที่พัก|ต่างประเทศ|โรงแรม|สายการบิน|trip'
      then 'travel'
    when lower(src) ~ 'ขำ|ตลก|ฮา|สนุก|ติ่ง|เพลง|ซีรีส์|ละคร|เกม|mv'
      then 'entertainment'
    else null
  end
$$;

-- Life-stage cohorts. An explicit stated age is the strongest evidence, so it is
-- tested first; life-stage nouns come next; the bare junior self-reference หนู is
-- last and weakest because in Thai anyone may use it toward an elder, which is
-- why it stays its own bucket instead of being folded into the teen band.
create or replace function audience_cohort(src text)
returns text language sql immutable as $$
  select case
    when src is null then null
    when src ~ 'อายุ[ ]*1[3-9]' then 'teen'
    when src ~ 'อายุ[ ]*2[0-4]' then 'student-uni'
    when src ~ 'อายุ[ ]*(2[5-9]|3[0-9])' then 'working'
    when src ~ 'อายุ[ ]*4[0-9]' then 'parent'
    when src ~ 'อายุ[ ]*([5-9][0-9])' then 'senior'
    when src ~ 'ม\.[1-6]|มัธยม|ปิดเทอม|การบ้าน|เด็กมัธยม|ประถม|สอบเข้า' then 'teen'
    when src ~ 'มหาลัย|มหาวิทยาลัย|เฟรชชี่|ฝึกงาน|จบใหม่' then 'student-uni'
    when src ~ 'มนุษย์เงินเดือน|เงินเดือน|ออฟฟิศ|ที่ทำงาน|เจ้านาย|ลาพักร้อน' then 'working'
    when src ~ 'ลูกสาว|ลูกชาย|แม่บ้าน|สามี|เมีย|ผัว|ท้อง|คลอด' then 'parent'
    when src ~ 'ป้า|ยาย|หลาน|เกษียณ|วัยทอง|แก่แล้ว|อายุมาก|รุ่นแม่|คนแก่' then 'senior'
    when src ~ 'หนู' then 'junior-voice'
    else null
  end
$$;

-- ---------------------------------------------------------------- signals
-- Comment text is scored but never selected, so every downstream read stays a
-- small aggregate instead of shipping 25k comment bodies to the server.
drop view if exists v_signal_coverage;
drop view if exists v_territory_momentum;
drop view if exists v_cohort_series;
drop view if exists v_cohort_territory;
drop view if exists v_territory_demand;
drop view if exists v_territory_supply;
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
  audience_cohort(pc.text)  as cohort,
  market_territory(pc.text) as territory
from post_comments pc
join posts p on p.id = pc.post_id
left join content_categories cc on cc.id = p.category_id;

-- ---------------------------------------------------------------- demand
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

-- ---------------------------------------------------------------- supply
-- Same lexicon, applied to what the channel actually published. Titles carry
-- the subject; hashtags catch Shorts whose title is only a guest name.
create view v_territory_supply
with (security_invoker = true) as
select
  platform,
  coalesce(
    market_territory(
      coalesce(title, '') || ' ' ||
      left(coalesce(description, ''), 400) || ' ' ||
      coalesce(array_to_string(hashtags, ' '), '')
    ),
    'unclassified'
  ) as territory,
  count(*)                                    as post_count,
  coalesce(sum(views), 0)                     as total_views,
  coalesce(sum(likes), 0)                     as total_likes,
  coalesce(sum(comments), 0)                  as total_comments,
  coalesce(round(avg(views)), 0)              as avg_views,
  coalesce(round(avg(engagement_rate), 4), 0) as avg_engagement_rate
from v_post_latest_metrics
group by platform, 2;

-- ---------------------------------------------------------------- cohorts
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

-- ---------------------------------------------------------------- momentum
-- Comment year, not post year: it tracks when the audience raised a subject,
-- which is the demand question. Older posts keep collecting comments.
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

-- ---------------------------------------------------------------- coverage
-- The denominators the UI needs to report how thin the cohort read is.
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
