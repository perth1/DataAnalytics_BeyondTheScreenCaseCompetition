-- posts gained theme_id, so p.* shifts column order; the view must be rebuilt.
drop view if exists v_category_performance;
drop view if exists v_theme_performance;
drop view if exists v_post_latest_metrics;

create view v_post_latest_metrics
with (security_invoker = true) as
select
  p.*,
  c.slug as category_slug,
  c.name as category_name,
  t.slug as theme_slug,
  t.name as theme_name,
  m.views, m.likes, m.comments, m.shares, m.saves, m.engagement_rate,
  m.captured_at as metrics_captured_at
from posts p
left join content_categories c on c.id = p.category_id
left join content_themes t on t.id = p.theme_id
left join lateral (
  select * from post_metrics pm
  where pm.post_id = p.id
  order by pm.captured_at desc
  limit 1
) m on true;

create view v_category_performance
with (security_invoker = true) as
select
  platform,
  coalesce(category_slug, 'uncategorized') as category_slug,
  coalesce(category_name, 'Uncategorized') as category_name,
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
  coalesce(theme_name, 'Unclassified') as theme_name,
  count(*)                                    as post_count,
  coalesce(sum(views), 0)                     as total_views,
  coalesce(sum(likes), 0)                     as total_likes,
  coalesce(sum(comments), 0)                  as total_comments,
  coalesce(sum(shares), 0)                    as total_shares,
  coalesce(round(avg(views)), 0)              as avg_views,
  coalesce(round(avg(engagement_rate), 4), 0) as avg_engagement_rate
from v_post_latest_metrics
group by platform, theme_slug, theme_name;
