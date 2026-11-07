"use client";
import { useSyncExternalStore } from "react";

export const PLAYERS = ["pedro", "chloe"] as const;
export type Player = (typeof PLAYERS)[number];

const KEY = "player";
const listeners = new Set<() => void>();

export function setPlayer(p: Player | null) {
  if (p) localStorage.setItem(KEY, p);
  else localStorage.removeItem(KEY);
  listeners.forEach((l) => l());
}

export function usePlayer(): Player | null {
  return useSyncExternalStore(
    (l) => (listeners.add(l), () => listeners.delete(l)),
    () => localStorage.getItem(KEY) as Player | null,
    () => null,
  );
}

export const other = (p: string) => PLAYERS.find((x) => x !== p)!;
