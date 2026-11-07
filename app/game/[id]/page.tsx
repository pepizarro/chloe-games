"use client";
import { useParams } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase, type Game } from "@/lib/supabase";
import { usePlayer } from "@/lib/player";
import { GAMES, type GameType, type Move } from "@/lib/games";

export default function Room() {
  const { id } = useParams<{ id: string }>();
  const me = usePlayer()!;
  const [game, setGame] = useState<Game | null>(null);

  useEffect(() => {
    supabase.from("games").select().eq("id", id).single().then(({ data }) => setGame(data));
    const ch = supabase
      .channel(`game:${id}`)
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "games", filter: `id=eq.${id}` }, (p) =>
        setGame(p.new as Game),
      )
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, [id]);

  async function play(m: Move<unknown>) {
    if (!game) return;
    setGame({ ...game, ...m }); // optimistic
    // .eq("turn", me) makes a stale/double move a no-op
    const { data, error } = await supabase.from("games").update(m).eq("id", id).eq("turn", me).select().single();
    if (error || !data) {
      const { data: fresh } = await supabase.from("games").select().eq("id", id).single();
      setGame(fresh);
    }
  }

  if (!game) return <p>loading…</p>;
  const def = GAMES[game.type as GameType];
  if (!def) return <p>unknown game: {game.type}</p>;

  const status = game.winner
    ? game.winner === "draw" ? "draw!" : game.winner === me ? "you won!" : `${game.winner} won`
    : game.turn === me ? "your turn" : `waiting for ${game.turn}…`;

  return (
    <>
      <h1>{def.name}</h1>
      <p className="badge">{status}</p>
      <def.Board game={game as never} me={me} play={play} />
    </>
  );
}
