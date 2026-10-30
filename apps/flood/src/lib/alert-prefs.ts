// Alert choices, shared by the Settings card (client) and the alert job (server). No server imports here.

/** What the person wants to hear about. Defaults are quiet on purpose. */
export type Prefs = {
  /** The river at the place is forecast to reach this level within 3 days ("high" = over its 2-year flow). */
  river: "off" | "high" | "veryhigh";
  /** НИМХ orange and red warnings for rain, floods, snow and ice in the place's oblast. */
  warnings: boolean;
};
export const DEFAULT_PREFS: Prefs = { river: "high", warnings: true };
