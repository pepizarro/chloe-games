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
});
