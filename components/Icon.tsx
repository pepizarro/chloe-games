// Small pixel icons. Players get a card suit (SVG bitmap); games reuse their own board pieces (.piece / .stone from globals.css).
const BITMAPS: Record<string, { rows: string[]; fill: string; hi: string; rim?: string; pad?: number }> = {
  heart: { fill: "#fe5f55", hi: "#ffb3ad", rows: [".XX..XX.", "XoXXXXXX", "XXXXXXXX", "XXXXXXXX", ".XXXXXX.", "..XXXX..", "...XX..."] },
  bell: { fill: "#ffd25a", hi: "#fff", rows: ["...XX...", "..XXXX..", ".XoXXXX.", ".XoXXXX.", ".XXXXXX.", "XXXXXXXX", "...XX...", "........"] },
  "bell-off": { fill: "#9aa5a8", hi: "#fe5f55", rows: ["...XX..o", "..XXXXo.", ".XXXXoX.", ".XXXoXX.", ".XXoXXX.", "XXoXXXXX", ".o.XX...", "o......."] },
  waldo: { fill: "#fe5f55", hi: "#fff", rows: ["...XX...", "..XXXX..", ".oooooo.", ".oooooo.", "XXXXXXXX", "XXXXXXXX"] },
  home: { fill: "#fff", hi: "#c8a24c", rows: ["...XX...", "..XXXX..", ".XXXXXX.", "XXXXXXXX", ".XXXXXX.", ".XXooXX.", ".XXooXX."] },
  spade: { fill: "#1d2a2a", hi: "#1d2a2a", rim: "#b4bdbf", pad: 2, rows: [
    ".......XX.......", "......XXXX......", ".....XXXXXX.....", "....XXXXXXXX....", "...XXXXXXXXXX...", "..XXXXXXXXXXXX..",
    ".XXXXXXXXXXXXXX.", "XXXXXXXXXXXXXXXX", "XXXXXXXXXXXXXXXX", "XXXXXXX..XXXXXXX", ".XXXXX....XXXXX.", "..XXX..XX..XXX..",
    ".......XX.......", "......XXXX......", ".....XXXXXX.....", "....XXXXXXXX....",
  ] },
};
export const PLAYER_ICON: Record<string, string> = { pedro: "spade", chloe: "heart" };

const STONES = [[40, 70, "#41a6f6"], [60, 72, "#f4f4f4"], [30, 50, "#38b764"], [52, 52, "#333c57"], [68, 50, "#41a6f6"], [44, 32, "#f4f4f4"]] as const;

export function Icon({ name }: { name: string }) {
  if (name === "connect4")
    return <i className="icon icon-c4"><i className="piece p0" /></i>;
  if (name === "mancala")
    return (
      <i className="icon icon-stones">
        {STONES.map(([x, y, c], k) => <i key={k} className="stone" style={{ left: `${x}%`, top: `${y}%`, background: c }} />)}
      </i>
    );
  const b = BITMAPS[name] ?? BITMAPS.heart;
  const w = b.rows[0].length, h = b.rows.length, pad = b.pad ?? 1;
  const at = (x: number, y: number) => b.rows[y]?.[x] ?? ".";
  const px = (x: number, y: number) => `M${x} ${y}h1v1h-1z`;
  const path = (ch: string) => b.rows.flatMap((r, y) => [...r].map((c, x) => (c === ch ? px(x, y) : ""))).join("");
  // 1px rim: empty cells touching the shape (drawn 1 cell outside the bitmap too)
  let rim = "";
  if (b.rim)
    for (let y = -1; y <= h; y++)
      for (let x = -1; x <= w; x++)
        if (at(x, y) === "." && [at(x + 1, y), at(x - 1, y), at(x, y + 1), at(x, y - 1)].some((c) => c !== ".")) rim += px(x, y);
  return (
    <svg className="icon" viewBox={`${-pad} ${-pad} ${w + 2 * pad} ${h + 2 * pad}`} shapeRendering="crispEdges" aria-hidden>
      {b.rim && <path d={rim} fill={b.rim} />}
      <path d={path("X") + path("o")} fill={b.fill} />
      <path d={path("o")} fill={b.hi} />
    </svg>
  );
}
