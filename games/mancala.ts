// Kalah rules. pits[0..5] side 0, pits[6] store 0, pits[7..12] side 1, pits[13] store 1. Sowing goes up the indices.
export type State = { pits: number[] };
export const STORE = [6, 13];

const init = (): State => ({ pits: Array.from({ length: 14 }, (_, i) => (STORE.includes(i) ? 0 : 4)) });

const side = (i: number) => (i < 7 ? 0 : 1);
export const ownPits = (s: number) => [0, 1, 2, 3, 4, 5].map((i) => i + s * 7);

/** Sow from pit `i` for player `s`. Returns new pits and whether the player moves again, or null if illegal. */
function move(pits: number[], i: number, s: number): { pits: number[]; again: boolean } | null {
  if (side(i) !== s || STORE.includes(i) || pits[i] === 0) return null;
  const p = pits.slice();
  let n = p[i];
  p[i] = 0;
  let j = i;
  while (n > 0) {
    j = (j + 1) % 14;
    if (j === STORE[1 - s]) continue; // skip opponent's store
    p[j]++;
    n--;
  }
  const again = j === STORE[s];
  const opp = 12 - j;
  if (!again && side(j) === s && p[j] === 1 && p[opp] > 0) {
    p[STORE[s]] += p[j] + p[opp];
    p[j] = p[opp] = 0;
  }
  // game over: one side empty → other side sweeps its stones
  for (const t of [0, 1]) {
    if (ownPits(t).every((k) => p[k] === 0)) {
      for (const k of ownPits(1 - t)) { p[STORE[1 - t]] += p[k]; p[k] = 0; }
      break;
    }
  }
  return { pits: p, again };
}

/** 0, 1, 'draw', or null while playing. */
function winner(pits: number[]): 0 | 1 | "draw" | null {
  if ([0, 1].some((t) => ownPits(t).some((k) => pits[k] > 0))) return null;
  const [a, b] = [pits[STORE[0]], pits[STORE[1]]];
  return a === b ? "draw" : a > b ? 0 : 1;
}

export const mancala = { init, move, winner };
