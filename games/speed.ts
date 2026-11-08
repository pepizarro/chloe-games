// Speed, two players, 52 cards. Both play at once: a hand card goes on a centre pile if its rank is one off (A–K wrap).
// Hand refills to 5 from your draw pile. Stuck? Both ask to flip: one side-pile card lands on each centre pile; when the
// side piles run dry the centre piles are shuffled into new ones. First to empty hand + draw pile wins.
// Every mutation bumps `v`; writers guard on it, so two simultaneous plays never both land.
export type State = {
  v: number;
  ready: boolean[];        // per seat: tapped "ready"
  flip: boolean[];         // per seat: asked for a flip
  hands: number[][];       // per seat, up to 5 cards
  draws: number[][];       // per seat, face down
  center: number[][];      // two face-up piles, top = last
  side: number[][];        // two face-down piles, flipped onto the centre when stuck
};

export const SUITS = ["clubs", "diamonds", "hearts", "spades"];
export const RANKS = ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "jack", "queen", "king"];
export const rank = (c: number) => c % 13;
export const suit = (c: number) => Math.floor(c / 13);
export const img = (c: number) => `/cards/${SUITS[suit(c)]}_card_${RANKS[rank(c)]}.png`;
export const HAND = 5;

function shuffle<T>(a: T[], rnd = Math.random): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function init(rnd = Math.random): State {
  const d = shuffle(Array.from({ length: 52 }, (_, i) => i), rnd);
  const take = (n: number) => d.splice(0, n);
  return { v: 0, ready: [false, false], flip: [false, false], hands: [take(5), take(5)], draws: [take(15), take(15)], side: [take(5), take(5)], center: [take(1), take(1)] };
}

const started = (s: State) => s.ready[0] && s.ready[1];
const top = (p: number[]) => p[p.length - 1];
const adjacent = (a: number, b: number) => { const d = Math.abs(rank(a) - rank(b)); return d === 1 || d === 12; };

const canPlay = (s: State, card: number, pile: number) => started(s) && s.center[pile].length > 0 && adjacent(card, top(s.center[pile]));

/** Piles `card` could go on. */
const targets = (s: State, card: number) => [0, 1].filter((p) => canPlay(s, card, p));

const stuck = (s: State, seat: number) => s.hands[seat].every((c) => targets(s, c).length === 0);

const clone = (s: State): State => JSON.parse(JSON.stringify(s));

function ready(s: State, seat: number): State {
  const n = clone(s);
  n.ready[seat] = true;
  n.v++;
  return n;
}

/** Play `card` from `seat`'s hand onto centre `pile`, refill the hand. Null if illegal. */
function play(s: State, seat: number, card: number, pile: number): State | null {
  if (!s.hands[seat].includes(card) || !canPlay(s, card, pile)) return null;
  const n = clone(s);
  n.hands[seat] = n.hands[seat].filter((c) => c !== card);
  n.center[pile].push(card);
  while (n.hands[seat].length < HAND && n.draws[seat].length) n.hands[seat].push(n.draws[seat].pop()!);
  n.v++;
  return n;
}

/** `seat` asks to flip. Once both have, it happens. */
function requestFlip(s: State, seat: number, rnd = Math.random): State {
  const n = clone(s);
  n.flip[seat] = true;
  if (n.flip[0] && n.flip[1]) {
    n.flip = [false, false];
    if (n.side[0].length + n.side[1].length === 0) {
      // ponytail: reshuffle can hand back the same stuck pair; two players will just flip again
      const all = shuffle(n.center.flat(), rnd);
      n.side = [all.slice(0, Math.ceil(all.length / 2)), all.slice(Math.ceil(all.length / 2))];
      n.center = [[], []];
    }
    for (const p of [0, 1]) if (n.side[p].length) n.center[p].push(n.side[p].pop()!);
  }
  n.v++;
  return n;
}

/** Seat with no cards left, or null. */
const winner = (s: State): number | null => {
  const w = [0, 1].find((p) => s.hands[p].length === 0 && s.draws[p].length === 0);
  return w ?? null;
};

export const speed = { init, started, canPlay, targets, stuck, ready, play, requestFlip, winner, adjacent };
