-- Run once in the Supabase SQL editor (or `supabase db reset` with this as a migration).
create table games (
  id uuid primary key default gen_random_uuid(),
  type text not null,                 -- game key, e.g. 'connect4'
  players text[] not null,            -- [first mover, second]
  turn text,                          -- whose move; null when finished
  winner text,                        -- player name, 'draw', or null while playing
  state jsonb not null,               -- game-specific
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function touch_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;
create trigger games_touch before update on games for each row execute function touch_updated_at();

-- ponytail: no auth, two trusted users. Anon key can do anything. Add real auth before opening this to strangers.
alter table games enable row level security;
create policy "anon all" on games for all to anon using (true) with check (true);

alter publication supabase_realtime add table games;
