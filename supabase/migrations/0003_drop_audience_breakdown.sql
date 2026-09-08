-- Audience demographics require YouTube Analytics API access, which is only
-- granted to the channel owner. Audience insight comes from comments instead.
drop table if exists audience_breakdown;
drop type if exists audience_dimension;
