"use client";

import { useMemo, useState } from "react";
import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";
import { useJson } from "@shtit/core/client";
import { useI18n } from "@shtit/core/i18n/client";
import { GAUGES } from "@/data/gauges";
import { BASINS, levelByKey, type Basin, type DanubeResponse, type GaugesResponse } from "@/lib/flood-types";
import { RiverRow } from "./RiverRow";
import { RiverSheet } from "./RiverSheet";

const ORDER: Basin[] = ["dunav", "iztok", "zapad", "cherno"];

export function RiversView() {
  const { t, lang, agoLong } = useI18n();
  const all = useJson<GaugesResponse>("/api/gauges");
  const [river, setRiver] = useState<string | null>(null);
  const byBasin = useMemo(() => {
    const m = new Map<Basin, NonNullable<GaugesResponse["gauges"]>>();
    for (const s of all.data?.gauges ?? []) {
      const g = GAUGES.find((x) => x.id === s.id);
      if (!g) continue;
      m.set(g.basin, [...(m.get(g.basin) ?? []), s]);
    }
    return m;
  }, [all.data]);
  const counts = useMemo(() => {
    const c = [0, 0, 0, 0, 0];
    for (const s of all.data?.gauges ?? []) c[levelByKey(s.level).index]++;
    return c;
  }, [all.data]);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 px-1 pt-2">
        <h1 className="font-display text-[32px] font-bold tracking-[-0.01em] lg:text-[40px]">{t("Реките днес", "Rivers today")}</h1>
        <p className="max-w-[60ch] text-[16px] leading-snug text-muted">
          {all.data
            ? counts[0] === all.data.gauges.length
              ? t(`Всички ${all.data.gauges.length} точки по главните реки са в обичайните си граници днес.`, `All ${all.data.gauges.length} points on the main rivers are within their usual range today.`)
              : t(
                  `${all.data.gauges.length - counts[0]} от ${all.data.gauges.length} точки са над обичайното за сезона днес.`,
                  `${all.data.gauges.length - counts[0]} of ${all.data.gauges.length} points are above the usual for the season today.`,
                )
            : t("Прогноза на GloFAS за главните реки, по басейни.", "GloFAS forecast for the main rivers, by river basin.")}
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-6">
          {all.loading && !all.data && <div className="skeleton h-[420px] rounded-[20px]" aria-label={t("Зареждаме реките", "Loading rivers")} />}
          {all.error && !all.data && <p className="px-1 text-[15px] text-ember">{all.error}</p>}
          {ORDER.filter((b) => byBasin.get(b)?.length).map((b) => (
            <section key={b} aria-labelledby={`b-${b}`} className="flex flex-col gap-2">
              <h2 id={`b-${b}`} className="px-1 text-[17px] font-semibold">
                {lang === "bg" ? BASINS[b].bg : BASINS[b].en}
              </h2>
              <div className="divide-y divide-line overflow-hidden rounded-[20px] bg-card">
                {byBasin.get(b)!.map((s) => (
                  <RiverRow key={s.id} s={s} onClick={() => setRiver(s.id)} />
                ))}
              </div>
            </section>
          ))}
          {all.data && (
            <p className="px-1 text-[13px] leading-snug text-muted">
              {all.data.backupFrom
                ? t(`GloFAS не отговаря. Запазено копие от ${agoLong(all.data.backupFrom)}.`, `GloFAS isn't answering. Saved copy from ${agoLong(all.data.backupFrom)}.`)
                : t(
                    `Стойностите са от модела GloFAS (Copernicus), не от водомерни станции. Обновено ${agoLong(all.data.updated)}.`,
                    `Values come from the GloFAS model (Copernicus), not from river gauges. Updated ${agoLong(all.data.updated)}.`,
                  )}
            </p>
          )}
        </div>
        <div className="min-w-0 lg:sticky lg:top-8">
          <Danube />
        </div>
      </div>
      <RiverSheet id={river} onClose={() => setRiver(null)} />
    </div>
  );
}

/** Measured Danube levels this morning, the change over 24 hours, and АППД's forecast for the coming days. */
function Danube() {
  const { t, nf, time, weekday } = useI18n();
  const d = useJson<DanubeResponse>("/api/danube");
  if (!d.data) return d.loading ? <div className="skeleton h-[360px] rounded-[20px]" /> : null;
  const fc = new Map(d.data.forecast.map((f) => [f.name, f]));
  return (
    <section aria-labelledby="danube-title" className="flex flex-col gap-2">
      <h2 id="danube-title" className="px-1 text-[17px] font-semibold">
        {t("Дунав: измерено тази сутрин", "Danube: measured this morning")}
      </h2>
      <div className="overflow-hidden rounded-[20px] bg-card">
        <table className="w-full text-[14px] tabular-nums">
          <caption className="sr-only">{t("Водни стоежи по българския участък на Дунав", "Water levels on the Bulgarian Danube")}</caption>
          <thead>
            <tr className="text-left text-[12px] text-muted">
              <th scope="col" className="px-4 pb-1 pt-3 font-medium">{t("Станция", "Station")}</th>
              <th scope="col" className="px-2 pb-1 pt-3 text-right font-medium">{t("Ниво, см", "Level, cm")}</th>
              <th scope="col" className="px-4 pb-1 pt-3 text-right font-medium">{t("За 24 ч", "24 h")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {d.data.stations.map((s) => {
              const f = fc.get(s.name);
              const last = f?.days.at(-1);
              const Icon = (s.change ?? 0) > 2 ? ArrowUpRight : (s.change ?? 0) < -2 ? ArrowDownRight : ArrowRight;
              return (
                <tr key={s.name}>
                  <th scope="row" className="px-4 py-2.5 text-left font-medium">
                    {s.name}
                    {f && last && (
                      <span className="block text-[12px] font-normal text-muted">
                        {t(`прогноза за ${weekday(last.date)}: ${nf(last.level)} см`, `forecast for ${weekday(last.date)}: ${nf(last.level)} cm`)}
                      </span>
                    )}
                  </th>
                  <td className="px-2 py-2.5 text-right font-semibold">{s.level != null ? nf(s.level) : "·"}</td>
                  <td className="px-4 py-2.5 text-right">
                    <span className="inline-flex items-center gap-0.5">
                      <Icon size={14} strokeWidth={2} aria-hidden />
                      {s.change != null ? (s.change > 0 ? "+" : "") + nf(s.change) : "·"}
                    </span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="px-1 text-[13px] leading-snug text-muted">
        {t(
          `Данни на ИА „Проучване и поддържане на река Дунав“ за ${d.data.date ? time(d.data.date + "T12:00:00Z", { day: "numeric", month: "long" }) : "днес"}. Нивото е спрямо нулата на всяка станция, затова може да е отрицателно и се сравнява само със същата станция.`,
          `Data from the Danube agency (АППД) for ${d.data.date ? time(d.data.date + "T12:00:00Z", { day: "numeric", month: "long" }) : "today"}. Each level is measured from that station's own zero, so it can be negative and only compares with the same station.`,
        )}
        {d.data.backupFrom && t(" Сайтът не отговаря; това е запазено копие.", " The site isn't answering; this is a saved copy.")}
      </p>
    </section>
  );
}
