-- only one unfinished game per type; drop older duplicates first
delete from games g where winner is null
  and exists (select 1 from games h where h.type = g.type and h.winner is null and h.created_at > g.created_at);
create unique index one_active_per_type on games (type) where winner is null;
