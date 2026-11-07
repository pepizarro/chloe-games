import { test } from "node:test";
import assert from "node:assert/strict";
import { connect4, COLS } from "./connect4.ts";

test("drop stacks from bottom and detects vertical win", () => {
  let b = connect4.init().board;
  for (let i = 0; i < 4; i++) b = connect4.drop(b, 3, "a")!;
  assert.equal(b[5 * COLS + 3], "a");
  assert.equal(b[2 * COLS + 3], "a");
  assert.equal(connect4.winner(b), "a");
});

test("diagonal win and full column", () => {
  let b = connect4.init().board;
  // build a / diagonal for 'a' at cols 0..3 using 'b' as filler
  const seq: [number, string][] = [[0,"a"],[1,"b"],[1,"a"],[2,"b"],[2,"b"],[2,"a"],[3,"b"],[3,"b"],[3,"b"],[3,"a"]];
  for (const [c, p] of seq) b = connect4.drop(b, c, p)!;
  assert.equal(connect4.winner(b), "a");
  for (let i = 0; i < 6; i++) b = connect4.drop(b, 6, "b")!;
  assert.equal(connect4.drop(b, 6, "a"), null);
});

test("no winner on empty, draw when full without line", () => {
  assert.equal(connect4.winner(connect4.init().board), null);
  // column pattern avoids any 4-in-a-row
  const cols = ["aabbab", "bbaaba", "aabbab", "bbaaba", "aabbab", "bbaaba", "aabbab"];
  let b = connect4.init().board;
  cols.forEach((col, c) => [...col].forEach((p) => (b = connect4.drop(b, c, p)!)));
  assert.equal(connect4.winner(b), "draw");
});
