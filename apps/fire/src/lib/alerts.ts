import { sendPush, subStore, type BaseSub } from "@shtit/core/alerts";

import type { Prefs } from "./alert-prefs";

export { DEFAULT_PREFS, type Prefs } from "./alert-prefs";

export type Sub = BaseSub<Prefs, { danger?: string; fires?: string[]; warnings?: string[]; test?: number }>;

/** Older subscriptions stored booleans; read them as the new preferences. */
function normalize(raw: Sub & { danger?: boolean; fires?: boolean }): Sub {
  if (raw.prefs) return raw;
  return {
    ...raw,
    prefs: { danger: raw.danger === false ? "off" : "high", firesKm: raw.fires === false ? 0 : 25, warnings: true },
  };
}

export const { saveSub, getSub, deleteSub, allSubs } = subStore<Sub>(normalize);

export const push = (sub: Sub, payload: { title: string; body: string; url: string; tag: string }) => sendPush("fire", sub, payload);
