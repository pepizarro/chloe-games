"use client";
import { useRef, useState, type CSSProperties, type PointerEvent } from "react";
import type { Game } from "@/lib/supabase";
import type { Move } from "@/lib/games";
import { connect4, COLS, type State } from "./connect4";

export function Connect4Board({ game, me, play }: { game: Game<State>; me: string; play: (m: Move<State>) => void }) {
  const myTurn = game.turn === me && !game.winner;
  const { board } = game.state;
  const [col, setCol] = useState<number | null>(null);
  const held = useRef(false);
  const mine = `p${game.players.indexOf(me)}`;
  const aim = myTurn ? col : null;
  const land = aim === null ? -1 : connect4.landing(board, aim);

  function drop(c: number) {
    const next = connect4.drop(board, c, me);
    if (!next) return;
    const winner = connect4.winner(next);
    setCol(null);
    play({ state: { board: next }, winner, turn: winner ? null : game.players.find((p) => p !== me)! });
  }

  /** Column under the pointer, or null when outside the board (release there = cancel). */
  function colAt(e: PointerEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    if (e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom) return null;
    return Math.min(COLS - 1, Math.floor(((e.clientX - r.left) / r.width) * COLS));
  }

  return (
    <div
      className={`c4${myTurn ? " live" : ""}`}
      tabIndex={myTurn ? 0 : -1}
      aria-label="connect 4 board — arrows to aim, enter to drop"
      onPointerDown={(e) => {
        if (!myTurn) return;
        e.currentTarget.setPointerCapture(e.pointerId);
        held.current = true;
        setCol(colAt(e));
      }}
      onPointerMove={(e) => {
        if (myTurn && (held.current || e.pointerType === "mouse")) setCol(colAt(e));
      }}
      onPointerUp={(e) => {
        const c = colAt(e);
        const wasHeld = held.current;
        held.current = false;
        if (wasHeld && c !== null) drop(c);
        else setCol(e.pointerType === "mouse" ? c : null);
      }}
      onPointerLeave={() => !held.current && setCol(null)}
      onPointerCancel={() => ((held.current = false), setCol(null))}
      onKeyDown={(e) => {
        if (!myTurn) return;
        const c = col ?? 3;
        if (e.key === "ArrowLeft") setCol(Math.max(0, c - 1));
        else if (e.key === "ArrowRight") setCol(Math.min(COLS - 1, c + 1));
        else if (e.key === "Enter" || e.key === " ") drop(c);
        else return;
        e.preventDefault();
      }}
      onBlur={() => setCol(null)}
    >
      <div className="c4-rail">
        {aim !== null && <i className={`piece ${mine}`} style={{ gridColumn: aim + 1 }} />}
      </div>
      <div className="c4-board">
        {board.map((cell, i) => (
          <div key={i} className={`hole${i % COLS === aim ? " hi" : ""}`}>
            {cell ? (
              <i
                className={`piece fall p${game.players.indexOf(cell)}`}
                style={{ "--r": Math.floor(i / COLS) } as CSSProperties}
              />
            ) : (
              i === land && <i className={`piece ghost ${mine}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
