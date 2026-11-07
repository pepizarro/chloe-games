"use client";
import type { Game } from "@/lib/supabase";
import type { Move } from "@/lib/games";
import { connect4, COLS, type State } from "./connect4";

export function Connect4Board({ game, me, play }: { game: Game<State>; me: string; play: (m: Move<State>) => void }) {
  const myTurn = game.turn === me && !game.winner;
  const { board } = game.state;

  function drop(col: number) {
    const next = connect4.drop(board, col, me);
    if (!next) return;
    const winner = connect4.winner(next);
    play({ state: { board: next }, winner, turn: winner ? null : game.players.find((p) => p !== me)! });
  }

  return (
    <div className="c4">
      {board.map((cell, i) => (
        <button
          key={i}
          className={cell ? `p${game.players.indexOf(cell)}` : ""}
          disabled={!myTurn || board[i % COLS] !== null}
          onClick={() => drop(i % COLS)}
          aria-label={cell ?? `column ${i % COLS}`}
        />
      ))}
    </div>
  );
}
