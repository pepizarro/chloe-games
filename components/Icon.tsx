// Small pixel icons. Players get a card suit (SVG bitmap); games reuse their own board pieces (.piece / .stone from globals.css).
import ICONS from "./icons.json";
// Pixel art lives in art/icons/*.png (edit in LibreSprite/Aseprite), `npm run icons` regenerates icons.json.
const BITMAPS = ICONS as Record<string, { palette: string[]; rows: string[] }>;
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
  const w = b.rows[0].length, h = b.rows.length;
  const path = (ch: string) => b.rows.flatMap((r, y) => [...r].map((c, x) => (c === ch ? `M${x} ${y}h1v1h-1z` : ""))).join("");
  return (
    <svg className="icon" viewBox={`-1 -1 ${w + 2} ${h + 2}`} shapeRendering="crispEdges" aria-hidden>
      {b.palette.map((c, i) => <path key={c} d={path(i.toString(36))} fill={c} />)}
    </svg>
  );
}
