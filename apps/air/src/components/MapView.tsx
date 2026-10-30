"use client";

import { useState } from "react";
import { useJson, useLocation } from "@shtit/core/client";
import { useI18n } from "@shtit/core/i18n/client";
import { Sheet } from "@shtit/core/ui/Sheet";
import type { MapPoint } from "@shtit/core/ui/BulgariaMap";
import { BANDS, bandOf, bandText, median, type SensorsResponse } from "@/lib/air-types";
import { SensorMap } from "./SensorMap";
import { BandChip } from "./Planner";

/** Every citizen sensor in Bulgaria, zoomable. Tapping a group shows its median and the spread, not a list of numbers. */
export function MapView() {
  const { t, lang, nf, agoLong } = useI18n();
  const { loc } = useLocation();
  const s = useJson<SensorsResponse>("/api/sensors");
  const [picked, setPicked] = useState<MapPoint[] | null>(null);
  const counts = BANDS.map((b) => (s.data?.sensors ?? []).filter((x) => bandOf(x[2], x[3]).index === b.index).length);
  const sel = picked && s.data ? picked.map((p) => s.data!.sensors[Number(p.id)]).filter(Boolean) : [];
  const m25 = median(sel.map((x) => x[2]));
  return (
    <div className="flex flex-col gap-6">
      <h1 className="px-1 pt-2 font-display text-[32px] font-bold tracking-[-0.01em] lg:text-[40px]">{t("Датчиците сега", "Sensors now")}</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <div className="overflow-hidden rounded-[20px] bg-card">
            <SensorMap
              zoomable
              className="aspect-square sm:aspect-[1000/657]"
              ariaLabel={t("Карта на гражданските датчици", "Map of citizen sensors")}
              sensors={s.data?.sensors}
              onPick={setPicked}
              me={{ lat: loc.lat, lon: loc.lon }}
            />
          </div>
          <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[13px] text-muted">
            {BANDS.map((b) => (
              <li key={b.key} className="inline-flex items-center gap-1.5">
                <span className="size-3 rounded-full ring-2 ring-white" style={{ background: b.color }} aria-hidden />
                {bandText(b, lang).label}
              </li>
            ))}
          </ul>
          <p className="px-1 text-[13px] leading-snug text-muted">
            {t(
              "Всяка точка е граждански датчик на sensor.community. Групите са в цвета на средната стойност.",
              "Each dot is a sensor.community citizen sensor. Groups take the colour of their median.",
            )}
            {s.data?.hidden && s.data.hidden.humid + s.data.hidden.odd > 0 && (
              <>
                {" "}
                {t(
                  `Скрити са ${s.data.hidden.humid} датчика във влажен въздух (при мъгла броят капките за прах) и ${s.data.hidden.odd} с невъзможни или многократно по-високи от съседите стойности.`,
                  `Hidden: ${s.data.hidden.humid} sensors in humid air (in fog they count droplets as dust) and ${s.data.hidden.odd} with impossible readings or many times their neighbours.`,
                )}
              </>
            )}
          </p>
        </div>
        <aside className="flex min-w-0 flex-col gap-3">
          <h2 className="px-1 font-display text-[20px] font-semibold">{t("Колко датчика в кое ниво", "How many sensors at each level")}</h2>
          <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-card">
            {BANDS.map((b, i) => (
              <li key={b.key} className="flex min-h-12 items-center justify-between gap-3 px-4">
                <BandChip band={b.key} size="sm" />
                <span className="text-[16px] font-semibold tabular-nums">{s.data ? nf(counts[i]) : "·"}</span>
              </li>
            ))}
          </ul>
          {s.data && (
            <p className="px-1 text-[13px] text-muted">
              {s.data.backupFrom
                ? t(`sensor.community не отговаря; копие от ${agoLong(s.data.backupFrom)}.`, `sensor.community isn't answering; copy from ${agoLong(s.data.backupFrom)}.`)
                : t(`Показания от последните 30 минути, обновено ${agoLong(s.data.updated)}.`, `Readings from the last 30 minutes, updated ${agoLong(s.data.updated)}.`)}
            </p>
          )}
        </aside>
      </div>
      <Sheet
        open={!!picked}
        onClose={() => setPicked(null)}
        title={sel.length === 1 ? t("Един датчик", "One sensor") : t(`${sel.length} датчика`, `${sel.length} sensors`)}
        description={t("Фини прахови частици (ФПЧ2,5) сега.", "Fine particles (PM2.5) now.")}
      >
        {m25 != null && (
          <div className="flex flex-col gap-3">
            <p className="font-display text-[34px] font-bold tabular-nums">
              {nf(m25)} <span className="text-[16px] font-semibold text-muted">µg/m³</span>
            </p>
            <p className="text-[15px] text-muted">
              {sel.length > 1
                ? t(`Средно (медиана). От ${nf(Math.min(...sel.map((x) => x[2])))} до ${nf(Math.max(...sel.map((x) => x[2])))} µg/m³.`, `Median. From ${nf(Math.min(...sel.map((x) => x[2])))} to ${nf(Math.max(...sel.map((x) => x[2])))} µg/m³.`)
                : t(`ФПЧ10: ${nf(sel[0][3])} µg/m³. Мерено преди ${sel[0][4]} мин.`, `PM10: ${nf(sel[0][3])} µg/m³. Measured ${sel[0][4]} min ago.`)}
            </p>
          </div>
        )}
      </Sheet>
    </div>
  );
}
