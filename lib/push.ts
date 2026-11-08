"use client";
import { supabase } from "./supabase";

export const pushSupported = () => typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window;

// Subscribes this browser to push for `player` (asks permission if needed) and saves it. Returns false if denied/unsupported.
export async function subscribePush(player: string): Promise<boolean> {
  if (!pushSupported()) return false;
  const reg = await navigator.serviceWorker.register("/sw.js");
  if ((await Notification.requestPermission()) !== "granted") return false;
  let sub = await reg.pushManager.getSubscription();
  const fresh = !sub;
  sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY });
  const { error } = await supabase.from("push_subs").upsert({ endpoint: sub.endpoint, player, sub: sub.toJSON() });
  if (error) return alert(error.message), false;
  if (fresh) notify(player, "Games", "notifications are on!", "/"); // self-test
  return true;
}

/** Is this browser currently subscribed? */
export async function hasPush(): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== "granted") return false;
  const reg = await navigator.serviceWorker.getRegistration();
  return !!(await reg?.pushManager.getSubscription());
}

export async function unsubscribePush() {
  const sub = await (await navigator.serviceWorker.getRegistration())?.pushManager.getSubscription();
  if (!sub) return;
  await supabase.from("push_subs").delete().eq("endpoint", sub.endpoint);
  await sub.unsubscribe();
}

// fire and forget
export function notify(to: string, title: string, body: string, url: string) {
  fetch("/api/notify", { method: "POST", body: JSON.stringify({ to, title, body, url }) }).catch(() => {});
}
