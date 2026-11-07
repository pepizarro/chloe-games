"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase, type Game } from "@/lib/supabase";
import { other, usePlayer } from "@/lib/player";
import { GAMES, type GameType } from "@/lib/games";

export default function Lobby() {
  const me = usePlayer()!;
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);

  useEffect(() => {
    const load = () =>
      supabase.from("games").select().order("updated_at", { ascending: false }).then(({ data }) => setGames(data ?? []));
    load();
    const ch = supabase
      .channel("lobby")
      .on("postgres_changes", { event: "*", schema: "public", table: "games" }, load)
      .subscribe();
    return () => void supabase.removeChannel(ch);
  }, []);

  async function create(type: GameType) {
    const { data, error } = await supabase
      .from("games")
      .insert({ type, players: [me, other(me)], turn: me, state: GAMES[type].init() })
      .select()
      .single();
    if (error) return alert(error.message);
    router.push(`/game/${data.id}`);
  }

  const active = games.filter((g) => !g.winner);
  const done = games.filter((g) => g.winner);

  return (
    <>
      <h1>hi {me}</h1>
      <div className="row">
        {(Object.keys(GAMES) as GameType[]).map((t) => (
          <button key={t} className="px" onClick={() => create(t)}>+ new {GAMES[t].name}</button>
        ))}
      </div>

      <h2>playing</h2>
      <GameList games={active} me={me} />
      <h2>finished</h2>
      <GameList games={done} me={me} />
    </>
  );
}

function GameList({ games, me }: { games: Game[]; me: string }) {
  if (!games.length) return <p>nothing here</p>;
  return (
    <div className="list">
      {games.map((g) => (
        <Link key={g.id} href={`/game/${g.id}`} className="px">
          {GAMES[g.type as GameType]?.name ?? g.type} · {new Date(g.updated_at).toLocaleString()}
          <br />
          <span className="badge">
            {g.winner ? (g.winner === "draw" ? "draw" : `${g.winner} won`) : g.turn === me ? "▶ your turn" : `waiting for ${g.turn}`}
          </span>
        </Link>
      ))}
    </div>
  );
}
