export type Target = { src: string; hint: string; x: number; y: number; r: number }; // x,y: fraction of width/height; r: fraction of width
export type Found = Record<string, number>; // player -> ms from image on screen to double-click
export type State = { round: number; ready: Record<string, number>; found: Found; results: Found[] };
// ready[p] = highest round p agreed to play; round r runs once both are >= r. results[r] = that round's found.

// ponytail: public-domain Bruegel/Bosch stand-ins. Swap for Waldo scans (public/waldo/*.jpg) and read x/y off the
// dev console, which logs the fraction under every double-click.
const WM = "https://upload.wikimedia.org/wikipedia/commons/thumb";
const CG = "Pieter_Bruegel_the_Elder_-_Children%E2%80%99s_Games_-_Google_Art_Project.jpg";
const DP = "Pieter_Brueghel_the_Elder_-_The_Dutch_Proverbs_-_Google_Art_Project.jpg";
const GD = "The_Garden_of_Earthly_Delights_by_Bosch_High_Resolution.jpg";
export const IMAGES: Target[] = [
  { src: `${WM}/1/1e/${CG}/1920px-${CG}`, hint: "the kid riding the barrel", x: 0.664, y: 0.785, r: 0.04 },
  { src: `${WM}/7/7e/${DP}/1920px-${DP}`, hint: "the woman in red with the blue cloak", x: 0.496, y: 0.651, r: 0.04 },
  { src: `${WM}/6/6d/${GD}/1920px-${GD}`, hint: "the giraffe", x: 0.203, y: 0.281, r: 0.03 },
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
