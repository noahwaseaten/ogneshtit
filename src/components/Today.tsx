"use client";

import { useMemo, useSyncExternalStore } from "react";
import { useLocation, useJson } from "@/lib/client";
import { oblastAt } from "@/lib/oblast";
import type { RiskResponse } from "@/lib/risk";
import { LocationPicker } from "./LocationPicker";
import { RiskCard, Forecast } from "./RiskCard";
import { FiresSummary } from "./FiresNear";
import { Conditions } from "./Conditions";
import { Satellites } from "./Satellites";
import { Alerts } from "./Alerts";
import { useI18n } from "@/i18n/client";
import { localeOf } from "@/i18n/lang";

const fmt = { bg: new Intl.DateTimeFormat(localeOf("bg"), { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Sofia" }), en: new Intl.DateTimeFormat(localeOf("en"), { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Sofia" }) };
const todayBg = () => fmt.bg.format(new Date());
const todayEn = () => fmt.en.format(new Date());
const noop = () => () => {};

export function Today() {
  const { loc } = useLocation();
  const { t, lang } = useI18n();
  const risk = useJson<RiskResponse>(`/api/risk?lat=${loc.lat.toFixed(3)}&lon=${loc.lon.toFixed(3)}`);
  // The date is rendered on the device only, so a prerendered page never shows a stale day.
  const date = useSyncExternalStore(noop, lang === "bg" ? todayBg : todayEn, () => "");
  const oblast = useMemo(() => oblastAt(loc.lat, loc.lon)?.name ?? null, [loc.lat, loc.lon]);

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)] lg:items-start lg:gap-10">
      <div className="flex min-w-0 flex-col gap-8">
        <header className="flex flex-col gap-0.5">
          <h1 className="sr-only">{t("ОгнеЩит: опасност от горски пожар днес", "Fire Shield: forest fire danger today")}</h1>
          <p className="min-h-5 px-1 text-[14px] font-medium text-muted first-letter:uppercase">{date}</p>
          <LocationPicker />
        </header>
        <RiskCard data={risk.data} loading={risk.loading} error={risk.error} offline={risk.offline} onRetry={risk.retry} loc={loc} />
        {risk.data && risk.data.forecast.length > 0 && <Forecast data={risk.data} />}
        <Conditions risk={risk.data} oblast={oblast} />
      </div>
      <div className="min-w-0 lg:sticky lg:top-8">
        <div className="flex flex-col gap-8">
          <FiresSummary loc={loc} />
          <Satellites />
          <Alerts help />
        </div>
      </div>
    </div>
  );
}
