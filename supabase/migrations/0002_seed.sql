-- Seed channels, content taxonomy, and the Plan frameworks.

alter table plan_boards drop constraint if exists plan_boards_framework_key;
alter table plan_boards add constraint plan_boards_framework_key unique (framework);

insert into channels (platform, handle, display_name, channel_url, external_id) values
  ('youtube',   'GoyNattyDream',            'GoyNattyDream',          'https://www.youtube.com/channel/UCT2G8BGZgubYAOYrFO9NSAg', 'UCT2G8BGZgubYAOYrFO9NSAg'),
  ('tiktok',    'goynattydreamchannel',     'GoyNattyDream',          'https://www.tiktok.com/@goynattydreamchannel',             null),
  ('instagram', 'goynattydreamofficial',    'GoyNattyDream Official', 'https://www.instagram.com/goynattydreamofficial/',         null),
  ('facebook',  'goynattydream',            'GoyNattyDream',          'https://www.facebook.com/goynattydream/',                  null)
on conflict (platform, handle) do update
  set display_name = excluded.display_name,
      channel_url  = excluded.channel_url,
      external_id  = excluded.external_id;

insert into content_categories (slug, name, sort_order) values
  ('vlog',      'Vlog / Daily Life',   1),
  ('travel',    'Travel',              2),
  ('food',      'Food & Mukbang',      3),
  ('beauty',    'Beauty & Fashion',    4),
  ('review',    'Product Review',      5),
  ('challenge', 'Challenge / Game',    6),
  ('talk',      'Talk / Q&A',          7),
  ('family',    'Family & Friends',    8),
  ('sponsored', 'Sponsored / Tie-in',  9),
  ('other',     'Other',              99)
on conflict (slug) do update set name = excluded.name, sort_order = excluded.sort_order;

insert into plan_boards (title, framework, description, sort_order) values
  ('Situation Analysis',  'swot',           'Strengths, Weaknesses, Opportunities, Threats',              1),
  ('3C Analysis',         '3c',             'Company, Customer, Competitor',                              2),
  ('Audience & Insight',  'insight',        'Who they are, what they want, what they say',                3),
  ('Content Pillars',     'content-pillar', 'Pillar, format, platform fit, cadence',                      4),
  ('Strategy Flow',       'strategy-flow',  'Problem to Insight to Strategy to Execution to KPI',         5)
on conflict (framework) do update
  set title = excluded.title, description = excluded.description, sort_order = excluded.sort_order;
