// Poker chips cut from the pixel-art asset in public/chips (see scratch script that generated them: bg removed, spade swapped for a letter, segments recoloured).
export function Chip({ name }: { name: string }) {
  return <img className="chip" src={`/chips/${name}.png`} alt="" draggable={false} />;
}
