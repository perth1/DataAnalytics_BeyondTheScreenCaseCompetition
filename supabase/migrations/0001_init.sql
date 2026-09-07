-- Beyond The Screen : GoyNattyDream cross-platform analytics
-- Project: tmuhsweajzqkamhpsemx (ap-southeast-1)
-- Run in Supabase SQL Editor.

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- enums
do $$ begin
  create type platform as enum ('youtube','tiktok','facebook','instagram');
exception when duplicate_object then null; end $$;

do $$ begin
  create type post_format as enum ('long','short','reel','image','carousel','live','text');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sentiment as enum ('positive','neutral','negative','mixed');
exception when duplicate_object then null; end $$;

do $$ begin
  create type document_kind as enum ('gdoc','gsheet','gslide','link','pdf');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------- channels
create table if not exists channels (
  id            uuid primary key default gen_random_uuid(),
  platform      platform not null,
  handle        text not null,
  display_name  text not null,
  channel_url   text not null,
  external_id   text,
  followers     bigint,
  created_at    timestamptz not null default now(),
  unique (platform, handle)
);

-- ---------------------------------------------------------------- taxonomy
create table if not exists content_categories (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  description text,
  sort_order  int not null default 0
);

-- ---------------------------------------------------------------- posts
create table if not exists posts (
  id               uuid primary key default gen_random_uuid(),
  channel_id       uuid not null references channels(id) on delete cascade,
  platform         platform not null,
  external_id      text not null,
  url              text not null,
  title            text,
  description      text,
  thumbnail_url    text,
  published_at     timestamptz,
  duration_seconds int,
  format           post_format,
  category_id      uuid references content_categories(id) on delete set null,
  hashtags         text[],
  is_viral         boolean not null default false,
  raw              jsonb,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now(),
  unique (platform, external_id)
);

create index if not exists posts_platform_published_idx on posts (platform, published_at desc);
create index if not exists posts_category_idx on posts (category_id);
create index if not exists posts_viral_idx on posts (is_viral) where is_viral;

-- ---------------------------------------------------------------- metrics (time series)
create table if not exists post_metrics (
  id              uuid primary key default gen_random_uuid(),
  post_id         uuid not null references posts(id) on delete cascade,
  captured_at     timestamptz not null default now(),
  views           bigint,
  likes           bigint,
  comments        bigint,
  shares          bigint,
  saves           bigint,
  engagement_rate numeric(7,4),
  unique (post_id, captured_at)
);

create index if not exists post_metrics_post_idx on post_metrics (post_id, captured_at desc);

create table if not exists channel_metrics_daily (
  id          uuid primary key default gen_random_uuid(),
  channel_id  uuid not null references channels(id) on delete cascade,
  date        date not null,
  followers   bigint,
  views       bigint,
  likes       bigint,
  comments    bigint,
  shares      bigint,
  unique (channel_id, date)
);

-- ---------------------------------------------------------------- comments
create table if not exists post_comments (
  id           uuid primary key default gen_random_uuid(),
  post_id      uuid not null references posts(id) on delete cascade,
  external_id  text,
  author       text,
  text         text not null,
  like_count   int,
  published_at timestamptz,
  lang         text,
  sentiment    sentiment,
  raw          jsonb,
  unique (post_id, external_id)
);

create index if not exists post_comments_post_idx on post_comments (post_id, like_count desc);

create table if not exists comment_summaries (
  id                  uuid primary key default gen_random_uuid(),
  post_id             uuid not null references posts(id) on delete cascade,
  model               text not null,
  summary             text not null,
  themes              jsonb,
  sentiment_breakdown jsonb,
  audience_signals    text[],
  content_requests    text[],
  comment_count       int not null default 0,
  generated_at        timestamptz not null default now(),
  unique (post_id)
);

-- ---------------------------------------------------------------- documents
create table if not exists documents (
  id             uuid primary key default gen_random_uuid(),
  title          text not null,
  kind           document_kind not null,
  url            text not null,
  google_file_id text,
  description    text,
  tags           text[],
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

-- ---------------------------------------------------------------- plan
create table if not exists plan_boards (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  framework   text not null,
  description text,
  sort_order  int not null default 0,
  created_at  timestamptz not null default now()
);

create table if not exists plan_cards (
  id         uuid primary key default gen_random_uuid(),
  board_id   uuid not null references plan_boards(id) on delete cascade,
  column_key text not null,
  title      text not null,
  body       text,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists plan_cards_board_idx on plan_cards (board_id, column_key, sort_order);

-- ---------------------------------------------------------------- views
create or replace view v_post_latest_metrics
with (security_invoker = true) as
select
  p.*,
  c.slug as category_slug,
  c.name as category_name,
  m.views, m.likes, m.comments, m.shares, m.saves, m.engagement_rate,
  m.captured_at as metrics_captured_at
from posts p
left join content_categories c on c.id = p.category_id
left join lateral (
  select * from post_metrics pm
  where pm.post_id = p.id
  order by pm.captured_at desc
  limit 1
) m on true;

create or replace view v_category_performance
with (security_invoker = true) as
select
  platform,
  coalesce(category_slug, 'uncategorized') as category_slug,
  coalesce(category_name, 'Uncategorized') as category_name,
  count(*)                             as post_count,
  coalesce(sum(views), 0)              as total_views,
  coalesce(sum(likes), 0)              as total_likes,
  coalesce(sum(comments), 0)           as total_comments,
  coalesce(sum(shares), 0)             as total_shares,
  coalesce(round(avg(views)), 0)       as avg_views,
  coalesce(round(avg(engagement_rate), 4), 0) as avg_engagement_rate
from v_post_latest_metrics
group by platform, category_slug, category_name;

-- ---------------------------------------------------------------- RLS (public read, no auth)
alter table channels             enable row level security;
alter table content_categories   enable row level security;
alter table posts                enable row level security;
alter table post_metrics         enable row level security;
alter table channel_metrics_daily enable row level security;
alter table post_comments        enable row level security;
alter table comment_summaries    enable row level security;
alter table documents            enable row level security;
alter table plan_boards          enable row level security;
alter table plan_cards           enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'channels','content_categories','posts','post_metrics','channel_metrics_daily',
    'post_comments','comment_summaries','documents',
    'plan_boards','plan_cards'
  ] loop
    execute format('drop policy if exists anon_read on %I', t);
    execute format('create policy anon_read on %I for select to anon, authenticated using (true)', t);
  end loop;
end $$;

-- Plan and Documents are collaboratively edited without login.
do $$
declare t text;
begin
  foreach t in array array['plan_boards','plan_cards','documents'] loop
    execute format('drop policy if exists anon_write on %I', t);
    execute format('create policy anon_write on %I for all to anon, authenticated using (true) with check (true)', t);
  end loop;
end $$;
