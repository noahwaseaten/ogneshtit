"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type Loc = { lat: number; lon: number; label: string; source: "gps" | "place"; region?: string };

const KEY = "ogneshtit:loc";
const OLD_KEY = "gorata:loc"; // name used before the app became ОгнеЩит
const DEFAULT: Loc = { lat: 42.698, lon: 23.322, label: "София", source: "place" };

const listeners = new Set<() => void>();
let cached: Loc | null = null;

function read(): Loc {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(KEY) ?? localStorage.getItem(OLD_KEY);
    if (raw) cached = JSON.parse(raw) as Loc;
  } catch {}
  return cached ?? DEFAULT;
}

function write(loc: Loc) {
  cached = loc;
  try {
    localStorage.setItem(KEY, JSON.stringify(loc));
  } catch {}
  listeners.forEach((l) => l());
}

/** Shared location: GPS (asked for only when the person taps), a searched place or an oblast centre. */
export function useLocation() {
  const loc = useSyncExternalStore(
    (cb) => {
      listeners.add(cb);
      return () => listeners.delete(cb);
    },
    read,
    () => DEFAULT,
  );
  const [locating, setLocating] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const requestGps = useCallback(() => {
    setLocating(true);
    setGpsError(null);
    getPosition()
      .then((p) => write({ lat: p.coords.latitude, lon: p.coords.longitude, label: "Тук", source: "gps" }))
      .catch((e: Error) => setGpsError(e.message))
      .finally(() => setLocating(false));
  }, []);

  return { loc, setLoc: write, requestGps, locating, gpsError };
}

type Result<T> = { key: string; url: string; data: T | null; error: string | null; offline: boolean };

/** Fetch JSON; on failure fall back to the last good copy kept in localStorage. */
export function useJson<T>(url: string | null) {
  const [nonce, setNonce] = useState(0);
  const [res, setRes] = useState<Result<T> | null>(null);
  const key = url ? `${url}#${nonce}` : null;

  useEffect(() => {
    if (!url || !key) return;
    let alive = true;
    const cacheKey = `ogneshtit:cache:${url}`;
    fetch(url)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.error ?? "Данните не се заредиха.");
        return body as T;
      })
      .then((data) => {
        if (!alive) return;
        try {
          localStorage.setItem(cacheKey, JSON.stringify(data));
        } catch {}
        setRes({ key, url, data, error: null, offline: false });
      })
      .catch((e: Error) => {
        if (!alive) return;
        let stale: T | null = null;
        try {
          const raw = localStorage.getItem(cacheKey);
          if (raw) stale = JSON.parse(raw) as T;
        } catch {}
        setRes({
          key,
          url,
          data: stale,
          error: navigator.onLine ? e.message : "Нямате връзка с интернет.",
          offline: !!stale,
        });
      });
    return () => {
      alive = false;
    };
  }, [url, key]);

  // Only show data for the URL being asked for: never another place's risk while loading.
  const same = !!res && res.url === url;
  return {
    data: same ? res.data : null,
    error: same && res.key === key ? res.error : null,
    offline: same ? res.offline : false,
    loading: !!key && res?.key !== key,
    retry: () => setNonce((n) => n + 1),
  };
}

export function timeAgo(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 60) return `преди ${mins} мин`;
  const h = Math.round(mins / 60);
  if (h < 24) return `преди ${h} ч`;
  return `преди ${Math.round(h / 24)} дни`;
}

export const weekday = (date: string) =>
  new Intl.DateTimeFormat("bg-BG", { weekday: "short", timeZone: "UTC" }).format(new Date(date + "T00:00:00Z"));

const plural = (n: number, one: string, many: string) => `${n} ${n === 1 ? one : many}`;

export function timeAgoLong(iso: string) {
  const mins = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 60000));
  if (mins < 1) return "току-що";
  if (mins < 60) return `преди ${plural(mins, "минута", "минути")}`;
  const h = Math.round(mins / 60);
  if (h < 24) return `преди ${plural(h, "час", "часа")}`;
  return `преди ${plural(Math.round(h / 24), "ден", "дни")}`;
}

export const nf = (n: number, digits = 0) => n.toLocaleString("bg-BG", { maximumFractionDigits: digits });

export const sofiaTime = (iso: string, opts: Intl.DateTimeFormatOptions) =>
  new Date(iso).toLocaleString("bg-BG", { timeZone: "Europe/Sofia", ...opts });

/** Media query as state, e.g. useMedia("(min-width: 1024px)"). False on the server. */
export function useMedia(query: string) {
  return useSyncExternalStore(
    (cb) => {
      const m = window.matchMedia(query);
      m.addEventListener("change", cb);
      return () => m.removeEventListener("change", cb);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}

// Theme: "system" follows the device; the choice is applied before paint by a script in layout.tsx.
export type ThemeChoice = "system" | "light" | "dark";
const THEME_KEY = "ogneshtit:theme";
const themeListeners = new Set<() => void>();

function readTheme(): ThemeChoice {
  try {
    const t = localStorage.getItem(THEME_KEY);
    if (t === "light" || t === "dark") return t;
  } catch {}
  return "system";
}

export function applyTheme(t: ThemeChoice) {
  try {
    if (t === "system") localStorage.removeItem(THEME_KEY);
    else localStorage.setItem(THEME_KEY, t);
  } catch {}
  const root = document.documentElement;
  root.classList.add("theme-switching");
  requestAnimationFrame(() => requestAnimationFrame(() => root.classList.remove("theme-switching")));
  if (t === "system") root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", t);
  themeListeners.forEach((l) => l());
}

export function useTheme() {
  const theme = useSyncExternalStore(
    (cb) => {
      themeListeners.add(cb);
      return () => themeListeners.delete(cb);
    },
    readTheme,
    () => "system" as ThemeChoice,
  );
  return [theme, applyTheme] as const;
}

/** "в София", but "във Варна" / "във Велико Търново" before в and ф. */
export const inPlace = (name: string) => `${/^[ВвФф]/.test(name) ? "във" : "в"} ${name}`;

/**
 * One reliable way to ask for the position. Tries a quick, coarse fix first and then a precise one,
 * and turns every failure into a sentence a person can act on (Safari on iPhone is the strict one).
 */
export async function getPosition(precise = false): Promise<GeolocationPosition> {
  if (typeof window === "undefined" || !("geolocation" in navigator)) throw new Error("Това устройство не дава местоположение.");
  if (!window.isSecureContext) throw new Error("Местоположението работи само през защитена връзка (https).");
  const ask = (high: boolean, timeout: number, maximumAge: number) =>
    new Promise<GeolocationPosition>((res, rej) =>
      navigator.geolocation.getCurrentPosition(res, rej, { enableHighAccuracy: high, timeout, maximumAge }),
    );
  try {
    return await ask(precise, precise ? 15000 : 8000, precise ? 0 : 300000);
  } catch (e) {
    const err = e as GeolocationPositionError;
    if (err.code === 1) {
      const ios = /iPhone|iPad|iPod/.test(navigator.userAgent);
      throw new Error(
        ios
          ? "Нямаме достъп до местоположението. На iPhone: Настройки → Поверителност и сигурност → Услуги за местоположение → Уебсайтове в Safari → „Докато се ползва“. После презаредете страницата."
          : "Нямаме достъп до местоположението. Разрешете го за този сайт от иконата до адреса и опитайте пак.",
      );
    }
    // Timed out or no fix yet: one more try with the other accuracy and more time.
    try {
      return await ask(!precise, 20000, 600000);
    } catch {
      throw new Error("Телефонът не намери местоположение. Излезте на открито или включете услугите за местоположение и опитайте пак.");
    }
  }
}
