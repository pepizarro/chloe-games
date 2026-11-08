// screenshot of pixel art (grid lines, flat bg) -> clean 1px-per-cell PNG with transparent bg.
// usage: PITCH=12 node scripts/depix.mjs in.png art/icons/name.png [bgTolerance]   then: npm run icons
// screenshot of pixel art -> clean 1px-per-cell PNG. usage: node depix.mjs in.png out.png [bgTolerance]
import sharp from "sharp";
const [, , inp, out, tolArg] = process.argv;
const TOL = +(tolArg ?? 60);
const { data, info } = await sharp(inp).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
const { width: W, height: H } = info;
const px = (x, y) => [...data.subarray((y * W + x) * 4, (y * W + x) * 4 + 3)];
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);

// edge profiles
const colE = new Float64Array(W), rowE = new Float64Array(H);
for (let y = 1; y < H; y++) for (let x = 1; x < W; x++) { const a = px(x, y); colE[x] += dist(a, px(x - 1, y)); rowE[y] += dist(a, px(x, y - 1)); }
// best (pitch, offset): edges concentrate on the grid lines
function grid(e) {
  let best = { score: 0 };
  const P = +(process.env.PITCH ?? 0); for (let p = P ? P - 0.6 : 8; p <= (P ? P + 0.6 : 60); p += 0.1) for (let o = 0; o < p; o += 0.5) {
    let s = 0, n = 0;
    for (let x = o; x < e.length; x += p) { s += e[Math.round(x)] ?? 0; n++; }
    const score = s / n;
    if (score > best.score) best = { score, p, o };
  }
  return best;
}
const gx = grid(colE), gy = grid(rowE);
const p = (gx.p + gy.p) / 2;
const cols = Math.floor((W - gx.o) / p), rows = Math.floor((H - gy.o) / p);
console.log(`${inp.split("/").pop()}: pitch ${p.toFixed(2)} offset ${gx.o},${gy.o} -> ${cols}x${rows} cells`);

// sample each cell: median of the inner 50% square
const med = (arr) => arr.sort((a, b) => a - b)[arr.length >> 1];
const cells = [];
for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
  const x0 = gx.o + c * p + p * 0.25, y0 = gy.o + r * p + p * 0.25, R = [], G = [], B = [];
  for (let y = Math.round(y0); y < Math.round(y0 + p * 0.5); y++) for (let x = Math.round(x0); x < Math.round(x0 + p * 0.5); x++) if (x < W && y < H) { const v = px(x, y); R.push(v[0]); G.push(v[1]); B.push(v[2]); }
  cells.push([med(R), med(G), med(B)]);
}
// background = most common border colour; everything within TOL of it is transparent
const border = [];
for (let c = 0; c < cols; c++) border.push(cells[c], cells[(rows - 1) * cols + c]);
for (let r = 0; r < rows; r++) border.push(cells[r * cols], cells[r * cols + cols - 1]);
const bg = med(border.map((v) => v.join(","))).split(",").map(Number); // not a true median, but picks a typical one
console.log("bg", bg);
// palette: merge colours closer than 40
const palette = [];
const quant = (v) => { let k = palette.find((q) => dist(q, v) < 40); if (!k) palette.push((k = v)); return k; };
const outBuf = Buffer.alloc(cols * rows * 4);
cells.forEach((v, i) => { if (dist(v, bg) < TOL) return; const q = quant(v); outBuf.set([...q, 255], i * 4); });
console.log("palette", palette.map((c) => "#" + c.map((v) => v.toString(16).padStart(2, "0")).join("")));
const img = sharp(outBuf, { raw: { width: cols, height: rows, channels: 4 } }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 0 });
await img.png().toFile(out);
const m = await sharp(out).metadata();
await sharp(out).resize(m.width * 8, m.height * 8, { kernel: "nearest" }).png().toFile(out.replace(/\.png$/, "-preview.png"));
console.log("->", m.width, "x", m.height);
