// Small pixel icons. Players get a card suit (SVG bitmap); games reuse their own board pieces (.piece / .stone from globals.css).
const BITMAPS: Record<string, { rows: string[]; fill: string; hi: string }> = {
  heart: { fill: "#fe5f55", hi: "#ffb3ad", rows: [".XX..XX.", "XoXXXXXX", "XXXXXXXX", "XXXXXXXX", ".XXXXXX.", "..XXXX..", "...XX..."] },
  clover: { fill: "#38b764", hi: "#a7f070", rows: ["...XX...", "..XoXX..", "..XXXX..", ".XXXXXX.", "XoXXXXXX", "XXXXXXXX", ".XX..XX.", "...XX...", "..XXXX.."] },
};
export const PLAYER_ICON: Record<string, string> = { pedro: "clover", chloe: "heart" };

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
  const w = b.rows[0].length, h = b.rows.length, path = (ch: string) =>
    b.rows.flatMap((r, y) => [...r].map((c, x) => (c === ch ? `M${x} ${y}h1v1h-1z` : ""))).join("");
  return (
    <svg className="icon" viewBox={`0 0 ${w} ${h}`} shapeRendering="crispEdges" aria-hidden>
      <path d={path("X") + path("o")} fill={b.fill} />
      <path d={path("o")} fill={b.hi} />
    </svg>
  );
}
