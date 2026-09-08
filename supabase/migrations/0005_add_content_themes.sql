-- Two-dimensional content classification.
--   content_categories = the programme (series) a post belongs to
--   content_themes     = what the post is about
-- Shorts are cut-downs whose titles carry the theme, not the series, so both
-- dimensions are needed to answer "which content earns reach".
create table if not exists content_themes (
  id         uuid primary key default gen_random_uuid(),
  slug       text not null unique,
  name       text not null,
  sort_order int not null default 0
);

alter table posts add column if not exists theme_id uuid references content_themes(id) on delete set null;
create index if not exists posts_theme_idx on posts (theme_id);

alter table content_themes enable row level security;
drop policy if exists anon_read on content_themes;
create policy anon_read on content_themes for select to anon, authenticated using (true);

insert into content_themes (slug, name, sort_order) values
  ('love',      'Love & Relationships',   1),
  ('friends',   'Friendship',             2),
  ('life',      'Life & Perspective',     3),
  ('game',      'Game & Challenge',       4),
  ('travel',    'Travel',                 5),
  ('food',      'Food',                   6),
  ('music',     'Music & Artist',         7),
  ('celeb',     'Celebrity & Guest',      8),
  ('behind',    'Behind the Scenes',      9),
  ('lifestyle', 'Beauty & Lifestyle',    10),
  ('product',   'Product & Sponsored',   11),
  ('other',     'Other',                 99)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;
