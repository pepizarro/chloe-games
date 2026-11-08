export type Target = { src: string; hint: string; x: number; y: number; r: number }; // x,y: fraction of width/height; r: fraction of width
export type Found = Record<string, number>; // player -> ms from image on screen to double-click
export type State = { round: number; ready: Record<string, number>; found: Found; results: Found[] };
// ready[p] = highest round p agreed to play; round r runs once both are >= r. results[r] = that round's found.

// Scenes from github.com/vc1492a/Hey-Waldo (ODbL labels, Handford's art; private use only).
// verified: I looked at the spot. Unverified ones are the dataset's best tile label, which is usually a look-alike:
// find him in dev, read the fraction the console logs on double-click, paste it here and drop the flag.
const W = (n: number, x: number, y: number, unverified = false): Target =>
  ({ src: `/waldo/${n}.jpg`, hint: unverified ? "waldo (spot unverified, skip if stuck)" : "waldo", x, y, r: 0.03 });
export const IMAGES: Target[] = [
  W(1, 0.355, 0.437),
  W(9, 0.21, 0.792),
  W(14, 0.122, 0.81),
  W(2, 0.477, 0.219, true), W(3, 0.808, 0.094, true), W(4, 0.287, 0.75, true), W(5, 0.48, 0.219, true),
  W(6, 0.833, 0.094, true), W(7, 0.705, 0.344, true), W(8, 0.5, 0.5, true), W(10, 0.787, 0.282, true),
  W(11, 0.44, 0.719, true), W(12, 0.156, 0.227, true), W(13, 0.416, 0.188, true), W(15, 0.5, 0.5, true),
  W(16, 0.597, 0.281, true), W(17, 0.764, 0.344, true), W(18, 0.77, 0.437, true), W(19, 0.184, 0.438, true),
];

const init = (): State => ({ round: 0, ready: {}, found: {}, results: [] });

/** Is the double-click at (fx, fy) on the target? aspect = image height / width, so the radius is round on screen. */
const hit = (t: Target, fx: number, fy: number, aspect: number) => Math.hypot(fx - t.x, (fy - t.y) * aspect) <= t.r;

/** Fastest finder, 'draw' on an exact tie, null if nobody found it. */
function roundWinner(found: Found): string | null {
  const e = Object.entries(found).sort((a, b) => a[1] - b[1]);
  if (!e.length) return null;
  return e[1] && e[0][1] === e[1][1] ? "draw" : e[0][0];
}

const wins = (results: Found[], players: string[]) => players.map((p) => results.filter((f) => roundWinner(f) === p).length);

function matchWinner(results: Found[], players: string[]): string {
  const [a, b] = wins(results, players);
  return a === b ? "draw" : players[a > b ? 0 : 1];
}

const agreed = (s: State, players: string[], round: number) => players.every((p) => (s.ready[p] ?? -1) >= round);

const phase = (s: State, players: string[]): "lobby" | "play" | "result" =>
  Object.keys(s.found).length ? "result" : agreed(s, players, s.round) ? "play" : "lobby";

/** Next round, carrying this round's times into results. */
const next = (s: State): State => ({ round: s.round + 1, ready: s.ready, found: {}, results: [...s.results, s.found] });

export const waldo = { init, hit, roundWinner, wins, matchWinner, agreed, phase, next };
