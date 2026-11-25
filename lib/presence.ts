"use client";
import { useEffect, useSyncExternalStore } from "react";
import { supabase } from "./supabase";
import { other } from "./player";

// Where each player is right now, over Supabase realtime presence: the id of the game they have open, or "" for
// anywhere else in the app. One channel for the whole session (module level, never torn down on navigation), so
// moving between lobby and games is just a re-track rather than a leave and a re-join.
// ponytail: honour system, like the rest of the app. Presence only says a tab is open; it is not a server-side lock.
type Channel = ReturnType<typeof supabase.channel>;
const NOWHERE: string[] = [];
let ch: Channel | null = null, who = "", at = "", joined = false;
let theirs = NOWHERE; // every place the other player has open (one per tab/device)
const listeners = new Set<() => void>();

function join(me: string) {
  const c = (ch = supabase.channel("where", { config: { presence: { key: me } } }));
  c.on("presence", { event: "sync" }, () => {
    if (c !== ch) return;
    theirs = (c.presenceState<{ at: string }>()[other(me)] ?? []).map((p) => p.at);
    listeners.forEach((l) => l());
  }).subscribe((status) => {
    if (c !== ch) return;
    joined = status === "SUBSCRIBED";
    if (joined) c.track({ at });
  });
}

/** Announces that `me` is at `here` (a game id, or "" for the lobby) and returns where the other player is. */
export function useWhere(me: string, here: string): string[] {
  useEffect(() => {
    at = here;
    if (who !== me) {
      // first use, or the dev-only player switch: presence is keyed by player, so start a fresh channel
      const old = ch;
      who = me, ch = null, joined = false, theirs = NOWHERE;
      Promise.resolve(old && supabase.removeChannel(old)).then(() => who === me && !ch && join(me));
    } else if (joined) ch?.track({ at });
    return () => {
      at = ""; // left this page; pages that don't use the hook count as "not in a game"
      if (joined) ch?.track({ at });
    };
  }, [me, here]);
  return useSyncExternalStore((l) => (listeners.add(l), () => listeners.delete(l)), () => theirs, () => NOWHERE);
}
