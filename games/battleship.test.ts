import { test } from "node:test";
import assert from "node:assert/strict";
import { battleship as bs, FLEET, N, type State } from "./battleship.ts";

test("random fleets are always legal", () => {
  for (let i = 0; i < 200; i++) {
    const f = bs.random();
    assert.deepEqual(f.map((s) => s.len), FLEET);
    assert.ok(bs.valid(f));
    assert.equal(new Set(f.flatMap(bs.cells)).size, 17);
  }
});

test("valid: no wrapping off the edge, no overlap, touching is fine", () => {
  assert.ok(bs.valid([{ at: 7, len: 3, h: true }]));
  assert.ok(!bs.valid([{ at: 8, len: 3, h: true }]), "wraps to the next row");
  assert.ok(!bs.valid([{ at: 80, len: 3, h: false }]), "runs off the bottom");
  assert.ok(!bs.valid([{ at: 0, len: 3, h: true }, { at: 2, len: 2, h: false }]), "overlap");
  assert.ok(bs.valid([{ at: 0, len: 3, h: true }, { at: 3, len: 2, h: false }]), "touching");
});

test("put clamps onto the board and refuses overlaps", () => {
  const fleet = [{ at: 0, len: 5, h: true }, { at: 50, len: 2, h: true }];
  assert.deepEqual(bs.put(fleet, 1, { at: 59, len: 2, h: true })![1].at, 58);
  assert.deepEqual(bs.put(fleet, 1, { at: 95, len: 2, h: false })![1].at, 85);
  assert.equal(bs.put(fleet, 1, { at: 3, len: 2, h: false }), null);
  // rotating the 5 at the right edge slides it back in
  assert.deepEqual(bs.put([{ at: 9, len: 5, h: false }], 0, { at: 9, len: 5, h: true })![0].at, N - 5);
});

test("fire, sunk, lost", () => {
  let s: State = { ...bs.init(), ships: { a: [{ at: 0, len: 2, h: true }], b: [{ at: 11, len: 2, h: false }] } };
  s = bs.fire(s, "a", 11)!;
  assert.equal(bs.fire(s, "a", 11), null, "same cell twice");
  assert.equal(bs.fire(s, "a", 100), null);
  assert.equal(bs.shipAt(s.ships.b, 11), 0);
  assert.equal(bs.shipAt(s.ships.b, 12), -1);
  assert.ok(!bs.sunk(s.ships.b[0], s.shots.a));
  s = bs.fire(s, "b", 5)!;
  s = bs.fire(s, "a", 21)!;
  assert.ok(bs.sunk(s.ships.b[0], s.shots.a));
  assert.ok(bs.lost(s.ships.b, s.shots.a));
  assert.ok(!bs.lost(s.ships.a, s.shots.b));
});

test("waiting: whoever has not placed, in either order; null once the battle is on", () => {
  const p = ["a", "b"], fleet = bs.random();
  assert.deepEqual(bs.waiting(bs.init(), p), ["a", "b"]);
  assert.deepEqual(bs.waiting({ ...bs.init(), ships: { a: fleet } }, p), ["b"]);
  assert.deepEqual(bs.waiting({ ...bs.init(), ships: { b: fleet } }, p), ["a"]);
  assert.equal(bs.waiting({ ...bs.init(), ships: { a: fleet, b: fleet } }, p), null);
});

test("turn pivots on the middle cell and turning twice comes back", () => {
  const five = { at: 42, len: 5, h: true }; // row 4, cols 2..6, middle (4,4)
  assert.deepEqual(bs.turn(five), { at: 24, len: 5, h: false }); // col 4, rows 2..6
  assert.deepEqual(bs.turn(bs.turn(five)), five);
  const two = { at: 55, len: 2, h: false };
  assert.deepEqual(bs.turn(bs.turn(two)), two);
  // near an edge the pivot would push it off: put slides it back on
  assert.ok(bs.valid(bs.put([{ at: 2, len: 5, h: true }], 0, bs.turn({ at: 2, len: 5, h: true }))!));
});
