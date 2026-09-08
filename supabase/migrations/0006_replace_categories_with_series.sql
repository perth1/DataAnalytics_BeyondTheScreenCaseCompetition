-- The generic topic taxonomy did not fit this channel: it programs by series.
-- Evidence from 2,367 titles: ถ้าหนูรับ พี่จะรักป่ะ (185), ยังไงไหนเล่า (173),
-- Friendsfly (142), My Ambulove (127), CarราCarซัง (73).
insert into content_categories (slug, name, sort_order) values
  ('tha-nu-rap',        'ถ้าหนูรับ พี่จะรักป่ะ',            1),
  ('yangngai-nailao',   'ยังไงไหนเล่า',                    2),
  ('friendsfly',        'Friendsfly',                      3),
  ('carra-carsang',     'CarราCarซัง',                     4),
  ('my-ambulove',       'My Ambulove',                     5),
  ('last-supper',       'มื้อสุดท้ายก่อนตาย / Last Supper',  6),
  ('ploy-ku-pai',       'ปล่อยกูไป',                        7),
  ('lamdap-watjai',     'ลำดับวัดใจ',                       8),
  ('dream-mao',         'ดรีมเมา',                          9),
  ('khuenton-longthai', 'ขึ้นต้นลงท้าย',                   10),
  ('this-or-that',      'This or That',                    11),
  ('music',             'Music / MV',                      12),
  ('game',              'Game & Challenge',                20),
  ('travel',            'Travel',                          21),
  ('food',              'Food',                            22),
  ('talk',              'Talk & Interview',                23),
  ('sponsored',         'Sponsored / Tie-in',              24),
  ('other',             'Other',                           99)
on conflict (slug) do update
  set name = excluded.name, sort_order = excluded.sort_order;

-- Buckets from the old taxonomy that the new one does not use.
delete from content_categories
where slug in ('vlog','beauty','review','challenge','family');
