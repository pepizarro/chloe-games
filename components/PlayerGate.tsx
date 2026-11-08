"use client";
import Link from "next/link";
import { PLAYERS, setPlayer, usePlayer } from "@/lib/player";

import { Icon, PLAYER_ICON } from "./Icon";


export function PlayerGate({ children }: { children: React.ReactNode }) {
  const me = usePlayer();
  if (!me)
    return (
      <div className="gate">
        <div className="plaque">who&apos;s playing?</div>
        <div className="row" style={{ justifyContent: "center" }}>
          {PLAYERS.map((p) => (
            <button key={p} className="pick" onClick={() => setPlayer(p)}>
              <Icon name={PLAYER_ICON[p]} />
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
          <Icon name={PLAYER_ICON[me]} />
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
