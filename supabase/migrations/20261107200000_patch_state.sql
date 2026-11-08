-- Atomic nested patch of games.state, so two players writing different keys at once never clobber each other.
-- guard: only patch when state contains it (e.g. {"round": 2}), so a late write for an old round is a no-op.
create or replace function patch_state(game_id uuid, path text[], value jsonb, guard jsonb default '{}')
returns void language sql as $$
  update games set state = jsonb_set(state, path, value) where id = game_id and state @> guard;
$$;
