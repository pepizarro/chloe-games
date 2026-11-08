import { decode, encode } from "./png.mjs";
// node scripts/chips/chips.mjs → regenerates public/chips/*.png from chip.png. Add a line at the bottom for a new game.
const OUT = new URL("../../public/chips", import.meta.url).pathname;
import { mkdirSync } from "node:fs";
const { w, h, data: src } = decode(new URL("./chip.png", import.meta.url).pathname);
const P = 17.44, PH = 1.25, PHY = 0.25; // pixel pitch / phase from grid detection
const idx = (x, y) => (y * w + x) * 4;
const near = (o, c, t) => Math.abs(src[o] - c[0]) + Math.abs(src[o + 1] - c[1]) + Math.abs(src[o + 2] - c[2]) < t;

// 1. background → transparent (flood from corners)
const alpha = new Uint8Array(w * h).fill(255);
{
  const q = []; // the asset has a dark 1-3px frame: clear it and seed just inside
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) if (x < 5 || y < 5 || x >= w - 5 || y >= h - 5) { alpha[y * w + x] = 0; if (x === 4 || y === 4 || x === w - 5 || y === h - 5) q.push(y * w + x); }
  while (q.length) {
    const i = q.pop(), x = i % w, y = (i / w) | 0;
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
      const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
      const j = ny * w + nx; if (alpha[j] && near(idx(nx, ny), [208, 209, 211], 70)) { alpha[j] = 0; q.push(j); }
    }
  }
}
// 1b. speck cleanup: opaque pixels with mostly-transparent neighbours are bg noise
for (let pass = 0; pass < 2; pass++) for (let y = 1; y < h - 1; y++) for (let x = 1; x < w - 1; x++) {
  const i = y * w + x; if (!alpha[i]) continue;
  let t = 0; for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) if (!alpha[i + dy * w + dx]) t++;
  if (t >= 5) alpha[i] = 0;
}
// 2. dark components; the ones near the centre are the spade → paint white
const dark = new Uint8Array(w * h); for (let i = 0; i < w * h; i++) dark[i] = alpha[i] && near(i * 4, [37, 37, 39], 150) ? 1 : 0;
const comp = new Int32Array(w * h).fill(-1); const comps = [];
for (let i = 0; i < w * h; i++) {
  if (!dark[i] || comp[i] >= 0) continue;
  const id = comps.length, st = [i]; comp[i] = id; let n = 0, sx = 0, sy = 0, minx = w, maxx = 0, miny = h, maxy = 0;
  while (st.length) {
    const k = st.pop(), x = k % w, y = (k / w) | 0; n++; sx += x; sy += y; minx = Math.min(minx, x); maxx = Math.max(maxx, x); miny = Math.min(miny, y); maxy = Math.max(maxy, y);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue; const j = ny * w + nx; if (dark[j] && comp[j] < 0) { comp[j] = id; st.push(j); } }
  }
  comps.push({ id, n, cx: sx / n, cy: sy / n, minx, maxx, miny, maxy });
}
const main = { minx: w, maxx: 0, miny: h, maxy: 0 };
for (let i = 0; i < w * h; i++) if (alpha[i]) { const x = i % w, y = (i / w) | 0; main.minx = Math.min(main.minx, x); main.maxx = Math.max(main.maxx, x); main.miny = Math.min(main.miny, y); main.maxy = Math.max(main.maxy, y); }
const cx = (main.minx + main.maxx) / 2, cy = (main.miny + main.maxy) / 2, R = (main.maxx - main.minx) / 2;
const spade = comps.filter((c) => c.n > 50 && Math.hypot(c.cx - cx, c.cy - cy) < R * 0.4 && c.maxx - c.minx < R);
const spadeId = new Set(spade.map((c) => c.id));
const sp = { minx: Math.min(...spade.map((c) => c.minx)), maxx: Math.max(...spade.map((c) => c.maxx)), miny: Math.min(...spade.map((c) => c.miny)), maxy: Math.max(...spade.map((c) => c.maxy)) };
console.log("chip bbox", main.minx, main.miny, main.maxx, main.maxy, "spade bbox", sp, "spade parts", spade.length);
const base = Buffer.from(src);
for (let i = 0; i < w * h; i++) if (comp[i] >= 0 && spadeId.has(comp[i])) { base[i * 4] = base[i * 4 + 1] = base[i * 4 + 2] = 255; }
// 3. outline = dark cells touching transparent cells (cell grid), everything else dark is a "segment"
const nx = Math.ceil(w / P), ny = Math.ceil(h / P), cell = (x, y) => [((x - PH) / P) | 0, ((y - PHY) / P) | 0];
const trans = new Float32Array(nx * ny), cnt = new Float32Array(nx * ny);
for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const [c, r] = cell(x, y); cnt[r * nx + c]++; if (!alpha[y * w + x]) trans[r * nx + c]++; }
const isBg = (c, r) => c < 0 || r < 0 || c >= nx || r >= ny || trans[r * nx + c] / cnt[r * nx + c] > 0.3;
const outlineCell = (c, r) => { for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (isBg(c + dc, r + dr)) return true; return false; };

// 4. letters: 7x6 glyphs, 2 cells per glyph pixel, centred on the old spade
const GLYPH = {
  C: [".XXXXX.", "XX...XX", "XX.....", "XX.....", "XX...XX", ".XXXXX."],
  P: ["XXXXXX.", "XX...XX", "XX...XX", "XXXXXX.", "XX.....", "XX....."],
  4: ["XX...XX", "XX...XX", "XXXXXXX", ".....XX", ".....XX", ".....XX"],
  M: ["XX...XX", "XXX.XXX", "XX.X.XX", "XX...XX", "XX...XX", "XX...XX"],
};
function render(name, color, letter) {
  const out = Buffer.from(base);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const i = y * w + x, o = i * 4; out[o + 3] = alpha[i];
    if (color && dark[i] && !spadeId.has(comp[i])) { const [c, r] = cell(x, y); if (!outlineCell(c, r)) { out[o] = color[0]; out[o + 1] = color[1]; out[o + 2] = color[2]; } }
  }
  const g = GLYPH[letter], S = 2, gw = g[0].length * S, gh = g.length * S;
  const [c0, r0] = cell((sp.minx + sp.maxx) / 2, (sp.miny + sp.maxy) / 2); const col0 = c0 - (gw >> 1) + 1, row0 = r0 - (gh >> 1) + 1;
  g.forEach((row, gy) => [...row].forEach((ch, gx) => {
    if (ch !== "X") return;
    const x0 = Math.round(PH + (col0 + gx * S) * P), y0 = Math.round(PHY + (row0 + gy * S) * P), x1 = Math.round(PH + (col0 + gx * S + S) * P), y1 = Math.round(PHY + (row0 + gy * S + S) * P);
    for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) { const o = idx(x, y); out[o] = 37; out[o + 1] = 37; out[o + 2] = 39; }
  }));
  // 5. crop to chip + 4x area downscale (premultiplied)
  const pad = 8, X0 = main.minx - pad, Y0 = main.miny - pad, CW = main.maxx - main.minx + 2 * pad, CH = main.maxy - main.miny + 2 * pad, F = 4, ow = CW / F | 0, oh = CH / F | 0;
  const small = Buffer.alloc(ow * oh * 4);
  for (let y = 0; y < oh; y++) for (let x = 0; x < ow; x++) {
    let r = 0, gg = 0, b = 0, a = 0;
    for (let dy = 0; dy < F; dy++) for (let dx = 0; dx < F; dx++) { const o = idx(X0 + x * F + dx, Y0 + y * F + dy), al = out[o + 3] / 255; r += out[o] * al; gg += out[o + 1] * al; b += out[o + 2] * al; a += al; }
    const o = (y * ow + x) * 4; if (a) { small[o] = r / a; small[o + 1] = gg / a; small[o + 2] = b / a; } small[o + 3] = (a / (F * F)) * 255;
  }
  mkdirSync(new URL("../../public/chips", import.meta.url).pathname", { recursive: true });
  encode(`/Users/pedro/personal/projects/chloe/public/chips/${name}.png`, ow, oh, small);
  console.log(name, ow, oh);
}
render("chloe", null, "C");
render("pedro", [254, 95, 85], "P");
render("connect4", [11, 155, 255], "4");
render("mancala", [224, 185, 79], "M");
