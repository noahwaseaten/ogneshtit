"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, LocateFixed, MapPin, Search } from "lucide-react";
import { PLACES } from "@/data/places";
import { useLocation, type Loc } from "@/lib/client";
import { Sheet } from "./Sheet";
import { useI18n } from "@/i18n/client";
import { placeName } from "@/i18n/names";
import type { Lang } from "@/i18n/lang";

type GeoResult = { id: number; name: string; latitude: number; longitude: number; admin1?: string; admin2?: string; feature_code?: string };

type PhotonFeature = {
  geometry: { coordinates: [number, number] };
  properties: { osm_id: number; name?: string; state?: string; county?: string; countrycode?: string; osm_key?: string };
};

async function openMeteo(query: string, lang: Lang): Promise<GeoResult[]> {
  const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
  url.search = new URLSearchParams({ name: query, count: "10", language: lang, countryCode: "BG", format: "json" }).toString();
  const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(`geocoding ${r.status}`);
  return ((await r.json()) as { results?: GeoResult[] }).results ?? [];
}

/** Backup geocoder: Photon (OpenStreetMap data, free, no key), limited to Bulgaria. */
async function photon(query: string): Promise<GeoResult[]> {
  const url = new URL("https://photon.komoot.io/api/");
  url.search = new URLSearchParams({ q: query, limit: "15", bbox: "22.3,41.2,28.7,44.3" }).toString();
  const r = await fetch(url, { signal: AbortSignal.timeout(6000) });
  if (!r.ok) throw new Error(`photon ${r.status}`);
  const fs = ((await r.json()) as { features?: PhotonFeature[] }).features ?? [];
  return fs
    .filter((f) => f.properties.countrycode === "BG" && f.properties.name && f.properties.osm_key === "place")
    .slice(0, 10)
    .map((f) => ({
      id: f.properties.osm_id,
      name: f.properties.name!,
      latitude: f.geometry.coordinates[1],
      longitude: f.geometry.coordinates[0],
      admin1: f.properties.state,
      admin2: f.properties.county,
    }));
}

/** Last resort with no network: the oblast capitals we ship with the app. */
function local(query: string): GeoResult[] {
  const q = query.trim().toLowerCase();
  return PLACES.filter((p) => p.name.toLowerCase().includes(q) || placeName(p.name, "en").toLowerCase().includes(q)).map((p, i) => ({
    id: -1 - i,
    name: p.name,
    latitude: p.lat,
    longitude: p.lon,
  }));
}

/** Any town or village in Bulgaria: Open-Meteo's geocoder, then Photon, then the built-in list. */
function usePlaceSearch(q: string, lang: Lang) {
  const [res, setRes] = useState<{ q: string; items: GeoResult[] } | null>(null);
  const query = q.trim();
  useEffect(() => {
    if (query.length < 2) return;
    let alive = true;
    const t = setTimeout(async () => {
      let items: GeoResult[] = [];
      for (const find of [() => openMeteo(query, lang), () => photon(query)]) {
        try {
          items = await find();
          break;
        } catch {
          // try the next one
        }
      }
      if (items.length === 0) items = local(query);
      if (alive) setRes({ q: query, items });
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query, lang]);
  if (query.length < 2) return { items: null, loading: false };
  return { items: res?.q === query ? res.items : null, loading: res?.q !== query };
}

export function LocationPicker() {
  const { loc, setLoc, requestGps, locating, gpsError } = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const { t, lang } = useI18n();
  const search = usePlaceSearch(q, lang);
  const here = loc.source === "gps" ? t("Моето местоположение", "My location") : placeName(loc.label, lang);

  // Close once a new position arrives (GPS, a search result or an oblast).
  const key = `${loc.lat},${loc.lon}`;
  const [prevKey, setPrevKey] = useState(key);
  if (key !== prevKey) {
    setPrevKey(key);
    setOpen(false);
    setQ("");
  }

  const pick = (l: Loc) => setLoc(l);

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="pressable hover-fill -ml-3 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full px-3 text-[16px] font-semibold text-content"
        aria-label={t(`Място: ${here}. Смени`, `Place: ${here}. Change`)}
      >
        {loc.source === "gps" ? <LocateFixed size={18} strokeWidth={2} aria-hidden /> : <MapPin size={18} strokeWidth={2} aria-hidden />}
        <span className="truncate">{here}</span>
        <ChevronDown size={16} strokeWidth={2} className="shrink-0 text-muted" aria-hidden />
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("Изберете място", "Choose a place")}
        description={t("Ползваме го само за прогнозата и близките пожари. Не го пазим никъде освен на вашето устройство.", "We use it only for the forecast and nearby fires. It stays on your device.")}
      >
        <button
          onClick={requestGps}
          disabled={locating}
          className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-[16px] font-semibold text-accent-content disabled:opacity-60"
        >
          <LocateFixed size={20} strokeWidth={2} aria-hidden />
          {locating ? t("Търсим ви…", "Finding you…") : t("Използвай моето местоположение", "Use my location")}
        </button>
        {gpsError && (
          <p role="alert" className="pt-2 text-[14px] text-ember">
            {gpsError}
          </p>
        )}

        <label className="relative mt-4 block">
          <span className="sr-only">{t("Търсене на населено място", "Search for a town or village")}</span>
          <Search size={18} strokeWidth={2} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t("Град или село, напр. Банско", "Town or village, e.g. Bansko")}
            autoComplete="off"
            enterKeyHint="search"
            className="min-h-12 w-full rounded-2xl border border-line bg-surface pl-10 pr-3 text-[16px] outline-none placeholder:text-muted focus:border-accent"
          />
        </label>

        {search.items !== null || search.loading ? (
          <div aria-live="polite" className="pt-2">
            {search.loading && <p className="px-1 py-3 text-[15px] text-muted">{t("Търсим…", "Searching…")}</p>}
            {search.items?.length === 0 && <p className="px-1 py-3 text-[15px] text-muted">{t("Не намерихме такова място в България.", "We couldn't find that place in Bulgaria.")}</p>}
            <ul className="-mx-3">
              {search.items?.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => pick({ lat: r.latitude, lon: r.longitude, label: r.name, source: "place", region: r.admin1 })}
                    className="hover-fill flex min-h-12 w-full flex-col justify-center rounded-xl px-3 py-2 text-left"
                  >
                    <span className="text-[16px] font-medium">{r.name}</span>
                    <span className="text-[13px] text-muted">{[r.admin2, r.admin1].filter(Boolean).join(", ")}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        ) : (
          <>
            <p className="px-1 pb-1 pt-5 text-[14px] font-medium text-muted">{t("Областни градове", "Oblast capitals")}</p>
            <ul className="-mx-3 grid grid-cols-1 sm:grid-cols-2">
              {PLACES.map((p) => {
                const selected = loc.source === "place" && loc.label === p.name;
                return (
                  <li key={p.name}>
                    <button
                      onClick={() => pick({ ...p, label: p.name, source: "place" })}
                      className="hover-fill flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-left text-[16px]"
                    >
                      {placeName(p.name, lang)}
                      {selected && <Check size={20} strokeWidth={2} className="text-accent" aria-label={t("Избрано", "Selected")} />}
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </Sheet>
    </>
  );
}
