import type { ComponentType } from "react";
import type { Game } from "./supabase";
import { connect4 } from "@/games/connect4";
import { Connect4Board } from "@/games/Connect4Board";
import { mancala } from "@/games/mancala";
import { MancalaBoard } from "@/games/MancalaBoard";
import { waldo } from "@/games/waldo";
import { WaldoBoard } from "@/games/WaldoBoard";
import { speed } from "@/games/speed";
import { SpeedBoard } from "@/games/SpeedBoard";

export type Move<S> = { state: S; turn: string | null; winner: string | null };

export type GameDef<S> = {
  name: string;
  init(): S;
  Board: ComponentType<{ game: Game<S>; me: string; play: (m: Move<S>) => void }>;
};

// Add a game: write games/<name>.ts (pure logic) + games/<Name>Board.tsx, register here.
export const GAMES = {
  connect4: { name: "Connect 4", init: connect4.init, Board: Connect4Board },
  mancala: { name: "Mancala", init: mancala.init, Board: MancalaBoard },
  waldo: { name: "Where's Waldo", init: waldo.init, Board: WaldoBoard },
  speed: { name: "Speed", init: () => speed.init(), Board: SpeedBoard },
} satisfies Record<string, GameDef<any>>;

export type GameType = keyof typeof GAMES;
