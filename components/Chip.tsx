// Pixel-art poker chip, drawn on an 18x18 grid as SVG paths. Modelled on a top-down chip:
// black outline, white body, coloured edge segments, blue-grey inner ring, suit in the middle, 1px of depth below.
const N = 18, C = (N - 1) / 2;

const SUITS: Record<string, string[]> = {
  spade:   ["...X...", "..XXX..", ".XXXXX.", "XXXXXXX", "XXXXXXX", "XX.X.XX", "...X...", "..XXX.."],
  heart:   [".XX.XX.", "XXXXXXX", "XXXXXXX", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  diamond: ["...X...", "..XXX..", ".XXXXX.", "XXXXXXX", ".XXXXX.", "..XXX..", "...X..."],
  club:    ["..XXX..", ".XXXXX.", "..XXX..", "XX.X.XX", "XXXXXXX", "XX.X.XX", "...X...", "..XXX.."],
};
const TONES: Record<string, string> = { blue: "#0b9bff", red: "#fe5f55", gold: "#e0b94f", black: "#1a1c2c" };

function paint(suit: string) {
  const px: Record<string, string> = { k: "", w: "", c: "", s: "", g: "" };
  const put = (k: string, x: number, y: number) => (px[k] += `M${x} ${y}h1v1h-1z`);
  for (let y = 0; y < N; y++)
    for (let x = 0; x < N; x++) {
      const dx = x - C, dy = y - C, d = Math.hypot(dx, dy);
      if (d > 8.6) continue;
      if (d > 7.7) put("k", x, y);                                                    // outline
      else if (d > 5.4) put(Math.floor(((Math.atan2(dy, dx) + Math.PI) / (2 * Math.PI)) * 12) % 2 ? "c" : "w", x, y); // 6 coloured segments
      else if (d > 4.5) put("s", x, y);                                               // inner ring
      else put("w", x, y);
    }
  const rows = SUITS[suit] ?? SUITS.spade;
  const oy = Math.round(C - rows.length / 2 + 0.5), ox = Math.round(C - rows[0].length / 2 + 0.5);
  rows.forEach((r, y) => [...r].forEach((ch, x) => ch === "X" && put("g", ox + x, oy + y)));
  return px;
}

export function Chip({ tone = "blue", suit = "spade" }: { tone?: string; suit?: string }) {
  const p = paint(suit);
  const c = TONES[tone] ?? tone;
  return (
    <svg className={`chip ${tone}`} viewBox={`0 0 ${N} ${N + 1}`} shapeRendering="crispEdges" aria-hidden>
      <g transform="translate(0 1)"><path d={p.k + p.c + p.w + p.s} fill="#111" /></g>  {/* depth */}
      <path d={p.k} fill="#111" />
      <path d={p.w} fill="#f4f4f4" />
      <path d={p.c} fill={c} />
      <path d={p.s} fill="#9fb4c8" />
      <path d={p.g} fill="#111" />
    </svg>
  );
}
