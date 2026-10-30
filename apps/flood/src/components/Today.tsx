"use client";

import Link from "next/link";
import { useMemo, useState, useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { useJson, useLocation } from "@shtit/core/client";
import { oblastAt } from "@shtit/core/oblast";
import { LocationPicker } from "@shtit/core/ui/LocationPicker";
import { useI18n } from "@shtit/core/i18n/client";
import { localeOf } from "@shtit/core/i18n/lang";
import { NEAR_KM, type GaugesResponse, type PlaceResponse } from "@/lib/flood-types";
import { FloodCard, FloodForecast } from "./FloodCard";
import { RainSnow, Warnings } from "./Conditions";
import { GaugeMap } from "./GaugeMap";
import { RiverRow } from "./RiverRow";
import { RiverSheet } from "./RiverSheet";
import { Alerts } from "./Alerts";

const fmt = (lang: "bg" | "en") => new Intl.DateTimeFormat(localeOf(lang), { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Sofia" });
const todayBg = () => fmt("bg").format(new Date());
const todayEn = () => fmt("en").format(new Date());
const noop = () => () => {};

export function Today() {
  const { loc } = useLocation();
  const { t, lang } = useI18n();
  const place = useJson<PlaceResponse>(`/api/place?lat=${loc.lat.toFixed(3)}&lon=${loc.lon.toFixed(3)}`);
  const all = useJson<GaugesResponse>("/api/gauges");
  const [river, setRiver] = useState<string | null>(null);
  // The date is rendered on the device only, so a prerendered page never shows a stale day.
  const date = useSyncExternalStore(noop, lang === "bg" ? todayBg : todayEn, () => "");
  const oblast = useMemo(() => oblastAt(loc.lat, loc.lon)?.name ?? null, [loc.lat, loc.lon]);
  const p = place.data;
  // The river on the card first, then the other points within 25 km.
  const main = p?.river ? all.data?.gauges.find((g) => g.id === p.river!.gauge) : undefined;
  const near = [...(main && p?.river ? [{ ...main, km: p.river.km }] : []), ...(p?.others ?? [])];

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-10">
      <div className="flex min-w-0 flex-col gap-8">
        <header className="flex flex-col gap-0.5">
          <h1 className="sr-only">{t("ВодоЩит: опасност от наводнение днес", "Flood Shield: flood danger today")}</h1>
          <p className="min-h-5 px-1 text-[14px] font-medium text-muted first-letter:uppercase">{date}</p>
          <LocationPicker />
        </header>
        <FloodCard data={p} loading={place.loading} error={place.error} offline={place.offline} onRetry={place.retry} onRiver={setRiver} loc={loc} />
        {p && <FloodForecast data={p} />}
        <RainSnow weather={p?.weather ?? null} />
        <Warnings oblast={oblast} />
      </div>
      <div className="min-w-0 lg:sticky lg:top-8">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="near-title" className="enter">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 id="near-title" className="font-display text-[20px] font-semibold">
                {t("Реките наоколо", "Rivers around you")}
              </h2>
              <Link href="/karta" className="inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-accent">
                {t("Цяла карта", "Full map")}
                <ArrowRight size={16} strokeWidth={2} aria-hidden />
              </Link>
            </div>
            <div className="mt-2 overflow-hidden rounded-[20px] bg-card">
              <GaugeMap
                ariaLabel={t("Карта на реките в България", "Map of rivers in Bulgaria")}
                statuses={all.data?.gauges}
                onPick={(ids) => setRiver(ids[0])}
                me={{ lat: loc.lat, lon: loc.lon, radiusKm: NEAR_KM }}
                className="aspect-[1000/657]"
              />
              {near.length > 0 ? (
                <div className="divide-y divide-line border-t border-line">
                  {near.map((s) => (
                    <RiverRow key={s.id} s={s} km={s.km} onClick={() => setRiver(s.id)} />
                  ))}
                </div>
              ) : (
                p && (
                  <p className="border-t border-line px-4 py-3 text-[15px] text-muted">
                    {t(`Няма точка от прогнозата за реките до ${NEAR_KM} км. Докоснете точка на картата.`, `No river forecast point within ${NEAR_KM} km. Tap a point on the map.`)}
                  </p>
                )
              )}
            </div>
          </section>
          <Alerts help />
        </div>
      </div>
      <RiverSheet id={river} onClose={() => setRiver(null)} />
    </div>
  );
}
