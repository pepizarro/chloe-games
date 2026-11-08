"use client";
import { supabase } from "./supabase";

export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

// Subscribes this browser to push for `player` (asks permission if needed) and saves it. Returns false if denied/unsupported.
export async function subscribePush(player: string): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.register("/sw.js");
  if ((await Notification.requestPermission()) !== "granted") return false;
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY }));
  await supabase.from("push_subs").upsert({ endpoint: sub.endpoint, player, sub: sub.toJSON() });
  return true;
}

// fire and forget
export function notify(to: string, title: string, body: string, url: string) {
  fetch("/api/notify", { method: "POST", body: JSON.stringify({ to, title, body, url }) }).catch(() => {});
}
