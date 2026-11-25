import type { ComponentType, ReactNode } from "react";
import type { Game } from "./supabase";
import { connect4 } from "@/games/connect4";
import { Connect4Board } from "@/games/Connect4Board";
import { mancala } from "@/games/mancala";
import { MancalaBoard } from "@/games/MancalaBoard";
import { waldo } from "@/games/waldo";
import { WaldoBoard } from "@/games/WaldoBoard";
import { speed } from "@/games/speed";
import { SpeedBoard } from "@/games/SpeedBoard";
import { battleship } from "@/games/battleship";
import { BattleshipBoard } from "@/games/BattleshipBoard";

export type Move<S> = { state: S; turn: string | null; winner: string | null };

export type GameDef<S> = {
  name: string;
  init(): S;
  // surrender: the white-flag button. The room shows it beside the title, unless the game is full-screen and
  // sets ownHud, in which case the board has to place it in its own header.
  // present: the other player has this game open right now (see lib/presence.ts).
  Board: ComponentType<{ game: Game<S>; me: string; play: (m: Move<S>) => void; surrender?: ReactNode; present?: boolean }>;
  ownHud?: boolean;
  // Games where both players act at once (ready-ups, simultaneous play) say who they are waiting on, since `turn`
  // means nothing there. Null/absent: plain turns, go by `turn`.
  waiting?(state: S, players: string[]): string[] | null;
};

// Add a game: write games/<name>.ts (pure logic) + games/<Name>Board.tsx, register here.
export const GAMES = {
  connect4: { name: "Connect 4", init: connect4.init, Board: Connect4Board },
  mancala: { name: "Mancala", init: mancala.init, Board: MancalaBoard },
  waldo: { name: "Where's Waldo", init: waldo.init, Board: WaldoBoard, ownHud: true, waiting: waldo.waiting },
  speed: { name: "Speed", init: () => speed.init(), Board: SpeedBoard, ownHud: true, waiting: speed.waiting },
  battleship: { name: "Battleship", init: battleship.init, Board: BattleshipBoard, waiting: battleship.waiting },
} satisfies Record<string, GameDef<any>>;

export type GameType = keyof typeof GAMES;

/** Who an unfinished game is waiting on. joint: it is a both-of-you moment rather than a plain turn. */
export function waitingOn(g: Game): { on: string[]; joint: boolean } {
  const def: GameDef<any> | undefined = GAMES[g.type as GameType];
  const on = def?.waiting?.(g.state, g.players) ?? null;
  return on ? { on, joint: true } : { on: g.turn ? [g.turn] : [], joint: false };
}
