create table push_subs (
  endpoint text primary key,
  player text not null,
  sub jsonb not null,
  created_at timestamptz not null default now()
);
alter table push_subs enable row level security;
create policy "anon all" on push_subs for all to anon using (true) with check (true);
