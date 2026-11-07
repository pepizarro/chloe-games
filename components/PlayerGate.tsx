"use client";
import Link from "next/link";
import { PLAYERS, setPlayer, usePlayer } from "@/lib/player";

export const CHIP: Record<string, string> = { pedro: "blue", chloe: "red" };

export function Chip({ tone, glyph }: { tone: string; glyph: string }) {
  return <i className={`chip ${tone}`}>{glyph}</i>;
}

export function PlayerGate({ children }: { children: React.ReactNode }) {
  const me = usePlayer();
  if (!me)
    return (
      <div className="gate">
        <div className="plaque">who&apos;s playing?</div>
        <div className="row" style={{ justifyContent: "center" }}>
          {PLAYERS.map((p) => (
            <button key={p} className="pick" onClick={() => setPlayer(p)}>
              <Chip tone={CHIP[p]} glyph={p[0].toUpperCase()} />
              {p}
            </button>
          ))}
        </div>
      </div>
    );
  return (
    <main>
      <div className="topbar panel">
        <Link href="/" className="btn gold tag">◂ casino</Link>
        <span className="row" style={{ gap: 6 }}>
          <Chip tone={CHIP[me]} glyph={me[0].toUpperCase()} />
          {me}
          {process.env.NODE_ENV === "development" && (
            <button className="btn dim" style={{ padding: "4px 8px", fontSize: 9 }} onClick={() => setPlayer(null)}>switch</button>
          )}
        </span>
      </div>
      {children}
    </main>
  );
}
