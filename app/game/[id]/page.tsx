"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase, type Game } from "@/lib/supabase";
import { other, usePlayer } from "@/lib/player";
import { notify } from "@/lib/push";
import { GAMES, type GameType, type Move } from "@/lib/games";
import { useCelebrate } from "@/components/Celebrate";

const REPLAY_DELAY = 900; // ms the board sits at the pre-move state before the opponent's move animates in

export default function Room() {
  const { id } = useParams<{ id: string }>();
  const me = usePlayer()!;
  const [game, setGame] = useState<Game | null>(null);
  useCelebrate(game?.winner, me);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    supabase.from("games").select().eq("id", id).single().then(({ data }) => {
      if (!data) return setGame(null);
      if (data.prev && data.last_by && data.last_by !== me) {
        // show the board as it was before their move, then let the board's own diff animation play it
        setGame({ ...data, state: data.prev, turn: data.last_by, winner: null });
        timer = setTimeout(() => setGame(data), REPLAY_DELAY);
      } else setGame(data);
    });
    const ch = supabase
      .channel(`game:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${id}` }, (p) =>
        setGame(p.new as Game),
      )
      .subscribe();
    return () => (clearTimeout(timer), void supabase.removeChannel(ch));
  }, [id, me]);

  async function play(m: Move<unknown>) {
    if (!game) return;
    // chained moves (mancala extra turns) keep the state from before the first one, so the opponent sees the whole run
    const row = { ...m, prev: game.last_by === me && game.prev ? game.prev : game.state, last_by: me };
    setGame({ ...game, ...row }); // optimistic
    // .eq("turn", me) makes a stale/double move a no-op
    const { data, error } = await supabase.from("games").update(row).eq("id", id).eq("turn", me).select().single();
    if (error || !data) {
      const { data: fresh } = await supabase.from("games").select().eq("id", id).single();
      return setGame(fresh);
    }
    const name = GAMES[game.type as GameType].name;
    if (data.winner) notify(other(me), name, data.winner === "draw" ? "it's a draw" : data.winner === me ? `${me} won, rematch?` : "you won!", `/game/${id}`);
    else if (data.turn !== me) notify(other(me), name, `${me} played, your turn`, `/game/${id}`); // not on a mancala extra turn
  }

  if (!game) return <p className="panel">shuffling…</p>;
  const def = GAMES[game.type as GameType];
  if (!def) return <p className="panel">unknown game: {game.type}</p>;

  const [status, tone] = game.winner
    ? game.winner === "draw" ? ["draw!", "gold"] : game.winner === me ? ["you won!", "gold"] : [`${game.winner} won`, "red"]
    : game.turn === me ? ["your turn", "blue"] : [`waiting for ${game.turn}…`, "dim"];

  return (
    <>
      <div className="plaque">{def.name}</div>
      <div key={status} className={`status ${tone}`}>{status}</div>
      <def.Board game={game as never} me={me} play={play} />
    </>
  );
}
