"use client";
import { useEffect, useRef, useState } from "react";
import type { Game } from "@/lib/supabase";
import type { Move } from "@/lib/games";
import { mancala, ownPits, STORE, type State } from "./mancala";

const STEP = 220; // ms per sown stone
const COLORS = ["#41a6f6", "#333c57", "#f4f4f4", "#38b764"];

/** Replays whichever legal move turns `from` into `to`, one stone per frame. Snaps when no move matches. */
function useSowing(pits: number[]) {
  const [shown, setShown] = useState(pits);
  const [hot, setHot] = useState(-1);
  const prev = useRef(pits);
  const key = pits.join(); // realtime echo of our optimistic move has equal values → no restart

  useEffect(() => {
    const from = prev.current;
    prev.current = pits;
    const i = from.findIndex((_, k) => mancala.move(from, k, k < 7 ? 0 : 1)?.pits.join() === key);
    if (i < 0) return setShown(pits);
    const cur = from.slice();
    cur[i] = 0;
    const frames: [number[], number][] = [[cur.slice(), i]];
    for (const j of mancala.path(from, i)) frames.push([(cur[j]++, cur.slice()), j]);
    frames.push([pits, -1]); // captures / end-of-game sweep land at once
    const timers = frames.map(([p, h], n) => setTimeout(() => (setShown(p), setHot(h)), n * STEP));
    return () => timers.forEach(clearTimeout);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { shown, busy: hot !== -1 };
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
  const { shown, busy } = useSowing(pits);
  const [aim, setAim] = useState(-1);
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
      <div className="mancala">
        <div className="wood" />
        <div className={`store${STORE[1 - s] === target ? " target" : ""}`} style={{ gridRow: 1 }}>{stones(STORE[1 - s], true)}</div>
        <b className="count" style={{ gridRow: 1, gridColumn: 4, alignSelf: "start" }}>{shown[STORE[1 - s]]}</b>
        {mine.map((i, r) => (
          <button
            key={i}
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
        {theirs.map((i, r) => <div key={i} className={cls(i)} style={{ gridRow: r + 2, gridColumn: 3 }}>{stones(i)}</div>)}
        {theirs.map((i, r) => <b key={i} className="count" style={{ gridRow: r + 2, gridColumn: 4 }}>{shown[i]}</b>)}
        <div className={`store${STORE[s] === target ? " target" : ""}`} style={{ gridRow: 8 }}>{stones(STORE[s], true)}</div>
        <b className="count own" style={{ gridRow: 8, gridColumn: 1, alignSelf: "end" }}>{shown[STORE[s]]}</b>
      </div>
      <p className="mancala-name own">{me}</p>
    </div>
  );
}
