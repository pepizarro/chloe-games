"use client";
import Link from "next/link";
import { PLAYERS, setPlayer, usePlayer } from "@/lib/player";

export function PlayerGate({ children }: { children: React.ReactNode }) {
  const me = usePlayer();
  if (!me)
    return (
      <div className="gate">
        <div className="px">
          <p>who are you?</p>
          <div className="row">
            {PLAYERS.map((p) => (
              <button key={p} className="px" onClick={() => setPlayer(p)}>{p}</button>
            ))}
          </div>
        </div>
      </div>
    );
  return (
    <main>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <Link href="/">⌂ lobby</Link>
        <span>
          {me}
          {process.env.NODE_ENV === "development" && (
            <button className="px" style={{ padding: "2px 6px" }} onClick={() => setPlayer(null)}>switch</button>
          )}
        </span>
      </div>
      {children}
    </main>
  );
}
