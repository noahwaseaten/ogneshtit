import { createHash } from "node:crypto";
import { del, get, list, put } from "@vercel/blob";
import webpush, { type PushSubscription } from "web-push";
import { BRANDS, type AppId } from "./brand";

// Push alert subscriptions, one private JSON blob each. No names or accounts: only the push
// endpoint the browser gave us, the place (rounded to about 1 km), the person's choices and what was last sent.
// Every app has its own Blob store, so the same `subs/` prefix never mixes apps.

export type BaseSub<P, S> = {
  subscription: PushSubscription;
  place: { lat: number; lon: number; label: string; oblast?: string };
  prefs: P;
  /** Language of the notifications; the app's language when the person subscribed. */
  lang?: "bg" | "en";
  /** What we already sent, so nothing is repeated. */
  sent: S;
  created: string;
};

const PREFIX = "subs/";
const keyOf = (endpoint: string) => `${PREFIX}${createHash("sha256").update(endpoint).digest("hex").slice(0, 32)}.json`;

/** Load, save and list subscriptions of one shape. `normalize` upgrades blobs saved by older versions. */
export function subStore<T extends BaseSub<unknown, unknown>>(normalize: (raw: T) => T = (x) => x) {
  async function saveSub(sub: T) {
    await put(keyOf(sub.subscription.endpoint), JSON.stringify(sub), {
      access: "private",
      contentType: "application/json",
      allowOverwrite: true,
      addRandomSuffix: false,
    });
  }

  async function getSub(endpoint: string): Promise<T | null> {
    const r = await get(keyOf(endpoint), { access: "private" }).catch(() => null);
    if (!r?.stream) return null;
    return normalize(JSON.parse(await new Response(r.stream).text()));
  }

  async function deleteSub(endpoint: string) {
    await del(keyOf(endpoint)).catch(() => {});
  }

  async function allSubs(): Promise<T[]> {
    const out: T[] = [];
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

  return { saveSub, getSub, deleteSub, allSubs };
}

let configured = false;
/** Sends one notification. The VAPID subject is the app's own address. */
export function sendPush(app: AppId, sub: { subscription: PushSubscription }, payload: { title: string; body: string; url: string; tag: string }) {
  if (!configured) {
    webpush.setVapidDetails(BRANDS[app].url, process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!, process.env.VAPID_PRIVATE_KEY!);
    configured = true;
  }
  return webpush.sendNotification(sub.subscription, JSON.stringify(payload), { TTL: 6 * 3600, urgency: "high" });
}

/** Rounds a coordinate to about 1 km before it is stored. */
export const roundKm = (x: number) => Math.round(x * 100) / 100;

/** Hour of the day in Sofia; alerts stay quiet from 22:00 to 07:00. */
export const sofiaHour = () => Number(new Intl.DateTimeFormat("en-GB", { timeZone: "Europe/Sofia", hour: "2-digit", hourCycle: "h23" }).format(new Date()));
export const quietHours = () => {
  const h = sofiaHour();
  return h >= 22 || h < 7;
};

/** Whether a cron call carries the secret. With no CRON_SECRET set, nothing is allowed (never "Bearer undefined"). */
export function cronAuthorized(req: Request) {
  const secret = process.env.CRON_SECRET;
  return !!secret && req.headers.get("authorization") === `Bearer ${secret}`;
}
