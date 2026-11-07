import { test } from "node:test";
import assert from "node:assert/strict";
import { mancala, STORE } from "./mancala.ts";

test("opening move from pit 2 lands in store → extra turn", () => {
  const r = mancala.move(mancala.init().pits, 2, 0)!;
  assert.deepEqual(r.pits.slice(0, 7), [4, 4, 0, 5, 5, 5, 1]);
  assert.equal(r.again, true);
  assert.equal(mancala.winner(r.pits), null);
});

test("sowing skips opponent store and captures", () => {
  const pits = Array(14).fill(0);
  pits[5] = 8; pits[1] = 3; // 8 stones from pit 5: store, 7..12, skip 13, lands at 0 (empty) opposite 12 has 1 → capture
  const r = mancala.move(pits, 5, 0)!;
  assert.equal(r.pits[13], 0);
  assert.equal(r.pits[0], 0);
  assert.equal(r.pits[12], 0);
  assert.equal(r.pits[STORE[0]], 1 + 2);
  assert.equal(r.again, false);
});

test("illegal moves and endgame sweep", () => {
  const init = mancala.init().pits;
  assert.equal(mancala.move(init, 7, 0), null);
  assert.equal(mancala.move(init, 6, 0), null);
  const pits = Array(14).fill(0);
  pits[5] = 1; pits[8] = 3; pits[13] = 10;
  const r = mancala.move(pits, 5, 0)!; // side 0 now empty → side 1 sweeps 3
  assert.equal(r.pits[13], 13);
  assert.equal(r.pits[8], 0);
  assert.equal(mancala.winner(r.pits), 1);
});
