import { createHash } from "node:crypto";
import { del, get, list, put } from "@vercel/blob";
import webpush, { type PushSubscription } from "web-push";

// Push alert subscriptions, one private JSON blob each. No names or accounts: only the push
// endpoint the browser gave us, the place (rounded to about 1 km) and what was last sent.

export type Sub = {
  subscription: PushSubscription;
  place: { lat: number; lon: number; label: string };
  danger: boolean; // alert when the day's danger is "висока" or worse
  fires: boolean; // alert when a satellite sees fire nearby
  sent: { danger?: string; fires?: string[] }; // what we already told them
  created: string;
};

const PREFIX = "subs/";
const keyOf = (endpoint: string) => `${PREFIX}${createHash("sha256").update(endpoint).digest("hex").slice(0, 32)}.json`;

export async function saveSub(sub: Sub) {
  await put(keyOf(sub.subscription.endpoint), JSON.stringify(sub), {
    access: "private",
    contentType: "application/json",
    allowOverwrite: true,
    addRandomSuffix: false,
  });
}

export async function deleteSub(endpoint: string) {
  await del(keyOf(endpoint)).catch(() => {});
}

export async function allSubs(): Promise<Sub[]> {
  const out: Sub[] = [];
  let cursor: string | undefined;
  do {
    const page = await list({ prefix: PREFIX, cursor, limit: 1000 });
    for (const b of page.blobs) {
      const r = await get(b.pathname, { access: "private" }).catch(() => null);
      if (r?.stream) out.push(JSON.parse(await new Response(r.stream).text()) as Sub);
    }
    cursor = page.hasMore ? page.cursor : undefined;
  } while (cursor);
  return out;
}

let configured = false;
export function push(sub: Sub, payload: { title: string; body: string; url: string; tag: string }) {
  if (!configured) {
    webpush.setVapidDetails("https://ogneshtit.noahwaseaten.com", process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
  return webpush.sendNotification(sub.subscription, JSON.stringify(payload), { TTL: 6 * 3600, urgency: "high" });
}
