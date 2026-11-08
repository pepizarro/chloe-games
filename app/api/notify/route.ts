import * as webpush from "web-push";
import { createClient } from "@supabase/supabase-js";

webpush.setVapidDetails("mailto:peter@ruuf.solar", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);

export async function POST(req: Request) {
  const { to, title, body, url } = await req.json();
  const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
  const { data: subs } = await db.from("push_subs").select("endpoint, sub").eq("player", to);
  const payload = JSON.stringify({ title, body, url });
  await Promise.all(
    (subs ?? []).map((s) =>
      webpush.sendNotification(s.sub as webpush.PushSubscription, payload).catch(async (e) => {
        if (e.statusCode === 404 || e.statusCode === 410) await db.from("push_subs").delete().eq("endpoint", s.endpoint);
      }),
    ),
  );
  return Response.json({ sent: subs?.length ?? 0 });
}
