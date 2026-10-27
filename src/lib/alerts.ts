import { createHash } from "node:crypto";
import { del, get, list, put } from "@vercel/blob";
import webpush, { type PushSubscription } from "web-push";

// Push alert subscriptions, one private JSON blob each. No names or accounts: only the push
// endpoint the browser gave us, the place (rounded to about 1 km) and what was last sent.

/** What the person wants to hear about. Defaults are quiet on purpose. */
export type Prefs = {
  danger: "off" | "high" | "veryhigh"; // alert once a day when the level reaches this
  firesKm: 0 | 10 | 25 | 50; // new satellite fire within this distance; 0 = off
  warnings: boolean; // НИМХ orange and red warnings for the oblast
};
export const DEFAULT_PREFS: Prefs = { danger: "high", firesKm: 25, warnings: true };

export type Sub = {
  subscription: PushSubscription;
  place: { lat: number; lon: number; label: string; oblast?: string };
  prefs: Prefs;
  sent: { danger?: string; fires?: string[]; warnings?: string[]; test?: number }; // what we already sent
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

export async function getSub(endpoint: string): Promise<Sub | null> {
  const r = await get(keyOf(endpoint), { access: "private" }).catch(() => null);
  if (!r?.stream) return null;
  return normalize(JSON.parse(await new Response(r.stream).text()));
}

/** Older subscriptions stored booleans; read them as the new preferences. */
function normalize(raw: Sub & { danger?: boolean; fires?: boolean }): Sub {
  if (raw.prefs) return raw;
  return {
    ...raw,
    prefs: { danger: raw.danger === false ? "off" : "high", firesKm: raw.fires === false ? 0 : 25, warnings: true },
  };
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
      if (r?.stream) out.push(normalize(JSON.parse(await new Response(r.stream).text())));
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
