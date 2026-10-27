"use client";

import { useCallback, useEffect, useState, useSyncExternalStore } from "react";

export type Loc = { lat: number; lon: number; label: string; source: "gps" | "place" };

const KEY = "gorata:loc";
const DEFAULT: Loc = { lat: 42.698, lon: 23.322, label: "София", source: "place" };

const listeners = new Set<() => void>();
let cached: Loc | null = null;

function read(): Loc {
  if (cached) return cached;
  try {
    const raw = localStorage.getItem(KEY);
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

/** Shared location: GPS (asked for only when the person taps) or a chosen oblast centre. */
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
    if (!("geolocation" in navigator)) {
      setGpsError("Устройството не поддържа местоположение.");
      return;
    }
    setLocating(true);
    setGpsError(null);
    navigator.geolocation.getCurrentPosition(
      (p) => {
        setLocating(false);
        write({ lat: p.coords.latitude, lon: p.coords.longitude, label: "Тук", source: "gps" });
      },
      (e) => {
        setLocating(false);
        setGpsError(
          e.code === e.PERMISSION_DENIED
            ? "Достъпът до местоположение е отказан. Изберете област от списъка."
            : "Не успяхме да определим местоположението. Опитайте отново или изберете област.",
        );
      },
      { enableHighAccuracy: false, timeout: 10000, maximumAge: 300000 },
    );
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
    const cacheKey = `gorata:cache:${url}`;
    fetch(url)
      .then(async (r) => {
        const body = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(body?.error ?? "Данните не са достъпни.");
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
          error: navigator.onLine ? e.message : "Няма връзка с интернет.",
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
