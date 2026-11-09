-- games to remember playing elsewhere; just a list with optional links
create table external_games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  url text,
  created_at timestamptz not null default now()
);
alter table external_games enable row level security;
create policy "anon all" on external_games for all to anon using (true) with check (true);
insert into external_games (name, url) values
  ('linkedin games', 'https://www.linkedin.com/games/'),
  ('minutecryptic', 'https://www.minutecryptic.com'),
  ('krillion', null),
  ('farflung', null),
  ('globle', 'https://globle-game.com');
