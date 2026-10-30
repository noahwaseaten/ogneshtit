// Alert choices, shared by the Settings card (client) and the alert job (server). No server imports here.

/** What the person wants to hear about. Defaults are quiet on purpose. */
export type Prefs = {
  danger: "off" | "high" | "veryhigh"; // alert once a day when the level reaches this
  firesKm: 0 | 10 | 25 | 50; // new satellite fire within this distance; 0 = off
  warnings: boolean; // НИМХ orange and red warnings for the oblast
};
export const DEFAULT_PREFS: Prefs = { danger: "high", firesKm: 25, warnings: true };
