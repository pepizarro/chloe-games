"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase, type Game } from "@/lib/supabase";
import { other, usePlayer } from "@/lib/player";
import { GAMES, type GameType } from "@/lib/games";
import { Icon, PLAYER_ICON } from "@/components/Icon";
import { hasPush, pushSupported, subscribePush, unsubscribePush } from "@/lib/push";


export default function Lobby() {
  const me = usePlayer()!;
  const router = useRouter();
  const [games, setGames] = useState<Game[]>([]);
  const [enabled, setEnabled] = useState<GameType[]>([]); // toggled in the game_types table
  const [ext, setExt] = useState<{ id: string; name: string; url: string | null }[]>([]); // games to play elsewhere
  const [newName, setNewName] = useState("");
  const [newUrl, setNewUrl] = useState("");
  const loadExt = () => supabase.from("external_games").select("id, name, url").order("created_at").then(({ data }) => setExt(data ?? []));
  const [bell, setBell] = useState<boolean | null>(null); // null = unsupported / not checked yet

  useEffect(() => {
    if (!pushSupported()) return;
    // if subscribed, refresh the row silently (endpoints rotate)
    hasPush().then((on) => (setBell(on), on && subscribePush(me)));
  }, [me]);

  const toggleBell = async () => {
    if (bell) await unsubscribePush();
    setBell(bell ? false : await subscribePush(me));
  };

  useEffect(() => {
    supabase.from("game_types").select("type").eq("enabled", true)
      .then(({ data }) => setEnabled((data ?? []).map((r) => r.type).filter((t): t is GameType => t in GAMES)));
    loadExt();
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

  async function addExt(e: React.FormEvent) {
    e.preventDefault();
    const name = newName.trim();
    if (!name) return;
    const url = newUrl.trim() ? (/^https?:\/\//.test(newUrl.trim()) ? newUrl.trim() : `https://${newUrl.trim()}`) : null;
    await supabase.from("external_games").insert({ name, url });
    setNewName(""); setNewUrl("");
    loadExt();
  }
  const delExt = (id: string) => supabase.from("external_games").delete().eq("id", id).then(loadExt);

  const done = games.filter((g) => g.winner);
  const glyph = (t: string) => <Icon name={t} />;

  return (
    <>
      <div className="row" style={{ margin: "8px 0 16px" }}>
        <div className="plaque" style={{ flex: 1, margin: 0 }}>hi {me}</div>
        {bell !== null && (
          <button className={`btn bell ${bell ? "gold" : "dim"}`} onClick={toggleBell} aria-label={`notifications ${bell ? "on" : "off"}`}>
            <Icon name={bell ? "bell" : "bell-off"} />
          </button>
        )}
      </div>
      <div className="list">
        {enabled.map((t) => {
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

      <h2>elsewhere</h2>
      <div className="list">
        {ext.map((g) => (
          <div key={g.id} className="card panel ext">
            {g.url ? <a href={g.url} target="_blank" rel="noreferrer">{g.name} ↗</a> : <span>{g.name}</span>}
            <button className="btn dim tag" onClick={() => delExt(g.id)} aria-label={`remove ${g.name}`}>✕</button>
          </div>
        ))}
        <form className="card panel ext add" onSubmit={addExt}>
          <input className="input" placeholder="game" value={newName} onChange={(e) => setNewName(e.target.value)} required />
          <input className="input" placeholder="link (optional)" value={newUrl} onChange={(e) => setNewUrl(e.target.value)} inputMode="url" />
          <button className="btn blue tag" type="submit">+ add</button>
        </form>
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
