"use client";
import { useEffect, useRef, useState, type CSSProperties } from "react";

/** Pixel white flag. Each strip bobs a beat behind the one before it, which reads as cloth in the wind. */
export function Flag({ mini }: { mini?: boolean }) {
  return (
    <span className={`flag${mini ? " mini" : ""}`} aria-hidden>
      <i className="pole" />
      {Array.from({ length: 8 }, (_, k) => (
        // --a: how far this strip swings; the ones at the pole barely move
        <i key={k} className="strip" style={{ animationDelay: `${k * -0.11}s`, "--a": Math.min(1, k / 3) } as CSSProperties} />
      ))}
    </span>
  );
}

/** The white-flag button plus its "are you sure" modal. bar: sized to sit beside the title plaque, like the lobby's bell. */
export function Surrender({ them, bar, onSurrender }: { them: string; bar?: boolean; onSurrender: () => void }) {
  const dlg = useRef<HTMLDialogElement>(null);
  return (
    <>
      <button className={`btn dim giveup${bar ? " bell" : ""}`} onClick={() => dlg.current?.showModal()} aria-label="surrender">
        <Flag mini />
      </button>
      {/* native dialog: backdrop, focus trap and Esc for free. A click on the backdrop lands on the dialog itself. */}
      <dialog ref={dlg} className="modal" onClick={(e) => e.target === e.currentTarget && e.currentTarget.close()}>
        <div className="panel">
          <Flag />
          <p>surrender?<small>{them} takes the win.</small></p>
          <div className="row" style={{ justifyContent: "center" }}>
            <button className="btn dim" onClick={() => dlg.current?.close()}>keep playing</button>
            <button className="btn red" onClick={() => (dlg.current?.close(), onSurrender())}>surrender</button>
          </div>
        </div>
      </dialog>
    </>
  );
}

const SHOW = 4000; // ms the flag stays up before it dismisses itself

/** True for a few seconds after a game ends by surrender during this visit (not when opening an old one). */
export function useSurrendered(winner: string | null | undefined, by: string | undefined) {
  const prev = useRef<string | null | undefined>(undefined);
  const [up, setUp] = useState(false);
  useEffect(() => {
    const was = prev.current;
    prev.current = winner;
    if (was !== null || !winner || !by) return;
    setUp(true);
    const t = setTimeout(() => setUp(false), SHOW);
    return () => clearTimeout(t);
  }, [winner, by]);
  return [up, () => setUp(false)] as const;
}

export function Surrendered({ by, me, onClose }: { by: string; me: string; onClose: () => void }) {
  return (
    <div className="surrendered" onClick={onClose}>
      <Flag />
      <div className="plaque">{by === me ? "you surrendered" : `${by} surrendered`}</div>
    </div>
  );
}
