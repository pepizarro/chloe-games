import { test } from "node:test";
import assert from "node:assert/strict";
import { waldo, IMAGES } from "./waldo.ts";

test("hit uses an aspect-corrected radius", () => {
  const t = { ...IMAGES[0], x: 0.5, y: 0.5, r: 0.05 };
  assert.ok(waldo.hit(t, 0.54, 0.5, 0.75));
  assert.ok(!waldo.hit(t, 0.56, 0.5, 0.75));
  assert.ok(waldo.hit(t, 0.5, 0.56, 0.75)); // dy .06 * .75 = .045
  assert.ok(!waldo.hit(t, 0.5, 0.57, 0.75)); // .0525
});

test("round winner: fastest, tie = draw, nobody = null", () => {
  assert.equal(waldo.roundWinner({}), null);
  assert.equal(waldo.roundWinner({ a: 4200 }), "a");
  assert.equal(waldo.roundWinner({ a: 4200, b: 3999 }), "b");
  assert.equal(waldo.roundWinner({ a: 100, b: 100 }), "draw");
});

test("phases, agreement and next-round bookkeeping", () => {
  const p = ["a", "b"];
  let s = waldo.init();
  assert.equal(waldo.phase(s, p), "lobby");
  s = { ...s, ready: { a: 0 } };
  assert.equal(waldo.phase(s, p), "lobby");
  s = { ...s, ready: { a: 0, b: 0 } };
  assert.equal(waldo.phase(s, p), "play");
  s = { ...s, found: { b: 1500 } };
  assert.equal(waldo.phase(s, p), "result");
  assert.ok(!waldo.agreed(s, p, 1));
  s = { ...s, ready: { a: 1, b: 1 } };
  assert.ok(waldo.agreed(s, p, 1));
  s = waldo.next(s);
  assert.equal(s.round, 1);
  assert.equal(waldo.phase(s, p), "play");
  assert.deepEqual(waldo.wins(s.results, p), [0, 1]);
  assert.equal(waldo.matchWinner(s.results, p), "b");
  assert.equal(waldo.matchWinner([...s.results, { a: 1 }], p), "draw");
  // skipped round: nobody found, no point
  const skipped = waldo.next({ ...s, ready: { a: 2, b: 2 } });
  assert.deepEqual(skipped.results.at(-1), {});
  assert.deepEqual(waldo.wins(skipped.results, p), [0, 1]);
  assert.ok(!waldo.stopped({ ...s, stop: { a: true } }, p));
  assert.ok(waldo.stopped({ ...s, stop: { a: true, b: true } }, p));
  assert.ok(!waldo.stopped(waldo.init(), p)); // old rows without stop
});

test("best-of: both must agree; match ends on majority or when rounds run out", () => {
  const p = ["a", "b"];
  let s = waldo.init();
  assert.equal(waldo.best(s, p), null);
  s = { ...s, votes: { a: 3 } };
  assert.equal(waldo.best(s, p), null);
  s = { ...s, votes: { a: 3, b: 5 } };
  assert.equal(waldo.best(s, p), null);
  s = { ...s, votes: { a: 5, b: 5 } };
  assert.equal(waldo.best(s, p), 5);
  const aWin = { a: 100, b: 200 }, bWin = { a: 300, b: 200 }, tie = { a: 100, b: 100 };
  assert.ok(!waldo.over([aWin, bWin], p, 3));
  assert.ok(waldo.over([aWin, aWin], p, 3), "2 of 3");
  assert.ok(waldo.over([aWin, bWin, tie], p, 3), "all played");
  assert.ok(!waldo.over([aWin, aWin], p, 5));
  assert.ok(waldo.over([aWin, aWin, aWin], p, 5), "3 of 5");
});
