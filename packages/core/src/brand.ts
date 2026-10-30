import type { Lang } from "./i18n/lang";

// The Щит family: one emblem (a shield) with a different centre for each danger, the same look and the
// same "…Щит" name. Each app lives on its own subdomain and installs on its own; the hub links them.

export type AppId = "fire" | "flood" | "hub";

export type Brand = {
  id: AppId;
  name: Record<Lang, string>;
  /** One line on what the app answers, for cards in the hub and the app switcher. */
  tagline: Record<Lang, [string, string]>;
  /** Public address. NEXT_PUBLIC_URL_* overrides it while a new subdomain is being set up. */
  url: string;
  /** Icon background, light theme accent and the centre of the emblem (images cannot use CSS variables). */
  color: string;
  mark: string;
  /** Pale shield on the coloured background. */
  shield: string;
  /** Page background in the light and dark themes (browser bar colour, splash screen). */
  surface: { light: string; dark: string };
};

const url = (env: string | undefined, fallback: string) => (env?.trim() || fallback).replace(/\/$/, "");

export const BRANDS: Record<AppId, Brand> = {
  fire: {
    id: "fire",
    name: { bg: "ОгнеЩит", en: "Fire Shield" },
    tagline: { bg: ["Горски пожари", "Опасност днес, огън от спътник, сигнали"], en: ["Forest fires", "Danger today, fires from space, reports"] },
    url: url(process.env.NEXT_PUBLIC_URL_FIRE, "https://fire.noahwaseaten.com"),
    color: "#1f5b3e",
    mark: "#e0482c",
    shield: "#f3f5f1",
    surface: { light: "#f3f5f1", dark: "#0e1411" },
  },
  flood: {
    id: "flood",
    name: { bg: "ВодоЩит", en: "Flood Shield" },
    tagline: { bg: ["Наводнения", "Реките днес, дъжд и топене на сняг"], en: ["Floods", "Rivers today, rain and melting snow"] },
    url: url(process.env.NEXT_PUBLIC_URL_FLOOD, "https://flood.noahwaseaten.com"),
    color: "#1c4a75",
    mark: "#2e8bdc",
    shield: "#f1f5f9",
    surface: { light: "#eef3f7", dark: "#0c1218" },
  },
  hub: {
    id: "hub",
    name: { bg: "Щит", en: "Shield" },
    tagline: { bg: ["Всички приложения", "Огън и вода на едно място"], en: ["All apps", "Fire and water in one place"] },
    url: url(process.env.NEXT_PUBLIC_URL_HUB, "https://shield.noahwaseaten.com"),
    color: "#24313c",
    mark: "#e0482c",
    shield: "#f2f4f6",
    surface: { light: "#f2f4f6", dark: "#0f1317" },
  },
};

/** The apps a person can install (the hub is a front door, not a tool). */
export const TOOLS: AppId[] = ["fire", "flood"];

export const REPO = "https://github.com/noahwaseaten/ogneshtit";

/** Sent with server requests to public sources, so they know who is asking. */
export const userAgent = (app: AppId) => `Shtit-${app}/2.0 (+${REPO})`;

/** Which app the hub puts first: fire in the warm half of the year (May to October), floods in the cold half. */
export function seasonFirst(month: number): AppId {
  return month >= 5 && month <= 10 ? "fire" : "flood";
}
