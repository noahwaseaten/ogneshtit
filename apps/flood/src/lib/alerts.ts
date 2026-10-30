import { sendPush, subStore, type BaseSub } from "@shtit/core/alerts";
import type { Prefs } from "./alert-prefs";

export { DEFAULT_PREFS, type Prefs } from "./alert-prefs";

/** sent.river is the highest level already announced for the current rise of the river. */
export type Sub = BaseSub<Prefs, { river?: string; warnings?: string[]; test?: number }>;

export const { saveSub, getSub, deleteSub, allSubs } = subStore<Sub>();

export const push = (sub: Sub, payload: { title: string; body: string; url: string; tag: string }) => sendPush("flood", sub, payload);
