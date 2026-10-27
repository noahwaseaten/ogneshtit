"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useLang } from "@/i18n/client";
import type { Lang } from "@/i18n/lang";

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
  const lang = useLang();

  const requestGps = useCallback(() => {
    setLocating(true);
    setGpsError(null);
    getPosition(false, lang)
      .then((p) => write({ lat: p.coords.latitude, lon: p.coords.longitude, label: "Тук", source: "gps" }))
      .catch((e: Error) => setGpsError(e.message))
      .finally(() => setLocating(false));
  }, [lang]);

  return { loc, setLoc: write, requestGps, locating, gpsError };
}

type Result<T> = { key: string; url: string; data: T | null; error: string | null; offline: boolean };

/** Fetch JSON; on failure fall back to the last good copy kept in localStorage. */
export function useJson<T>(url: string | null) {
  const [nonce, setNonce] = useState(0);
  const [res, setRes] = useState<Result<T> | null>(null);
  const lang = useLang();
  const key = url ? `${url}#${nonce}` : null;

  useEffect(() => {
    if (!url || !key) return;
    let alive = true;
    const cacheKey = `ogneshtit:cache:${url}`;
    fetch(url)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.error ?? (lang === "bg" ? "Данните не се заредиха." : "The data didn't load."));
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
          error: navigator.onLine ? e.message : lang === "bg" ? "Нямате връзка с интернет." : "You're offline.",
          offline: !!stale,
        });
      });
    return () => {
      alive = false;
    };
  }, [url, key, lang]);

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

// Advanced: extra detail most people do not need (the satellite schedule on Today). Off by default.
const ADV_KEY = "ogneshtit:advanced";
const advListeners = new Set<() => void>();
const readAdvanced = () => {
  try {
    return localStorage.getItem(ADV_KEY) === "1";
  } catch {
    return false;
  }
};

export function useAdvanced() {
  const on = useSyncExternalStore(
    (cb) => {
      advListeners.add(cb);
      return () => advListeners.delete(cb);
    },
    readAdvanced,
    () => false,
  );
  const set = (v: boolean) => {
    try {
      localStorage.setItem(ADV_KEY, v ? "1" : "0");
    } catch {}
    advListeners.forEach((l) => l());
  };
  return [on, set] as const;
}

/**
 * One reliable way to ask for the position. Tries a quick, coarse fix first and then a precise one,
 * and turns every failure into a sentence a person can act on (Safari on iPhone is the strict one).
 */
export async function getPosition(precise = false, lang: Lang = "bg"): Promise<GeolocationPosition> {
  const t = <T,>(bg: T, en: T) => (lang === "bg" ? bg : en);
  if (typeof window === "undefined" || !("geolocation" in navigator)) throw new Error(t("Това устройство не дава местоположение.", "This device can't share its location."));
  if (!window.isSecureContext) throw new Error(t("Местоположението работи само през защитена връзка (https).", "Location only works over a secure connection (https)."));
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
          ? t(
              "Нямаме достъп до местоположението. На iPhone: Настройки → Поверителност и сигурност → Услуги за местоположение → Уебсайтове в Safari → „Докато се ползва“. После презаредете страницата.",
              "We can't see your location. On iPhone: Settings → Privacy & Security → Location Services → Safari Websites → While Using the App. Then reload the page.",
            )
          : t(
              "Нямаме достъп до местоположението. Разрешете го за този сайт от иконата до адреса и опитайте пак.",
              "We can't see your location. Allow it for this site from the icon next to the address and try again.",
            ),
      );
    }
    // Timed out or no fix yet: one more try with the other accuracy and more time.
    try {
      return await ask(!precise, 20000, 600000);
    } catch {
      throw new Error(
        t(
          "Телефонът не намери местоположение. Излезте на открито или включете услугите за местоположение и опитайте пак.",
          "Your phone couldn't find its location. Step outside or turn on location services and try again.",
        ),
      );
    }
  }
}

/** The current time, rounded to the minute and refreshed every minute; 0 while prerendering. */
const minute = () => Math.floor(Date.now() / 60e3) * 60e3;
const everyMinute = (cb: () => void) => {
  const id = setInterval(cb, 60e3);
  return () => clearInterval(id);
};
export function useNow() {
  return useSyncExternalStore(everyMinute, minute, () => 0);
}
