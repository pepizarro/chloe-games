"use client";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/supabase";
import type { Move } from "@/lib/games";
import { mancala, ownPits, STORE, type State } from "./mancala";

const LIFT = 420; // ms the hand hovers over the picked pit before moving
const STEP = 520; // ms per pit: travel, then drop one stone
const DROP = 0.6; // fraction of STEP at which the stone leaves the hand
const PAUSE = 450; // ms between chained moves (extra turns)
const COLORS = ["#41a6f6", "#333c57", "#f4f4f4", "#38b764"];

type Hand = { at: number; n: number } | null;

/** Moves by `side` (extra turns in between) that turn `from` into `to`, or null. Depth-limited DFS, 6 options a level. */
function findRun(from: number[], to: string, side: number, depth = 6): number[] | null {
  if (!depth) return null;
  for (const i of ownPits(side)) {
    const r = mancala.move(from, i, side);
    if (!r) continue;
    if (r.pits.join() === to) return [i];
    if (r.again) {
      const rest = findRun(r.pits, to, side, depth - 1);
      if (rest) return [i, ...rest];
    }
  }
  return null;
}

/** Replays whichever legal move turns `from` into `to`: lift the pile, carry it pit to pit, drop one stone each. Snaps when no move matches. */
function useSowing(pits: number[]) {
  const [shown, setShown] = useState(pits);
  const [hand, setHand] = useState<Hand>(null);
  const prev = useRef(pits);
  const key = pits.join(); // realtime echo of our optimistic move has equal values → no restart

  useEffect(() => {
    const from = prev.current;
    prev.current = pits;
    const run = findRun(from, key, 0) ?? findRun(from, key, 1);
    if (!run) return setShown(pits);
    const frames: [number, () => void][] = [];
    let t = 0, cur = from;
    for (const i of run) {
      const after = mancala.move(cur, i, i < 7 ? 0 : 1)!.pits;
      const c = cur.slice(), n = c[i];
      c[i] = 0;
      const lifted = c.slice();
      frames.push([t, () => (setShown(lifted), setHand({ at: i, n }))]);
      mancala.path(cur, i).forEach((j, k) => {
        frames.push([t + LIFT + k * STEP, () => setHand({ at: j, n: n - k })]);
        const snap = (c[j]++, c.slice());
        frames.push([t + LIFT + (k + DROP) * STEP, () => (setShown(snap), setHand({ at: j, n: n - k - 1 }))]);
      });
      t += LIFT + n * STEP;
      frames.push([t, () => (setShown(after), setHand({ at: -1, n: 0 }))]); // captures / sweep land at once; still busy
      t += PAUSE;
      cur = after;
    }
    frames.push([t - PAUSE, () => setHand(null)]);
    const timers = frames.map(([t, f]) => setTimeout(f, t));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { shown, hand, busy: hand !== null };
}

/** Sunflower layout: stone k keeps its spot as the pile grows; overflow stacks in offset layers. */
function spot(k: number, store: boolean) {
  const cap = store ? 26 : 12;
  const n = k % cap, layer = Math.floor(k / cap), a = n * 2.4, r = Math.sqrt(n + 0.5) * (store ? 6.4 : 9.5);
  return { left: `${50 + Math.cos(a) * r + layer * 4}%`, top: `${50 + Math.sin(a) * r - layer * 4}%` };
}

export function MancalaBoard({ game, me, play }: { game: Game<State>; me: string; play: (m: Move<State>) => void }) {
  const s = game.players.indexOf(me);
  const myTurn = game.turn === me && !game.winner;
  const { pits } = game.state;
  const { shown, hand, busy } = useSowing(pits);
  const [aim, setAim] = useState(-1);
  const board = useRef<HTMLDivElement>(null);
  const els = useRef<(HTMLElement | null)[]>([]);
  const ref = (i: number) => (el: HTMLElement | null) => void (els.current[i] = el);
  // hand centre over pit `i`, in board pixels; CSS transitions the slide
  const handPos = (i: number) => {
    const b = board.current?.getBoundingClientRect(), r = els.current[i]?.getBoundingClientRect();
    return b && r ? { left: r.left - b.left + r.width / 2, top: r.top - b.top + r.height / 2 } : undefined;
  };
  const target = aim < 0 || busy || !myTurn ? -1 : (mancala.path(pits, aim).at(-1) ?? -1);

  function sow(i: number) {
    const r = mancala.move(pits, i, s);
    if (!r) return;
    const w = mancala.winner(r.pits);
    setAim(-1);
    play({
      state: { pits: r.pits },
      winner: w === null ? null : w === "draw" ? "draw" : game.players[w],
      turn: w !== null ? null : r.again ? me : game.players[1 - s],
    });
  }

  // plain function, not a component: a component defined in render would remount (and re-animate) every stone
  const stones = (i: number, store = false) =>
    Array.from({ length: shown[i] }, (_, k) => (
      <i key={k} className="stone" style={{ ...spot(k, store), background: COLORS[(k * 5 + i * 3) % COLORS.length] }} />
    ));

  // vertical board, sowing runs counterclockwise: my pits down the left into my store (bottom), theirs up the right
  const mine = ownPits(s);
  const theirs = ownPits(1 - s).reverse();
  const cls = (i: number) => `pit${i === target ? " target" : ""}`;

  return (
    <div className="mancala-wrap">
      <p className="mancala-name">{game.players[1 - s] ?? "…"}</p>
      <div className="mancala" ref={board}>
        <div className="wood" />
        <div ref={ref(STORE[1 - s])} className={`store${STORE[1 - s] === target ? " target" : ""}`} style={{ gridRow: 1 }}>{stones(STORE[1 - s], true)}</div>
        <b className="count" style={{ gridRow: 1, gridColumn: 4, alignSelf: "start" }}>{shown[STORE[1 - s]]}</b>
        {mine.map((i, r) => (
          <button
            key={i}
            ref={ref(i)}
            className={cls(i)}
            style={{ gridRow: r + 2, gridColumn: 2 }}
            disabled={!myTurn || busy || pits[i] === 0}
            onClick={() => sow(i)}
            onPointerEnter={() => setAim(i)}
            onPointerLeave={() => setAim(-1)}
            onFocus={() => setAim(i)}
            onBlur={() => setAim(-1)}
            aria-label={`pit with ${shown[i]} stones`}
          >
            {stones(i)}
          </button>
        ))}
        {mine.map((i, r) => <b key={i} className="count own" style={{ gridRow: r + 2, gridColumn: 1 }}>{shown[i]}</b>)}
        {theirs.map((i, r) => <div key={i} ref={ref(i)} className={cls(i)} style={{ gridRow: r + 2, gridColumn: 3 }}>{stones(i)}</div>)}
        {theirs.map((i, r) => <b key={i} className="count" style={{ gridRow: r + 2, gridColumn: 4 }}>{shown[i]}</b>)}
        <div ref={ref(STORE[s])} className={`store${STORE[s] === target ? " target" : ""}`} style={{ gridRow: 8 }}>{stones(STORE[s], true)}</div>
        <b className="count own" style={{ gridRow: 8, gridColumn: 1, alignSelf: "end" }}>{shown[STORE[s]]}</b>
        {hand && hand.n > 0 && (
          <div className="hand" style={handPos(hand.at)}>
            {Array.from({ length: hand.n }, (_, k) => (
              <i key={k} className="stone" style={{ ...spot(k, false), background: COLORS[(k * 5 + hand.at * 3) % COLORS.length] }} />
            ))}
          </div>
        )}
      </div>
      <p className="mancala-name own">{me}</p>
    </div>
  );
}
