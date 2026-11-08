"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase, type Game } from "@/lib/supabase";
import { other, usePlayer } from "@/lib/player";
import { GAMES, type GameType } from "@/lib/games";
import { Icon, PLAYER_ICON } from "@/components/Icon";
import { pushSupported, subscribePush } from "@/lib/push";


export default function Lobby() {
  const me = usePlayer()!;
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [bell, setBell] = useState(false); // show "notify me" button

  useEffect(() => {
    if (!pushSupported()) return;
    // already granted: refresh the subscription silently (endpoints rotate); otherwise offer the button
    if (Notification.permission === "granted") subscribePush(me);
    else if (Notification.permission === "default") setBell(true);
  }, [me]);

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

  const done = games.filter((g) => g.winner);
  const glyph = (t: string) => <Icon name={t} />;

  return (
    <>
      <div className="plaque">hi {me}</div>
      {bell && (
        <button className="btn gold" onClick={() => subscribePush(me).then((ok) => setBell(!ok))}>
          🔔 tell me when it&apos;s my turn
        </button>
      )}
      <div className="list">
        {(Object.keys(GAMES) as GameType[]).map((t) => {
          const g = games.find((x) => x.type === t && !x.winner);
          if (!g)
            return (
              <button key={t} className="card panel" onClick={() => create(t)}>
                {glyph(t)}
                <span>{GAMES[t].name}<small>deal a new one</small></span>
                <b className="tag blue">+ new</b>
              </button>
            );
          const mine = g.turn === me;
          return (
            <Link key={t} href={`/game/${g.id}`} className={`card panel ${mine ? "live" : "waiting"}`}>
              {glyph(t)}
              <span>{GAMES[t].name}<small>{!mine ? `waiting for ${g.turn}` : g.last_by && g.last_by !== me ? "they played, go!" : "your move"}</small></span>
              <b className={`tag ${mine ? "blue" : "dim"}`}>{mine ? "your turn" : "…"}</b>
            </Link>
          );
        })}
      </div>

      {done.length > 0 && (
        <>
          <h2>finished</h2>
          <div className="list">
            {done.map((g) => (
              <Link key={g.id} href={`/game/${g.id}`} className="card panel waiting">
                {glyph(g.type)}
                <span>{GAMES[g.type as GameType]?.name ?? g.type}</span>
                <b className={`tag won ${g.winner === me ? "gold" : "dim"}`}>
                  {g.winner === "draw" ? "draw" : <><Icon name={PLAYER_ICON[g.winner!]} /> won</>}
                </b>
              </Link>
            ))}
          </div>
        </>
      )}
    </>
  );
}
