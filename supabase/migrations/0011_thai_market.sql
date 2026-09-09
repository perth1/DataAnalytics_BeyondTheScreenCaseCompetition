-- Thai audience market: which content does each age group in Thailand watch.
--
-- WHY THIS IS A SEPARATE CORPUS FROM posts/post_comments
-- 0008 answered the market question from GoyNattyDream's own comments, so every
-- number it produced was a fact about this channel's existing audience. That
-- cannot answer "what does the Thai market want" — the sample is the people we
-- already reach. These tables hold videos and comments from thousands of OTHER
-- Thai channels, discovered from YouTube's Thailand trending charts and from
-- Thai-language topic searches, and they are kept apart from posts/ so channel
-- analytics stay uncontaminated by market panel data.
--
-- HOW A ROW BECOMES EVIDENCE
--   interest ← market_videos.category_id, YouTube's own category for the video,
--              plus market_videos.theme, a topic read off the uploader's title,
--              description and tags. Neither is inferred from comment text.
--   age      ← market_comments.cohort, set only when the commenter stated their
--              own age or self-identified a life stage. lib/cohort.ts resolves
--              whose age a number refers to, so "สามีอายุ 65" is not counted.
--
-- Classification is done in TypeScript at ingest, not in SQL, because the
-- referent logic is the part that needs tuning and it has to be re-runnable
-- over a cached corpus without a database round trip.

-- ---------------------------------------------------------------- channels
create table if not exists market_channels (
  channel_id   text primary key,
  title        text not null,
  description  text,
  country      text,
  subscribers  bigint,
  total_views  bigint,
  video_count  bigint,
  fetched_at   timestamptz not null default now()
);

-- ---------------------------------------------------------------- videos
create table if not exists market_videos (
  video_id         text primary key,
  channel_id       text not null,
  channel_title    text,
  title            text not null,
  description      text,
  category_id      int,
  theme            text,
  published_at     timestamptz,
  duration_seconds int,
  format           text,
  views            bigint,
  likes            bigint,
  comments         bigint,
  tags             text[],
  -- How this video entered the corpus. 'trending' rows are a census of what
  -- Thailand watched on the fetch date; 'search' rows are a deliberately
  -- interest-balanced top-up, because trending alone is dominated by music.
  discovered_via   text not null,
  discovery_query  text,
  fetched_at       timestamptz not null default now()
);

create index if not exists market_videos_category_idx on market_videos (category_id);
create index if not exists market_videos_theme_idx    on market_videos (theme);
create index if not exists market_videos_channel_idx  on market_videos (channel_id);

-- ---------------------------------------------------------------- comments
-- Comment text is stored so the classifier can be re-run and so the UI can
-- quote the evidence behind a cohort read. Every reader-facing cohort number
-- traces back to specific comments here.
create table if not exists market_comments (
  comment_id   text primary key,
  video_id     text not null references market_videos (video_id) on delete cascade,
  text         text not null,
  like_count   int,
  published_at timestamptz,
  -- Classifier output. null cohort means the comment said nothing about the
  -- commenter's own age, which is the overwhelming majority.
  cohort       text,
  evidence     text,
  stated_age   int,
  claims_parent boolean not null default false,
  fetched_at   timestamptz not null default now()
);

create index if not exists market_comments_video_idx  on market_comments (video_id);
create index if not exists market_comments_cohort_idx on market_comments (cohort)
  where cohort is not null;

-- ---------------------------------------------------------------- rls
alter table market_channels enable row level security;
alter table market_videos   enable row level security;
alter table market_comments enable row level security;

do $$
declare t text;
begin
  foreach t in array array['market_channels','market_videos','market_comments'] loop
    execute format('drop policy if exists anon_read on %I', t);
    execute format('create policy anon_read on %I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- ---------------------------------------------------------------- signals
drop view if exists v_market_cohort_format;
drop view if exists v_market_cohort_videos;
drop view if exists v_market_cohort_theme;
drop view if exists v_market_cohort_category;
drop view if exists v_market_cohort_totals;
drop view if exists v_market_theme_scale;
drop view if exists v_market_category_scale;
drop view if exists v_market_channel_reach;
drop view if exists v_market_coverage;
drop view if exists v_market_signals;

-- One row per age-identified comment, carrying the content facts of the video
-- it was left on. This is the join that answers the question; everything below
-- is an aggregate of it.
create view v_market_signals
with (security_invoker = true) as
select
  c.comment_id,
  c.video_id,
  c.cohort,
  c.evidence,
  c.stated_age,
  c.claims_parent,
  c.like_count,
  c.published_at as commented_at,
  v.category_id,
  v.theme,
  v.format,
  v.channel_id,
  v.channel_title,
  v.title as video_title,
  v.views as video_views,
  v.discovered_via
from market_comments c
join market_videos v on v.video_id = c.video_id
where c.cohort is not null;

-- ---------------------------------------------------------------- coverage
-- The denominators the page has to print. A cohort read this thin is only
-- honest if the reader can see how thin it is.
create view v_market_coverage
with (security_invoker = true) as
select
  (select count(*) from market_videos)                             as videos,
  (select count(distinct channel_id) from market_videos)           as channels,
  (select count(*) from market_comments)                           as comments,
  (select count(*) from market_comments where cohort is not null)   as cohort_signals,
  (select count(*) from market_comments where evidence = 'stated-age') as stated_age_signals,
  (select count(*) from market_comments where evidence = 'life-stage') as life_stage_signals,
  (select count(*) from market_comments where claims_parent)       as parent_signals,
  (select coalesce(sum(views), 0) from market_videos)              as corpus_views,
  (select min(published_at) from market_videos)                    as earliest_video,
  (select max(published_at) from market_videos)                    as latest_video,
  (select max(fetched_at) from market_videos)                      as fetched_at;

-- ---------------------------------------------------------------- market scale
-- What the Thai market publishes and watches, by category. This side needs no
-- comments at all, so it is the broadest and most reliable read on the page.
create view v_market_category_scale
with (security_invoker = true) as
select
  category_id,
  count(*)                                as videos,
  count(distinct channel_id)              as channels,
  coalesce(sum(views), 0)                 as total_views,
  coalesce(round(avg(views)), 0)          as avg_views,
  coalesce(round(percentile_cont(0.5) within group (order by views)), 0) as median_views,
  coalesce(sum(likes), 0)                 as total_likes,
  coalesce(sum(comments), 0)              as total_comments,
  count(*) filter (where format = 'short') as shorts,
  count(*) filter (where format = 'long')  as longs
from market_videos
group by category_id;

create view v_market_theme_scale
with (security_invoker = true) as
select
  theme,
  count(*)                                as videos,
  count(distinct channel_id)              as channels,
  coalesce(sum(views), 0)                 as total_views,
  coalesce(round(avg(views)), 0)          as avg_views,
  count(*) filter (where format = 'short') as shorts,
  count(*) filter (where format = 'long')  as longs
from market_videos
group by theme;

-- Who the market's reach actually belongs to. Answers "who is big in Thailand"
-- without reference to our own channel.
create view v_market_channel_reach
with (security_invoker = true) as
select
  v.channel_id,
  coalesce(max(c.title), max(v.channel_title)) as channel_title,
  max(c.subscribers)                           as subscribers,
  max(c.country)                               as country,
  count(*)                                     as videos_in_corpus,
  coalesce(sum(v.views), 0)                    as corpus_views,
  coalesce(round(avg(v.views)), 0)             as avg_views,
  mode() within group (order by v.category_id)  as main_category
from market_videos v
left join market_channels c on c.channel_id = v.channel_id
group by v.channel_id;

-- ---------------------------------------------------------------- cohorts
create view v_market_cohort_totals
with (security_invoker = true) as
select
  cohort,
  count(*)                                        as signals,
  count(*) filter (where evidence = 'stated-age') as stated_age_signals,
  count(*) filter (where claims_parent)           as parent_signals,
  round(avg(stated_age), 1)                       as avg_stated_age,
  count(distinct video_id)                        as videos_touched,
  count(distinct channel_id)                      as channels_touched
from v_market_signals
group by cohort;

create view v_market_cohort_category
with (security_invoker = true) as
select
  cohort,
  category_id,
  count(*)                 as signals,
  count(distinct video_id) as videos,
  sum(like_count)          as signal_likes
from v_market_signals
group by cohort, category_id;

create view v_market_cohort_theme
with (security_invoker = true) as
select
  cohort,
  theme,
  count(*)                 as signals,
  count(distinct video_id) as videos
from v_market_signals
group by cohort, theme;

-- Shorts against long-form, by age. Format preference is the one behavioural
-- split that needs no lexicon: duration is a fact about the video.
create view v_market_cohort_format
with (security_invoker = true) as
select
  cohort,
  format,
  count(*) as signals
from v_market_signals
where format is not null
group by cohort, format;

-- The specific videos behind each cohort's read, so a claim on the page can be
-- traced to the content it came from.
create view v_market_cohort_videos
with (security_invoker = true) as
select
  cohort,
  video_id,
  max(video_title)   as video_title,
  max(channel_title) as channel_title,
  max(category_id)   as category_id,
  max(theme)         as theme,
  max(video_views)   as views,
  count(*)           as cohort_signals
from v_market_signals
group by cohort, video_id;
