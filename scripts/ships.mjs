// Top-down pixel ships for battleship -> public/battleship/<fleet index>.png (16 px per cell, bow on the left).
// run after tweaking a ship:  node scripts/ships.mjs
import sharp from "sharp";
import { mkdirSync } from "node:fs";

const C = { o: "#1a1c2c", k: "#29366f", d: "#333c57", m: "#566c86", l: "#94b0c2", h: "#c5d4de", w: "#f4f4f4", r: "#b13e53", y: "#ffcd75" };
const H = 16, MID = 7.5;

function sprite(len, hull, draw) {
  const W = 16 * len;
  const g = Array.from({ length: H }, () => Array(W).fill(null));
  const px = (x, y, c) => x >= 0 && x < W && y >= 0 && y < H && (g[y][x] = c);
  const rect = (x, y, w, h, c) => { for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) px(x + i, y + j, c); };
  // raised block: dark outline, lit top edge
  const box = (x, y, w, h, c = "l", top = "h") => { rect(x - 1, y - 1, w + 2, h + 2, "d"); rect(x, y, w, h, c); rect(x, y, w, 1, top); };
  // gun turret with twin barrels pointing dir (-1 bow, 1 stern)
  const turret = (cx, dir) => {
    rect(dir < 0 ? cx - 6 : cx + 2, 7, 4, 2, "o");
    box(cx - 2, 6, 4, 4);
    for (const [x, y] of [[-2, 6], [1, 6], [-2, 9], [1, 9]]) px(cx + x, y, "d"); // cut corners
  };

  // hull: half-width profile -> outline, lit rail on top, shaded rail below
  const { max, bow, stern, round = false, deck = "m", railTop = "l", railBot = "d" } = hull;
  const half = (x) => {
    if (x < 1 || x > W - 2) return -1;
    const t = (x - 1) / bow, u = (W - 2 - x) / stern;
    const front = t >= 1 ? max : max * (round ? Math.sqrt(1 - (1 - t) ** 2) : 0.22 + 0.78 * t ** 0.7);
    const back = u >= 1 ? max : max * ((round ? 0 : 0.6) + (round ? 1 : 0.4) * Math.sqrt(1 - (1 - u) ** 2));
    return Math.max(0.5, Math.min(front, back));
  };
  const inside = (x, y) => x >= 0 && x < W && y >= 0 && y < H && Math.abs(y - MID) <= half(x);
  const edge = (x, y) => inside(x, y) && !(inside(x - 1, y) && inside(x + 1, y) && inside(x, y - 1) && inside(x, y + 1));
  for (let y = 0; y < H; y++)
    for (let x = 0; x < W; x++) {
      if (!inside(x, y)) continue;
      px(x, y, edge(x, y) ? "o" : edge(x, y - 1) ? railTop : edge(x, y + 1) ? railBot : deck);
    }

  draw({ W, px, rect, box, turret });
  const buf = Buffer.alloc(W * H * 4);
  g.forEach((row, y) => row.forEach((c, x) => {
    if (c) buf.set([...[1, 3, 5].map((i) => parseInt(C[c].slice(i, i + 2), 16)), 255], (y * W + x) * 4);
  }));
  return sharp(buf, { raw: { width: W, height: H, channels: 4 } }).png();
}

const funnel = ({ rect, px }, x) => { rect(x, 6, 4, 4, "o"); rect(x + 1, 7, 2, 2, "d"); rect(x, 6, 1, 4, "r"); };

const SHIPS = [
  // carrier: the same grey hull as the rest, with a dark flight deck laid over it (bow and stern poke out),
  // angled landing line, parked jets and an island with a funnel to starboard
  sprite(5, { max: 6.5, bow: 17, stern: 6 }, ({ px, rect, box }) => {
    rect(14, 3, 60, 10, "d"); rect(14, 3, 60, 1, "k"); rect(14, 12, 60, 1, "o");
    for (const [x, y] of [[14, 3], [15, 3], [14, 4], [14, 12], [15, 12], [14, 11]]) px(x, y, "m"); // deck's forward corners cut
    rect(16, 5, 1, 6, "y");
    for (let x = 46; x <= 72; x++) px(x, Math.round(11 - (72 - x) * 7 / 26), "y"); // angled landing line
    for (let x = 19; x < 70; x += 5) rect(x, 8, 3, 1, "w");
    for (const x of [21, 27, 33]) { rect(x - 1, 5, 3, 1, "h"); rect(x, 4, 2, 3, "h"); px(x - 1, 5, "w"); px(x + 1, 5, "r"); } // jets
    rect(58, 10, 5, 2, "m"); // lift
    box(36, 10, 11, 3, "l", "w"); rect(37, 11, 1, 1, "k"); rect(39, 11, 1, 1, "k"); rect(41, 11, 1, 1, "k");
    rect(43, 10, 3, 3, "o"); rect(43, 10, 1, 3, "r"); px(44, 11, "d");
    box(7, 7, 3, 2); rect(76, 6, 1, 4, "r");
  }),
  // battleship: two turrets fore, two aft, tall bridge and funnel
  sprite(4, { max: 6.5, bow: 15, stern: 6 }, (t) => {
    const { px, rect, box, turret } = t;
    turret(16, -1); turret(23, -1); turret(52, 1);
    box(28, 4, 19, 8, "l"); box(30, 5, 7, 6, "h", "w");
    rect(30, 7, 1, 2, "k"); rect(32, 6, 1, 1, "k"); rect(32, 9, 1, 1, "k");
    funnel(t, 39); funnel(t, 44); px(34, 8, "r"); px(35, 8, "y");
    for (const x of [29, 33]) { rect(x, 3, 2, 1, "w"); rect(x, 12, 2, 1, "w"); } // lifeboats
    rect(59, 6, 1, 4, "r");
  }),
  // cruiser: one turret each end, bridge amidships
  sprite(3, { max: 6, bow: 13, stern: 5 }, (t) => {
    const { px, rect, box, turret } = t;
    turret(13, -1); turret(37, 1);
    box(18, 4, 13, 8, "l"); box(20, 5, 5, 6, "h", "w"); rect(20, 7, 1, 2, "k");
    funnel(t, 26); px(22, 8, "r");
  }),
  // submarine: slim dark hull, conning tower, dive planes
  sprite(3, { max: 4.6, bow: 9, stern: 14, round: true, deck: "d", railTop: "m", railBot: "k" }, ({ px, rect, box }) => {
    rect(9, 2, 2, 12, "o"); rect(42, 2, 2, 12, "o"); rect(43, 4, 1, 8, "d");
    box(19, 6, 9, 4, "m", "l"); px(21, 7, "w"); px(25, 8, "y");
    rect(13, 6, 1, 4, "r"); rect(33, 6, 1, 4, "r");
    for (const x of [30, 36, 39]) px(x, 8, "k");
  }),
  // destroyer: small, one gun each end
  sprite(2, { max: 5.5, bow: 10, stern: 4 }, (t) => {
    const { px, box, turret } = t;
    turret(10, -1); turret(24, 1);
    box(14, 5, 7, 6, "l"); box(14, 6, 3, 4, "h", "w"); px(14, 8, "k");
    funnel(t, 18);
  }),
];

// the bomb that drops on a fired-at cell: side view, nose down
const BOMB = [
  ".oo..oo.",
  ".odoodo.",
  "..oddo..",
  ".orrrro.",
  "odmhmmdo",
  "odmhmmdo",
  "odmlmmdo",
  "odmmmmdo",
  ".odmmdo.",
  ".odmmdo.",
  "..oddo..",
  "...oo...",
];
const bomb = Buffer.alloc(8 * BOMB.length * 4);
BOMB.forEach((row, y) => [...row].forEach((c, x) => {
  if (C[c]) bomb.set([...[1, 3, 5].map((i) => parseInt(C[c].slice(i, i + 2), 16)), 255], (y * 8 + x) * 4);
}));

mkdirSync("public/battleship", { recursive: true });
await sharp(bomb, { raw: { width: 8, height: BOMB.length, channels: 4 } }).png().toFile("public/battleship/bomb.png");
await Promise.all(SHIPS.map((s, i) => s.toFile(`public/battleship/${i}.png`)));
console.log("ships:", SHIPS.length);
