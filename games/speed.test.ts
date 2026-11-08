import { test } from "node:test";
import assert from "node:assert/strict";
import { speed, rank, type State } from "./speed.ts";

const seq = () => { let i = 0; return () => ((i += 0.37) % 1); }; // deterministic "random"
const both = (s: State) => speed.ready(speed.ready(s, 0), 1);

test("deal: 52 distinct cards, 5/15/5/1 per side", () => {
  const s = speed.init(seq());
  const all = [...s.hands.flat(), ...s.draws.flat(), ...s.side.flat(), ...s.center.flat()];
  assert.equal(new Set(all).size, 52);
  assert.deepEqual([s.hands[0].length, s.draws[0].length, s.side[0].length, s.center[0].length], [5, 15, 5, 1]);
});

test("adjacent ranks, ace wraps to king", () => {
  assert.ok(speed.adjacent(0, 1));
  assert.ok(speed.adjacent(0, 12));
  assert.ok(speed.adjacent(13 + 5, 26 + 4)); // suits irrelevant
  assert.ok(!speed.adjacent(3, 3));
  assert.ok(!speed.adjacent(3, 5));
});

test("play needs both ready, moves the card, refills to 5, bumps v", () => {
  let s = speed.init(seq());
  s.center[0] = [6]; s.hands[0] = [7, 20, 21, 22, 23]; // 7 is an 8, centre is a 7
  assert.equal(speed.play(s, 0, 7, 0), null, "not started");
  s = both(s);
  assert.equal(speed.play(s, 0, 22, 0), null, "wrong rank"); // 22 is a 10
  const n = speed.play(s, 0, 7, 0)!;
  assert.deepEqual(n.center[0], [6, 7]);
  assert.equal(n.hands[0].length, 5);
  assert.equal(n.draws[0].length, 14);
  assert.equal(n.v, s.v + 1);
  assert.ok(!n.hands[0].includes(7));
});

test("flip only when both ask, reshuffles centre when side piles are empty", () => {
  let s = both(speed.init(seq()));
  const sideTop = [s.side[0].at(-1), s.side[1].at(-1)];
  s = speed.requestFlip(s, 0);
  assert.deepEqual(s.flip, [true, false]);
  assert.equal(s.center[0].length, 1);
  s = speed.requestFlip(s, 1);
  assert.deepEqual(s.flip, [false, false]);
  assert.deepEqual([s.center[0].at(-1), s.center[1].at(-1)], sideTop);
  assert.equal(s.side[0].length, 4);
  s.side = [[], []]; s.center = [[1, 2, 3], [4, 5]];
  s = speed.requestFlip(speed.requestFlip(s, 0), 1, seq());
  assert.equal(s.side[0].length + s.side[1].length + s.center[0].length + s.center[1].length, 5);
  assert.equal(s.center[0].length, 1);
  assert.equal(s.center[1].length, 1);
});

test("stuck and winner", () => {
  let s = both(speed.init(seq()));
  s.center = [[0], [0]]; s.hands[0] = [5, 6, 7, 8, 9]; // centre aces, hand 6..10
  assert.ok(speed.stuck(s, 0));
  s.hands[0] = [1, 6, 7, 8, 9]; // a 2
  assert.ok(!speed.stuck(s, 0));
  assert.deepEqual(speed.targets(s, 1), [0, 1]);
  assert.equal(speed.winner(s), null);
  s.hands[1] = []; s.draws[1] = [];
  assert.equal(speed.winner(s), 1);
  assert.equal(rank(12), 12);
});
