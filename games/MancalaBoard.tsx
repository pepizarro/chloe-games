"use client";
import type { Game } from "@/lib/supabase";
import type { Move } from "@/lib/games";
import { mancala, ownPits, STORE, type State } from "./mancala";

export function MancalaBoard({ game, me, play }: { game: Game<State>; me: string; play: (m: Move<State>) => void }) {
  const s = game.players.indexOf(me);
  const myTurn = game.turn === me && !game.winner;
  const { pits } = game.state;

  function sow(i: number) {
    const r = mancala.move(pits, i, s);
    if (!r) return;
    const w = mancala.winner(r.pits);
    play({
      state: { pits: r.pits },
      winner: w === null ? null : w === "draw" ? "draw" : game.players[w],
      turn: w !== null ? null : r.again ? me : game.players[1 - s],
    });
  }

  // my side on the bottom, left→right; opponent on top, mirrored so stones flow counterclockwise
  const mine = ownPits(s);
  const theirs = ownPits(1 - s).reverse();
  const Pit = ({ i, own }: { i: number; own: boolean }) => (
    <button className="pit" disabled={!myTurn || !own || pits[i] === 0} onClick={() => sow(i)}>
      {pits[i]}
    </button>
  );

  return (
    <div className="mancala">
      <div className="store">{pits[STORE[1 - s]]}</div>
      <div className="pits">
        {theirs.map((i) => <Pit key={i} i={i} own={false} />)}
        {mine.map((i) => <Pit key={i} i={i} own />)}
      </div>
      <div className="store">{pits[STORE[s]]}</div>
      <p className="row" style={{ gridColumn: "1 / -1", justifyContent: "space-between" }}>
        <span>{game.players[1 - s]}</span><span>{me}</span>
      </p>
    </div>
  );
}
