"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { ArrowRight } from "lucide-react";
import { useJson, useLocation } from "@shtit/core/client";
import { LocationPicker } from "@shtit/core/ui/LocationPicker";
import { useI18n } from "@shtit/core/i18n/client";
import { localeOf } from "@shtit/core/i18n/lang";
import { PLACES } from "@shtit/core/data/places";
import type { PlaceResponse, SensorsResponse } from "@/lib/air-types";
import { AirCard } from "./AirCard";
import { Planner } from "./Planner";
import { SensorMap } from "./SensorMap";
import { CityRanking } from "./Cities";
import { Alerts } from "./Alerts";

const fmt = (lang: "bg" | "en") => () => new Intl.DateTimeFormat(localeOf(lang), { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Sofia" }).format(new Date());
const noop = () => () => {};

export function Today() {
  const { loc } = useLocation();
  const { t, lang } = useI18n();
  const place = useJson<PlaceResponse>(`/api/place?lat=${loc.lat.toFixed(3)}&lon=${loc.lon.toFixed(3)}`);
  const sensors = useJson<SensorsResponse>("/api/sensors");
  // The date is rendered on the device only, so a prerendered page never shows a stale day.
  const date = useSyncExternalStore(noop, fmt(lang), () => "");
  const city = PLACES.find((p) => p.name === loc.label)?.name;

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-10">
      <div className="flex min-w-0 flex-col gap-8">
        <header className="flex flex-col gap-0.5">
          <h1 className="sr-only">{t("ВъздухоЩит: какъв е въздухът днес", "Air Shield: how is the air today")}</h1>
          <p className="min-h-5 px-1 text-[14px] font-medium text-muted first-letter:uppercase">{date}</p>
          <LocationPicker />
        </header>
        <AirCard data={place.data} loading={place.loading} error={place.error} offline={place.offline} onRetry={place.retry} loc={loc} />
        {place.data && <Planner data={place.data} />}
      </div>
      <div className="min-w-0 lg:sticky lg:top-8">
        <div className="flex flex-col gap-8">
          <section aria-labelledby="near-title" className="enter">
            <div className="flex items-baseline justify-between gap-3 px-1">
              <h2 id="near-title" className="font-display text-[20px] font-semibold">
                {t("Датчиците в България", "Sensors across Bulgaria")}
              </h2>
              <Link href="/karta" className="inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-accent">
                {t("Цяла карта", "Full map")}
                <ArrowRight size={16} strokeWidth={2} aria-hidden />
              </Link>
            </div>
            <div className="mt-2 overflow-hidden rounded-[20px] bg-card">
              <SensorMap
                ariaLabel={t("Карта на гражданските датчици в България", "Map of citizen sensors in Bulgaria")}
                sensors={sensors.data?.sensors}
                onPick={() => {}}
                me={{ lat: loc.lat, lon: loc.lon }}
                className="aspect-[1000/657]"
              />
              <p className="border-t border-line px-4 py-3 text-[14px] leading-snug text-muted">
                {sensors.data
                  ? t(`${sensors.data.sensors.length} датчика са мерили през последния половин час.`, `${sensors.data.sensors.length} sensors reported in the last half hour.`)
                  : t("Зареждаме датчиците…", "Loading sensors…")}
              </p>
            </div>
          </section>
          <section aria-labelledby="cities-title" className="enter flex flex-col gap-2">
            <h2 id="cities-title" className="px-1 font-display text-[20px] font-semibold">
              {t("Къде е най-мръсно днес", "Where the air is worst today")}
            </h2>
            <CityRanking limit={5} highlight={city} />
          </section>
          <Alerts help />
        </div>
      </div>
    </div>
  );
}
