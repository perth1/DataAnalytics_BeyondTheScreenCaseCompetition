-- Plan boards and the document registry are edited by several people at once
-- without login, so push changes to every open tab.
alter publication supabase_realtime add table plan_cards;
alter publication supabase_realtime add table plan_boards;
alter publication supabase_realtime add table documents;

-- REPLICA IDENTITY FULL so DELETE events carry the row, not just the key.
alter table plan_cards  replica identity full;
alter table plan_boards replica identity full;
alter table documents   replica identity full;
