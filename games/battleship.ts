export const N = 10;
export const FLEET = [5, 4, 3, 3, 2];
export type Ship = { at: number; len: number; h: boolean }; // at: bow cell (row-major); h: runs right, else down
// ships[p]: p's fleet, missing until p has placed. shots[p]: cells p fired at the other sea, in order.
// ponytail: both fleets sit in the one row both clients read, so devtools can peek. Two trusted players;
// split into per-player rows behind RLS before strangers play.
export type State = { ships: Record<string, Ship[]>; shots: Record<string, number[]> };

const init = (): State => ({ ships: {}, shots: {} });

const cells = (s: Ship) => Array.from({ length: s.len }, (_, k) => s.at + k * (s.h ? 1 : N));

/** Slides a ship back onto the board along its own axis. */
function clamp(s: Ship): Ship {
  const max = N - s.len;
  const r = Math.floor(s.at / N), c = s.at % N;
  return { ...s, at: s.h ? r * N + Math.min(c, max) : Math.min(r, max) * N + c };
}

const inside = (s: Ship) => s.at >= 0 && s.at < N * N && clamp(s).at === s.at;

/** Every ship on the board, none overlapping (touching is fine). */
function valid(fleet: Ship[]) {
  const all = fleet.flatMap(cells);
  return fleet.every(inside) && new Set(all).size === all.length;
}

function random(rnd = Math.random): Ship[] {
  const fleet: Ship[] = [];
  for (const len of FLEET) {
    let s: Ship;
    do s = clamp({ at: Math.floor(rnd() * N * N), len, h: rnd() < 0.5 });
    while (!valid([...fleet, s]));
    fleet.push(s);
  }
  return fleet;
}

/** Fleet with ship i replaced (clamped onto the board), or null if it would overlap. */
function put(fleet: Ship[], i: number, ship: Ship): Ship[] | null {
  const next = fleet.map((s, k) => (k === i ? clamp(ship) : s));
  return valid(next) ? next : null;
}

/** The ship turned a quarter about its middle cell (not yet clamped: `put` does that). */
function turn(s: Ship): Ship {
  const k = Math.floor((s.len - 1) / 2), r = Math.floor(s.at / N), c = s.at % N;
  return { ...s, h: !s.h, at: s.h ? Math.max(0, r - k) * N + c + k : (r + k) * N + Math.max(0, c - k) };
}

/** Index of the ship covering `cell`, or -1. */
const shipAt = (fleet: Ship[], cell: number) => fleet.findIndex((s) => cells(s).includes(cell));

const sunk = (s: Ship, shots: number[]) => cells(s).every((c) => shots.includes(c));

const lost = (fleet: Ship[], shots: number[]) => fleet.every((s) => sunk(s, shots));

/** State after `by` fires at `cell`, or null if they already shot there. */
function fire(s: State, by: string, cell: number): State | null {
  const mine = s.shots[by] ?? [];
  if (cell < 0 || cell >= N * N || mine.includes(cell)) return null;
  return { ...s, shots: { ...s.shots, [by]: [...mine, cell] } };
}

/** While fleets are being placed: whoever has not placed yet. Null once the battle is on (plain turns from there). */
const waiting = (s: State, players: string[]) => (players.every((p) => s.ships[p]) ? null : players.filter((p) => !s.ships[p]));

export const battleship = { init, waiting, cells, clamp, valid, random, put, turn, shipAt, sunk, lost, fire };
