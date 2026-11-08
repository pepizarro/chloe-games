// art/icons/bat.png <-> text grid, for pixel edits in a text editor. node scripts/pixgrid.mjs dump > bat.txt ; node scripts/pixgrid.mjs load bat.txt art/icons/bat.png
import sharp from "sharp";
import { readFileSync } from "node:fs";
export const PAL = { K: "#190d0b", D: "#4a2127", M: "#6e444e", L: "#945365", O: "#f4704f", R: "#c96747", Y: "#fcdd7e", y: "#eac593" };
const hex = (c) => [1, 3, 5].map((i) => parseInt(c.slice(i, i + 2), 16));
const dist = (a, b) => Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[2] - b[2]);
const [, , cmd, a, b] = process.argv;
if (cmd === "dump") {
  const { data, info } = await sharp("art/icons/bat.png").ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const rows = [];
  for (let y = 0; y < info.height; y++) {
    let r = "";
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (!data[i + 3]) { r += "."; continue; }
      const v = [...data.subarray(i, i + 3)];
      const best = Object.entries(PAL).map(([k, c]) => [k, dist(hex(c), v)]).sort((p, q) => p[1] - q[1])[0];
      r += best[1] < 30 ? best[0] : "?";
    }
    rows.push(r);
  }
  console.log(rows.map((r, i) => String(i).padStart(2) + " " + r).join("\n"));
} else {
  const rows = readFileSync(a, "utf8").split("\n").filter(Boolean).map((l) => l.slice(3));
  const w = rows[0].length, h = rows.length, buf = Buffer.alloc(w * h * 4);
  rows.forEach((r, y) => [...r].forEach((ch, x) => { if (PAL[ch]) buf.set([...hex(PAL[ch]), 255], (y * w + x) * 4); }));
  await sharp(buf, { raw: { width: w, height: h, channels: 4 } }).trim({ background: { r: 0, g: 0, b: 0, alpha: 0 }, threshold: 0 }).png().toFile(b);
  const m = await sharp(b).metadata();
  await sharp(b).resize(m.width * 8, m.height * 8, { kernel: "nearest" }).flatten({ background: "#123f29" }).png().toFile(b.replace(/\.png$/, "-preview.png"));
  console.log(m.width, m.height);
}
