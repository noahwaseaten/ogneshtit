"use client";

import { AlertTriangle, Wind as AirIcon, CheckCircle2 } from "lucide-react";
import { airBand } from "@/lib/danger";
import { sofiaTime, useJson } from "@/lib/client";
import type { RiskResponse } from "@/lib/risk";
import type { Warning, WarningsResponse } from "@/lib/warnings";

const LEVEL = {
  2: { label: "Жълт код", bg: "#e3b021", fg: "#1b1b1b" },
  3: { label: "Оранжев код", bg: "#e3741b", fg: "#1b1b1b" },
  4: { label: "Червен код", bg: "#c7361f", fg: "#ffffff" },
} as const;

// MeteoAlarm area names may come in Bulgarian or in Latin script.
const LATIN: Record<string, string> = {
  Благоевград: "blagoevgrad", Бургас: "burgas", Варна: "varna", "Велико Търново": "veliko", Видин: "vidin",
  Враца: "vratsa", Габрово: "gabrovo", Добрич: "dobrich", Кърджали: "kardzhali", Кюстендил: "kyustendil",
  Ловеч: "lovech", Монтана: "montana", Пазарджик: "pazardzhik", Перник: "pernik", Плевен: "pleven",
  Пловдив: "plovdiv", Разград: "razgrad", Русе: "ruse", Силистра: "silistra", Сливен: "sliven",
  Смолян: "smolyan", "София град": "sofia", "София област": "sofia", "Стара Загора": "stara zagora",
  Търговище: "targovishte", Хасково: "haskovo", Шумен: "shumen", Ямбол: "yambol",
};

function matches(w: Warning, oblast: string) {
  const stem = oblast.replace(/ (град|област)$/, "").toLowerCase();
  const latin = LATIN[oblast] ?? "";
  return w.areas.some((a) => {
    const x = a.toLowerCase();
    return x.includes(stem) || (latin && x.includes(latin));
  });
}

/** Air quality and official weather warnings for the chosen place. */
export function Conditions({ risk, oblast }: { risk: RiskResponse | null; oblast: string | null }) {
  const warn = useJson<WarningsResponse>("/api/warnings");
  const mine = oblast && warn.data ? warn.data.warnings.filter((w) => matches(w, oblast)) : [];
  const air = risk?.air;
  if (!air && !warn.data) return null;
  const band = air ? airBand(air.aqi) : null;

  return (
    <section aria-labelledby="cond-title" className="enter">
      <h2 id="cond-title" className="px-1 font-display text-[20px] font-semibold">
        Въздух и предупреждения
      </h2>
      <div className="mt-3 flex flex-col divide-y divide-line overflow-hidden rounded-[20px] bg-card">
        {air && band && (
          <div className="flex gap-3 p-4">
            <AirIcon size={22} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
            <div className="min-w-0 flex-1">
              <p className="text-[16px] font-semibold">
                Въздух: <span className="inline-flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: band.color }} aria-hidden />
                  {band.label.toLowerCase()}
                </span>
              </p>
              <p className="pt-1 text-[14px] leading-snug text-muted tabular-nums">
                Фини прахови частици (ФПЧ2,5): {air.pm25} µg/m³. Димът от пожар вдига тази стойност дори на десетки километри.
              </p>
            </div>
          </div>
        )}
        {warn.data &&
          (mine.length > 0 ? (
            mine.map((w, i) => {
              const lv = LEVEL[w.level as 2 | 3 | 4] ?? LEVEL[2];
              return (
                <div key={i} className="flex gap-3 p-4">
                  <AlertTriangle size={22} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
                  <div className="min-w-0 flex-1">
                    <p className="flex flex-wrap items-center gap-2 text-[16px] font-semibold">
                      <span className="rounded-full px-2 py-0.5 text-[12px] font-bold" style={{ background: lv.bg, color: lv.fg }}>
                        {lv.label}
                      </span>
                      {w.event || w.headline}
                    </p>
                    {w.onset && w.expires && (
                      <p className="pt-1 text-[14px] text-muted tabular-nums">
                        От {sofiaTime(w.onset, { weekday: "short", hour: "2-digit", minute: "2-digit" })} до{" "}
                        {sofiaTime(w.expires, { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    )}
                    {w.description && <p className="pt-1 text-[14px] leading-snug">{w.description}</p>}
                  </div>
                </div>
              );
            })
          ) : (
            <div className="flex gap-3 p-4">
              <CheckCircle2 size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-[var(--d-low)]" aria-hidden />
              <p className="text-[15px] leading-snug">
                Няма предупреждения на НИМХ за опасно време{oblast ? ` в област ${oblast.replace(/ (град|област)$/, "")}` : ""}.
              </p>
            </div>
          ))}
      </div>
    </section>
  );
}
