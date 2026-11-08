export type Target = { src: string; hint: string; x: number; y: number; r: number }; // x,y: fraction of width/height; r: fraction of width
export type Found = Record<string, number>; // player -> ms from image on screen to double-click
export type State = { round: number; ready: Record<string, number>; found: Found; results: Found[]; stop?: Record<string, boolean> };
// ready[p] = highest round p agreed to play; round r runs once both are >= r. results[r] = that round's found.

// Scenes 1-19 from github.com/vc1492a/Hey-Waldo, 20+ from github.com/tadejmagajna/HereIsWally (Handford's art; private use only).
// Spots verified by eye (tiled YOLOv8 candidates, then a human look). Unverified ones are the dataset's tile label:
// find him in dev, read the fraction the console logs on double-click, paste it here and drop the flag.
const W = (n: number, x: number, y: number, unverified = false): Target =>
  ({ src: `/waldo/${n}.jpg`, hint: unverified ? "waldo · unverified spot" : "waldo", x, y, r: 0.03 });
export const IMAGES: Target[] = [
  W(1, 0.355, 0.437), W(2, 0.073, 0.577), W(3, 0.688, 0.36), W(4, 0.73, 0.233),
  W(5, 0.57, 0.36), W(6, 0.846, 0.303), W(7, 0.437, 0.71), W(8, 0.422, 0.188),
  W(9, 0.21, 0.792), W(11, 0.167, 0.846), W(12, 0.67, 0.327), W(13, 0.73, 0.34),
  W(14, 0.122, 0.81), W(15, 0.189, 0.449), W(18, 0.803, 0.099), W(19, 0.267, 0.749),
  W(10, 0.453, 0.172), W(17, 0.476, 0.216), W(20, 0.105, 0.817), W(21, 0.652, 0.912),
  W(23, 0.559, 0.441), W(24, 0.413, 0.958), W(29, 0.73, 0.641),
  W(16, 0.597, 0.281, true),
];

const init = (): State => ({ round: 0, ready: {}, found: {}, results: [], stop: {} });

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

/** Both asked to end the match early. */
const stopped = (s: State, players: string[]) => players.every((p) => s.stop?.[p]);

const phase = (s: State, players: string[]): "lobby" | "play" | "result" =>
  Object.keys(s.found).length ? "result" : agreed(s, players, s.round) ? "play" : "lobby";

/** Next round, carrying this round's times into results. */
const next = (s: State): State => ({ round: s.round + 1, ready: s.ready, found: {}, results: [...s.results, s.found] });

export const waldo = { init, hit, roundWinner, wins, matchWinner, agreed, stopped, phase, next };
