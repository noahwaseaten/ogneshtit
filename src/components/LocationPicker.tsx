"use client";

import { useEffect, useState } from "react";
import { Check, ChevronDown, LocateFixed, MapPin, Search } from "lucide-react";
import { PLACES } from "@/data/places";
import { useLocation, type Loc } from "@/lib/client";
import { Sheet } from "./Sheet";

type GeoResult = { id: number; name: string; latitude: number; longitude: number; admin1?: string; admin2?: string; feature_code?: string };

/** Any town or village in Bulgaria, via Open-Meteo's free geocoder (GeoNames data). */
function usePlaceSearch(q: string) {
  const [res, setRes] = useState<{ q: string; items: GeoResult[] } | null>(null);
  const query = q.trim();
  useEffect(() => {
    if (query.length < 2) return;
    let alive = true;
    const t = setTimeout(() => {
      const url = new URL("https://geocoding-api.open-meteo.com/v1/search");
      url.search = new URLSearchParams({ name: query, count: "10", language: "bg", countryCode: "BG", format: "json" }).toString();
      fetch(url)
        .then((r) => r.json())
        .then((d: { results?: GeoResult[] }) => alive && setRes({ q: query, items: d.results ?? [] }))
        .catch(() => alive && setRes({ q: query, items: [] }));
    }, 250);
    return () => {
      alive = false;
      clearTimeout(t);
    };
  }, [query]);
  if (query.length < 2) return { items: null, loading: false };
  return { items: res?.q === query ? res.items : null, loading: res?.q !== query };
}

export function LocationPicker() {
  const { loc, setLoc, requestGps, locating, gpsError } = useLocation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const search = usePlaceSearch(q);

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
        className="pressable -ml-2 inline-flex min-h-11 max-w-full items-center gap-1.5 rounded-full px-2 text-[16px] font-semibold text-content hover:bg-line/60"
        aria-label={`Място: ${loc.source === "gps" ? "моето местоположение" : loc.label}. Смени`}
      >
        {loc.source === "gps" ? <LocateFixed size={18} strokeWidth={2} aria-hidden /> : <MapPin size={18} strokeWidth={2} aria-hidden />}
        <span className="truncate">{loc.source === "gps" ? "Моето местоположение" : loc.label}</span>
        <ChevronDown size={16} strokeWidth={2} className="shrink-0 text-muted" aria-hidden />
      </button>

      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title="Изберете място"
        description="Ползваме го само за прогнозата и близките пожари. Не го пазим никъде освен на вашето устройство."
      >
        <button
          onClick={requestGps}
          disabled={locating}
          className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-[16px] font-semibold text-accent-content disabled:opacity-60"
        >
          <LocateFixed size={20} strokeWidth={2} aria-hidden />
          {locating ? "Търсим ви…" : "Използвай моето местоположение"}
        </button>
        {gpsError && (
          <p role="alert" className="pt-2 text-[14px] text-ember">
            {gpsError}
          </p>
        )}

        <label className="relative mt-4 block">
          <span className="sr-only">Търсене на населено място</span>
          <Search size={18} strokeWidth={2} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-muted" aria-hidden />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Град или село, напр. Банско"
            autoComplete="off"
            enterKeyHint="search"
            className="min-h-12 w-full rounded-2xl border border-line bg-surface pl-10 pr-3 text-[16px] outline-none placeholder:text-muted focus:border-accent"
          />
        </label>

        {search.items !== null || search.loading ? (
          <div aria-live="polite" className="pt-2">
            {search.loading && <p className="px-1 py-3 text-[15px] text-muted">Търсим…</p>}
            {search.items?.length === 0 && <p className="px-1 py-3 text-[15px] text-muted">Не намерихме такова място в България.</p>}
            <ul className="-mx-2">
              {search.items?.map((r) => (
                <li key={r.id}>
                  <button
                    onClick={() => pick({ lat: r.latitude, lon: r.longitude, label: r.name, source: "place", region: r.admin1 })}
                    className="flex min-h-12 w-full flex-col justify-center rounded-xl px-3 py-2 text-left hover:bg-line/50 active:bg-line"
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
            <p className="px-1 pb-1 pt-5 text-[13px] font-medium text-muted">Или изберете областен град</p>
            <ul className="-mx-2 grid grid-cols-1 sm:grid-cols-2">
              {PLACES.map((p) => {
                const selected = loc.source === "place" && loc.label === p.name;
                return (
                  <li key={p.name}>
                    <button
                      onClick={() => pick({ ...p, label: p.name, source: "place" })}
                      className="flex min-h-12 w-full items-center justify-between rounded-xl px-3 text-left text-[16px] hover:bg-line/50 active:bg-line"
                    >
                      {p.name}
                      {selected && <Check size={20} strokeWidth={2} className="text-accent" aria-label="Избрано" />}
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
