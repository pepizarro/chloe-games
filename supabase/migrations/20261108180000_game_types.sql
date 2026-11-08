-- feature flags: which game types the lobby offers
create table game_types (
  type text primary key,
  enabled boolean not null default false
);
alter table game_types enable row level security;
create policy "anon read" on game_types for select to anon using (true);
insert into game_types (type, enabled) values ('connect4', true), ('mancala', true), ('waldo', false);
