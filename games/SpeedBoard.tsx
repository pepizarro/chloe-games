"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase, type Game } from "@/lib/supabase";
import { img, speed, type State } from "./speed";
import css from "./speed.module.css";

const BACK = "/cards/back.png";

export function SpeedBoard({ game, me }: { game: Game<State>; me: string }) {
  const seat = game.players.indexOf(me), them = 1 - seat, themName = game.players[them] ?? "…";
  const server = game.state;
  const [local, setLocal] = useState<State | null>(null); // optimistic copy, ahead of the server
  const [sel, setSel] = useState<number | null>(null); // hand card waiting for a pile choice
  const [shake, setShake] = useState<number | null>(null);
  const [rules, setRules] = useState(false);
  const s = local && local.v > server.v ? local : server;
  const started = speed.started(s);
  const done = !!game.winner;

  useEffect(() => { if (local && server.v >= local.v) setLocal(null); }, [server.v, local]);

  /** Write `next`, guarded on the version it was built from. Lost the race? Rebase once via `retry`. */
  async function commit(next: State, base: number, retry?: (fresh: State) => State | null) {
    setLocal(next);
    const w = speed.winner(next);
    const row = w === null ? { state: next } : { state: next, winner: game.players[w], turn: null };
    const { data, error } = await supabase.from("games").update(row).eq("id", game.id).eq("state->>v", String(base)).select("id");
    if (error) console.error(error);
    if (data?.length) return;
    setLocal(null);
    if (!retry) return;
    const { data: fresh } = await supabase.from("games").select("state").eq("id", game.id).single();
    const again = fresh && retry(fresh.state as State);
    if (again) commit(again, (fresh.state as State).v);
  }

  function playCard(card: number, pile: number) {
    setSel(null);
    const next = speed.play(s, seat, card, pile);
    if (next) commit(next, s.v, (f) => speed.play(f, seat, card, pile));
  }

  function tapHand(card: number) {
    if (done) return;
    const t = speed.targets(s, card);
    if (t.length === 0) return setShake(card);
    if (t.length === 1) return playCard(card, t[0]);
    setSel(sel === card ? null : card);
  }

  const tapPile = (pile: number) => sel !== null && speed.canPlay(s, sel, pile) && playCard(sel, pile);
  const flip = () => !s.flip[seat] && commit(speed.requestFlip(s, seat), s.v, (f) => speed.requestFlip(f, seat));

  const pileCls = (p: number) => `${css.pile} ${sel !== null && speed.canPlay(s, sel, p) ? css.hot : ""}`;
  const Pile = ({ cards, up, cls, onClick }: { cards: number[]; up: boolean; cls?: string; onClick?: () => void }) => (
    <button className={cls ?? css.pile} onClick={onClick} disabled={!onClick}>
      {cards.length ? <img key={up ? cards[cards.length - 1] : cards.length} className={css.card} src={up ? img(cards[cards.length - 1]) : BACK} alt="" draggable={false} /> : <i className={css.empty} />}
      {cards.length > 1 && <b className={css.n}>{cards.length}</b>}
    </button>
  );

  return (
    <div className={css.screen}>
      <header className={css.hud}>
        <Link href="/" className="btn red">◂</Link>
        <b>speed</b>
        <span>{themName}: {s.hands[them].length + s.draws[them].length} · you: {s.hands[seat].length + s.draws[seat].length}</span>
        <button className="btn gold" onClick={() => setRules(true)} aria-label="rules">?</button>
      </header>

      <div className={css.opp}>
        <Pile cards={s.draws[them]} up={false} />
        <div className={css.fan}>
          {s.hands[them].map((c, i) => <img key={c} className={css.card} src={BACK} alt="" draggable={false} style={{ zIndex: i }} />)}
        </div>
      </div>

      <div className={css.table}>
        <Pile cards={s.side[0]} up={false} />
        <Pile cards={s.center[0]} up={started} cls={pileCls(0)} onClick={() => tapPile(0)} />
        <Pile cards={s.center[1]} up={started} cls={pileCls(1)} onClick={() => tapPile(1)} />
        <Pile cards={s.side[1]} up={false} />
      </div>
      {started && !done && (
        <div className={css.flipRow}>
          <button className={`btn ${s.flip[seat] ? "dim" : s.flip[them] ? "orange" : "blue"} ${s.flip[them] && !s.flip[seat] ? css.urge : ""}`} onClick={flip}>
            {s.flip[seat] ? `waiting for ${themName}…` : s.flip[them] ? `${themName} wants to flip!` : "flip"}
          </button>
        </div>
      )}

      <div className={css.mine}>
        <div className={css.hand}>
          {s.hands[seat].map((c) => (
            <button
              key={c}
              className={`${css.hcard} ${sel === c ? css.sel : ""} ${shake === c ? css.shake : ""}`}
              onClick={() => tapHand(c)}
              onAnimationEnd={() => shake === c && setShake(null)}
              disabled={!started || done}
            >
              <img className={css.card} src={img(c)} alt="" draggable={false} />
            </button>
          ))}
        </div>
        <Pile cards={s.draws[seat]} up={false} />
      </div>

      {!started && !done && (
        <div className={css.sheet}>
          <p>both of you have to be in.</p>
          {s.ready[seat] ? (
            <p className="tag dim">waiting for {themName}…</p>
          ) : (
            <button className="btn blue" onClick={() => commit(speed.ready(s, seat), s.v, (f) => speed.ready(f, seat))}>
              {s.ready[them] ? `${themName} is ready. go?` : "i'm ready"}
            </button>
          )}
        </div>
      )}
      {done && (
        <div className={css.sheet}>
          <div className="plaque">{game.winner === me ? "speed! you won" : `${game.winner} won`}</div>
          <Link href="/" className="btn gold">lobby</Link>
        </div>
      )}
      {rules && (
        <div className={css.sheet} onClick={() => setRules(false)}>
          <b>how to play</b>
          <ul className={css.rules}>
            <li>both tap ready. the two centre cards turn over.</li>
            <li>tap a hand card to put it on a centre pile whose top is one higher or lower. ace and king touch.</li>
            <li>if both piles take it, tap the card then the pile.</li>
            <li>your hand refills to 5 from your draw pile.</li>
            <li>stuck? tap flip. once you both have, a side card lands on each pile.</li>
            <li>side piles empty? the centre gets shuffled into new ones.</li>
            <li>first with no cards left wins. no turns, just speed.</li>
          </ul>
          <button className="btn gold">got it</button>
        </div>
      )}
    </div>
  );
}
