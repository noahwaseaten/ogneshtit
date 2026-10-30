import { sendPush, subStore, type BaseSub } from "@shtit/core/alerts";
import type { Prefs } from "./alert-prefs";

export { DEFAULT_PREFS, type Prefs } from "./alert-prefs";

/** sent.day is the date of the last air alert: at most one a day. */
export type Sub = BaseSub<Prefs, { day?: string; test?: number }>;

export const { saveSub, getSub, deleteSub, allSubs } = subStore<Sub>();

export const push = (sub: Sub, payload: { title: string; body: string; url: string; tag: string }) => sendPush("air", sub, payload);
