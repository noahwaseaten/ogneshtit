import type { Lang } from "./i18n/lang";

// The Щит family: one emblem (a shield) with a different centre for each danger, the same look and the
// same "…Щит" name. Each app lives on its own subdomain and installs on its own; the hub links them.

export type AppId = "fire" | "flood" | "air" | "hub";

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
  air: {
    id: "air",
    name: { bg: "ВъздухоЩит", en: "Air Shield" },
    tagline: { bg: ["Въздух и смог", "Може ли да излезете, кога да проветрите"], en: ["Air and smog", "Is it OK to go out, when to air the room"] },
    url: url(process.env.NEXT_PUBLIC_URL_AIR, "https://air.noahwaseaten.com"),
    color: "#0d5e6b",
    mark: "#5cc4d1",
    shield: "#eff6f7",
    surface: { light: "#edf4f5", dark: "#0b1416" },
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
export const TOOLS: AppId[] = ["air", "flood", "fire"];

/** Every app, in the order the family is listed. */
export const ALL_APPS: AppId[] = ["air", "flood", "fire", "hub"];

export const REPO = "https://github.com/noahwaseaten/ogneshtit";

/** Sent with server requests to public sources, so they know who is asking. */
export const userAgent = (app: AppId) => `Shtit-${app}/2.0 (+${REPO})`;

/**
 * The tools in the order the hub shows them this month. Fire leads in the warm half of the year (April to September);
 * air leads in the cold half, when home heating fills Bulgarian towns with smoke.
 */
export function seasonOrder(month: number): AppId[] {
  return month >= 4 && month <= 9 ? ["fire", "flood", "air"] : ["air", "flood", "fire"];
}
