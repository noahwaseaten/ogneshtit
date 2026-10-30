// Alert choices, shared by the Settings card (client) and the alert job (server). No server imports here.

/** What the person wants to hear about. Defaults are quiet on purpose. */
export type Prefs = {
  /** A morning alert when today's daytime air at the place is forecast to reach this band. */
  level: "off" | "moderate" | "poor" | "verypoor";
  /** Word the alert for sensitive people (children, older people, asthma, heart or lung disease). */
  sensitive: boolean;
};
export const DEFAULT_PREFS: Prefs = { level: "poor", sensitive: false };
