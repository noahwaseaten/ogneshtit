"use client";

import { useMemo, useState } from "react";
import { RotateCw } from "lucide-react";
import { useJson, useLocation } from "@shtit/core/client";
import { OBLASTS } from "@shtit/core/data/oblasts";
import { useI18n } from "@shtit/core/i18n/client";
import { oblastShort } from "@shtit/core/i18n/names";
import { Segmented } from "@shtit/core/ui/Settings";
import { Sheet } from "@shtit/core/ui/Sheet";
import { warningIn, type WarningsResponse } from "@shtit/core/warning-types";
import { FLOOD_WARNINGS, LEVELS, levelByKey, levelText, type GaugesResponse } from "@/lib/flood-types";
import { GaugeMap } from "./GaugeMap";
import { RiverRow } from "./RiverRow";
import { RiverSheet } from "./RiverSheet";

type Layer = "rivers" | "warnings";

const WARN_FILL = { 0: "var(--land)", 2: "#e3b021", 3: "#e3741b", 4: "#c7361f" } as const;

export function MapView() {
  const { t, lang, agoLong } = useI18n();
  const { loc } = useLocation();
  const all = useJson<GaugesResponse>("/api/gauges");
  const warn = useJson<WarningsResponse>("/api/warnings");
  const [layer, setLayer] = useState<Layer>("rivers");
  const [river, setRiver] = useState<string | null>(null);
  const [group, setGroup] = useState<string[] | null>(null);
  const [region, setRegion] = useState<string | null>(null);

  const worst = useMemo(
    () => [...(all.data?.gauges ?? [])].sort((a, b) => levelByKey(b.peak.level).index - levelByKey(a.peak.level).index || b.vsNormal - a.vsNormal),
    [all.data],
  );
  const raised = worst.filter((s) => levelByKey(s.peak.level).index >= 1);

  // Highest warning level about water (rain, floods, snow, ice, coast) per oblast.
  const warnLevel = useMemo(() => {
    const m = new Map<string, 0 | 2 | 3 | 4>();
    for (const o of OBLASTS) {
      const ws = (warn.data?.warnings ?? []).filter((w) => FLOOD_WARNINGS.includes(w.type) && warningIn(w, o.name));
      m.set(o.code, (Math.max(0, ...ws.map((w) => w.level)) as 0 | 2 | 3 | 4) || 0);
    }
    return m;
  }, [warn.data]);
  const regionWarnings = region ? (warn.data?.warnings ?? []).filter((w) => warningIn(w, OBLASTS.find((o) => o.code === region)?.name)) : [];

  return (
    <div className="flex flex-col gap-6">
      <h1 className="px-1 pt-2 font-display text-[32px] font-bold tracking-[-0.01em] lg:text-[40px]">{t("Карта на реките", "River map")}</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,7fr)_minmax(0,4fr)] lg:items-start">
        <div className="flex min-w-0 flex-col gap-3">
          <Segmented
            label={t("Какво да показва картата", "What the map shows")}
            value={layer}
            options={[
              { value: "rivers", label: t("Реки до 15 дни", "Rivers, 15 days") },
              { value: "warnings", label: t("Предупреждения", "Warnings") },
            ]}
            onChange={(v) => {
              setLayer(v);
              setRegion(null);
            }}
          />
          <div className="overflow-hidden rounded-[20px] bg-card">
            <GaugeMap
              zoomable
              className="aspect-square sm:aspect-[1000/657]"
              ariaLabel={t("Карта на България с реките", "Map of Bulgaria with its rivers")}
              statuses={layer === "rivers" ? all.data?.gauges : undefined}
              onPick={(ids) => (ids.length === 1 ? setRiver(ids[0]) : setGroup(ids))}
              me={{ lat: loc.lat, lon: loc.lon }}
              fill={layer === "warnings" ? (code) => WARN_FILL[warnLevel.get(code) ?? 0] : undefined}
              regionName={(code) => {
                const o = OBLASTS.find((x) => x.code === code)!;
                const lv = warnLevel.get(code) ?? 0;
                return `${oblastShort(o.name, lang)}: ${lv === 4 ? t("червен код", "red warning") : lv === 3 ? t("оранжев код", "orange warning") : lv === 2 ? t("жълт код", "yellow warning") : t("без предупреждение", "no warning")}`;
              }}
              onRegion={layer === "warnings" ? setRegion : undefined}
              selected={region}
            />
          </div>
          <Legend layer={layer} />
          {all.error && !all.data && (
            <button onClick={all.retry} className="pressable inline-flex min-h-11 items-center gap-2 self-start rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content">
              <RotateCw size={18} strokeWidth={2} aria-hidden />
              {t("Опитай пак", "Try again")}
            </button>
          )}
        </div>

        <aside className="flex min-w-0 flex-col gap-3">
          {layer === "rivers" ? (
            <>
              <h2 className="px-1 font-display text-[20px] font-semibold">{raised.length ? t("Реки над обичайното", "Rivers above usual") : t("Реките днес", "Rivers today")}</h2>
              <p className="px-1 text-[15px] leading-snug text-muted">
                {!all.data
                  ? t("Зареждаме прогнозата…", "Loading the forecast…")
                  : raised.length
                    ? t(`${raised.length} от ${worst.length} точки стигат поне умерена опасност до 15 дни.`, `${raised.length} of ${worst.length} points reach at least moderate danger within 15 days.`)
                    : t(`Всички ${worst.length} точки остават в обичайното до 15 дни.`, `All ${worst.length} points stay within their usual range for 15 days.`)}
              </p>
              <div className="divide-y divide-line overflow-hidden rounded-[20px] bg-card">
                {(raised.length ? raised : worst.slice(0, 6)).slice(0, 10).map((s) => (
                  <RiverRow key={s.id} s={s} onClick={() => setRiver(s.id)} />
                ))}
              </div>
              {all.data && <p className="px-1 text-[13px] text-muted">{all.data.backupFrom ? t(`Запазено копие от ${agoLong(all.data.backupFrom)}.`, `Saved copy from ${agoLong(all.data.backupFrom)}.`) : t(`GloFAS, обновено ${agoLong(all.data.updated)}.`, `GloFAS, updated ${agoLong(all.data.updated)}.`)}</p>}
            </>
          ) : (
            <>
              <h2 className="px-1 font-display text-[20px] font-semibold">
                {region ? oblastShort(OBLASTS.find((o) => o.code === region)!.name, lang) : t("Предупреждения на НИМХ", "Official warnings")}
              </h2>
              <p className="px-1 text-[15px] leading-snug text-muted">
                {region
                  ? regionWarnings.length
                    ? null
                    : t("Няма предупреждения за тази област.", "No warnings for this province.")
                  : t("Цвят по най-високия код за дъжд, наводнение, сняг и лед. Докоснете област.", "Coloured by the highest warning for rain, floods, snow and ice. Tap a province.")}
              </p>
              {regionWarnings.length > 0 && (
                <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-card">
                  {regionWarnings.map((w, i) => {
                    const text = lang === "en" && w.en ? w.en : w;
                    return (
                      <li key={i} className="p-4">
                        <p className="text-[16px] font-semibold">
                          {w.level === 4 ? t("Червен код", "Red") : w.level === 3 ? t("Оранжев код", "Orange") : t("Жълт код", "Yellow")}: {text.event || text.headline}
                        </p>
                        {text.description && <p className="pt-1 text-[14px] leading-snug text-muted">{text.description}</p>}
                      </li>
                    );
                  })}
                </ul>
              )}
            </>
          )}
        </aside>
      </div>

      <Sheet open={!!group} onClose={() => setGroup(null)} title={t("Точки по реките", "River points")}>
        <div className="flex flex-col">
          {(group ?? []).map((id) => {
            const s = all.data?.gauges.find((g) => g.id === id);
            return s ? (
              <RiverRow
                key={id}
                s={s}
                inSheet
                onClick={() => {
                  setGroup(null);
                  setRiver(id);
                }}
              />
            ) : null;
          })}
        </div>
      </Sheet>
      <RiverSheet id={river} onClose={() => setRiver(null)} />
    </div>
  );
}

function Legend({ layer }: { layer: Layer }) {
  const { t, lang } = useI18n();
  if (layer === "warnings")
    return (
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 px-1 text-[13px] text-muted">
        {([2, 3, 4] as const).map((lv) => (
          <li key={lv} className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-[4px]" style={{ background: WARN_FILL[lv] }} aria-hidden />
            {lv === 4 ? t("Червен код", "Red") : lv === 3 ? t("Оранжев код", "Orange") : t("Жълт код", "Yellow")}
          </li>
        ))}
      </ul>
    );
  return (
    <div className="flex flex-col gap-1.5 px-1">
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-[13px] text-muted">
        {LEVELS.map((l) => (
          <li key={l.key} className="inline-flex items-center gap-1.5">
            <span className="size-3 rounded-full ring-2 ring-white" style={{ background: l.color }} aria-hidden />
            {levelText(l, lang).label}
          </li>
        ))}
      </ul>
      <p className="text-[13px] leading-snug text-muted">
        {t("Всяка точка е в цвета на най-високото ниво до 15 дни. Сините линии са главните реки.", "Each point shows the highest level within 15 days. Blue lines are the main rivers.")}
      </p>
    </div>
  );
}
