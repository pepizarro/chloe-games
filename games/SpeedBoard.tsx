"use client";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import { supabase, type Game } from "@/lib/supabase";
import { img, speed, type State } from "./speed";
import css from "./speed.module.css";

const BACK = "/cards/back.png";

type Intent = (s: State) => State | null; // a move, replayable on whatever the freshest state turns out to be
const newer = (a: State, b: State | null) => (b && b.v > a.v ? b : a);

export function SpeedBoard({ game, me }: { game: Game<State>; me: string }) {
  const seat = game.players.indexOf(me), them = 1 - seat, themName = game.players[them] ?? "…";
  const server = game.state;
  // Three views of the game, newest `v` wins: the db row (slow: write -> WAL -> realtime), my own landed writes,
  // and the opponent's moves broadcast straight over the realtime socket before their write has even landed.
  const [acked, setAcked] = useState<State | null>(null);
  const [peer, setPeer] = useState<State | null>(null);
  const [pending, setPending] = useState<Intent[]>([]); // my moves not in the db yet, drawn on top
  const known = useRef(server); // newest state certain to be in the db; the only thing writes are built on
  const queue = useRef<Intent[]>([]), busy = useRef(false);
  const chan = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [sel, setSel] = useState<number | null>(null); // hand card waiting for a pile choice
  const [shake, setShake] = useState<number | null>(null);
  const [rules, setRules] = useState(false);
  const [drag, setDrag] = useState<{ card: number; dx: number; dy: number } | null>(null);
  const piles = useRef<(HTMLButtonElement | null)[]>([]);
  const start = useRef<{ x: number; y: number; moved: boolean } | null>(null);
  // ponytail: a pending reshuffle-flip is re-rolled here, so the side piles can blink once when the real one lands
  const s = useMemo(() => pending.reduce((st, f) => f(st) ?? st, newer(newer(server, acked), peer)), [server, acked, peer, pending]);
  const started = speed.started(s);
  const done = !!game.winner;

  // which centre piles are topped by a card the opponent just played (it was in their hand a moment ago; flips aren't)
  const [seen, setSeen] = useState({ s, theirs: [false, false] });
  if (seen.s !== s) {
    const top = (st: State, p: number) => st.center[p][st.center[p].length - 1];
    setSeen({ s, theirs: [0, 1].map((p) => (top(s, p) === top(seen.s, p) ? seen.theirs[p] : seen.s.hands[them].includes(top(s, p)))) });
  }
  const pileCls = (p: number) => `${css.big} ${seen.theirs[p] ? css.their : ""}`;

  const learn = (st: State) => setAcked((known.current = newer(known.current, st)));
  useEffect(() => { known.current = newer(known.current, server); }, [server]);

  useEffect(() => {
    const ch = supabase.channel(`speed:${game.id}`).on("broadcast", { event: "state" }, (m) => setPeer(m.payload as State)).subscribe();
    chan.current = ch;
    return () => void supabase.removeChannel(ch);
  }, [game.id]);

  /** Guarded on the db version it was built from. true = landed, false = someone else got there first, null = error. */
  async function write(next: State, base: number) {
    const w = speed.winner(next);
    const row = w === null ? { state: next } : { state: next, winner: game.players[w], turn: null };
    const { data, error } = await supabase.from("games").update(row).eq("id", game.id).eq("state->>v", String(base)).select("id");
    if (error) return console.error(error), null;
    return data.length > 0;
  }

  /** One write at a time, each built on a state that is really in the db, so the `v` guard can't be fooled by an optimistic one. */
  async function drain() {
    if (busy.current) return;
    busy.current = true;
    for (let f; (f = queue.current[0]); ) {
      for (let base = known.current, fresh = false; ; ) {
        const next = f(base);
        if (next) {
          chan.current?.send({ type: "broadcast", event: "state", payload: next }); // opponent sees it now, not after the db round trip
          const ok = await write(next, base.v);
          if (ok) learn(next);
          if (ok !== false) break;
        } else if (fresh) break; // not legal any more: they got to the pile first
        // built on something stale: get the real state and replay the move on it
        const { data } = await supabase.from("games").select("state").eq("id", game.id).single();
        if (!data) break;
        learn(data.state as State);
        base = known.current, fresh = true;
      }
      queue.current.shift();
      setPending([...queue.current]);
    }
    busy.current = false;
  }

  function act(f: Intent) {
    queue.current.push(f);
    setPending([...queue.current]);
    drain();
  }

  function playCard(card: number, pile: number) {
    setSel(null);
    if (speed.play(s, seat, card, pile)) act((f) => speed.play(f, seat, card, pile));
  }

  function tapHand(card: number) {
    if (done) return;
    const t = speed.targets(s, card);
    if (t.length === 0) return setShake(card);
    if (t.length === 1) return playCard(card, t[0]);
    setSel(sel === card ? null : card);
  }

  // drag a hand card onto a centre pile; a press that barely moves is a tap
  function down(e: PointerEvent<HTMLButtonElement>, card: number) {
    e.currentTarget.setPointerCapture(e.pointerId);
    start.current = { x: e.clientX, y: e.clientY, moved: false };
    setDrag({ card, dx: 0, dy: 0 });
  }
  function move(e: PointerEvent<HTMLButtonElement>) {
    const st = start.current;
    if (!st || !drag) return;
    const dx = e.clientX - st.x, dy = e.clientY - st.y;
    if (Math.hypot(dx, dy) > 6) st.moved = true;
    setDrag({ ...drag, dx, dy });
  }
  function up(e: PointerEvent<HTMLButtonElement>, card: number) {
    const moved = start.current?.moved;
    start.current = null;
    setDrag(null);
    if (!moved) return tapHand(card);
    const pile = piles.current.findIndex((el) => {
      const r = el?.getBoundingClientRect();
      return r && e.clientX >= r.left - 8 && e.clientX <= r.right + 8 && e.clientY >= r.top - 8 && e.clientY <= r.bottom + 8;
    });
    if (pile >= 0 && speed.canPlay(s, card, pile)) playCard(card, pile);
    else setShake(card);
  }
  const tapPile = (pile: number) => sel !== null && speed.canPlay(s, sel, pile) && playCard(sel, pile);
  const flip = () => !s.flip[seat] && act((f) => (f.flip[seat] ? null : speed.requestFlip(f, seat)));

  const setPile = (at: number) => (el: HTMLButtonElement | null) => void (piles.current[at] = el);

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
        <Pile cards={s.center[0]} up={started} cls={pileCls(0)} onClick={() => tapPile(0)} refEl={setPile(0)} />
        <Pile cards={s.center[1]} up={started} cls={pileCls(1)} onClick={() => tapPile(1)} refEl={setPile(1)} />
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
              className={`${css.hcard} ${sel === c ? css.sel : ""} ${shake === c ? css.shake : ""} ${drag?.card === c ? css.drag : ""}`}
              style={drag?.card === c ? { translate: `${drag.dx}px ${drag.dy}px` } : undefined}
              onPointerDown={(e) => down(e, c)}
              onPointerMove={move}
              onPointerUp={(e) => up(e, c)}
              onPointerCancel={() => (start.current = null, setDrag(null))}
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
            <button className="btn blue" onClick={() => act((f) => (f.ready[seat] ? null : speed.ready(f, seat)))}>
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

function Pile({ cards, up, cls, onClick, refEl }: { cards: number[]; up: boolean; cls?: string; onClick?: () => void; refEl?: (el: HTMLButtonElement | null) => void }) {
  const t = cards[cards.length - 1];
  return (
    <button ref={refEl} className={`${css.pile} ${cls ?? ""}`} onClick={onClick} disabled={!onClick}>
      {cards.length ? <img key={up ? t : cards.length} className={css.card} src={up ? img(t) : BACK} alt="" draggable={false} /> : <i className={css.empty} />}
      {cards.length > 1 && <b className={css.n}>{cards.length}</b>}
    </button>
  );
}
