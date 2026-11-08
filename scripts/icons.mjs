// art/icons/*.png (pixel art, 1 px = 1 cell, transparent bg) -> components/icons.json
// run after editing an icon:  npm run icons
import sharp from "sharp";
import { readdirSync, writeFileSync } from "node:fs";
const out = {};
for (const f of readdirSync("art/icons").filter((f) => f.endsWith(".png")).sort()) {
  const { data, info } = await sharp(`art/icons/${f}`).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const palette = [], rows = [];
  for (let y = 0; y < info.height; y++) {
    let row = "";
    for (let x = 0; x < info.width; x++) {
      const [r, g, b, a] = data.subarray((y * info.width + x) * 4, (y * info.width + x) * 4 + 4);
      if (a < 128) { row += "."; continue; }
      const c = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
      if (!palette.includes(c)) palette.push(c);
      row += palette.indexOf(c).toString(36);
    }
    rows.push(row);
  }
  out[f.slice(0, -4)] = { palette, rows };
}
writeFileSync("components/icons.json", JSON.stringify(out, null, 1) + "\n");
console.log("icons:", Object.keys(out).join(" "));
