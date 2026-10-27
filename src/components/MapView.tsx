"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Satellite } from "lucide-react";
import { OBLASTS } from "@/data/oblasts";
import { DANGERS, dangerByKey, dangerText } from "@/lib/danger";
import { useJson, useLocation, useMedia, type Loc } from "@/lib/client";
import { useI18n } from "@/i18n/client";
import { placeName } from "@/i18n/names";
import type { DangerMap } from "@/lib/risk";
import type { FireStats } from "@/lib/iag";
import { BulgariaMap } from "./BulgariaMap";
import { FireIcon } from "./FireMark";
import { HEAT, NEAR_KM, SpotRow, SpotSheet, firesWord, useSpots, whoOf, type Spot } from "./FiresNear";
import { Sheet } from "./Sheet";

type Layer = "fires" | "danger" | "burnt";
const LAYERS: { key: Layer; label: [string, string] }[] = [
  { key: "fires", label: ["Огън сега", "Fire now"] },
  { key: "danger", label: ["Опасност", "Danger"] },
  { key: "burnt", label: ["Изгоряло", "Burnt"] },
];

const BURNT = [
  { max: 0, color: "var(--land)", label: "0" },
  { max: 100, color: "#f6d2bd", label: "≤ 100" },
  { max: 500, color: "#efa37c", label: "≤ 500" },
  { max: 2000, color: "#e3741b", label: "≤ 2000" },
  { max: 5000, color: "#c7361f", label: "≤ 5000" },
  { max: Infinity, color: "#7d1810", label: "> 5000" },
];
const burntColor = (dka: number) => (BURNT.find((b) => dka <= b.max) ?? BURNT[BURNT.length - 1]).color;
const year = () => Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric" }).format(new Date()));

export function MapView() {
  const { loc, setLoc } = useLocation();
  const [layer, setLayer] = useState<Layer>("fires");
  const [picked, setPicked] = useState<Spot[] | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const wide = useMedia("(min-width: 1024px)");
  const { t, tp, lang, nf } = useI18n();
  const spots = useSpots(loc);
  const danger = useJson<DangerMap>(layer === "danger" || region ? "/api/danger-map" : null);
  const burnt = useJson<FireStats>(layer === "burnt" ? `/api/fire-stats?year=${year()}` : null);
  const who = whoOf(loc, lang);

  const dangerBy = useMemo(() => new Map((danger.data?.regions ?? []).map((r) => [r.code, r])), [danger.data]);
  const burntBy = useMemo(() => new Map((burnt.data?.regions ?? []).map((r) => [r.name, r])), [burnt.data]);
  const nameOf = (code: string) => OBLASTS.find((o) => o.code === code)?.name ?? "";
  const shownName = (code: string) => placeName(nameOf(code), lang);

  const fill =
    layer === "danger"
      ? (code: string) => (dangerBy.get(code) ? dangerByKey(dangerBy.get(code)!.danger).color : "var(--land)")
      : layer === "burnt"
        ? (code: string) => burntColor(burntBy.get(nameOf(code))?.dka ?? 0)
        : undefined;

  const regionInfo = region ? (
    <RegionInfo
      code={region}
      layer={layer}
      danger={dangerBy.get(region)}
      burnt={burntBy.get(nameOf(region))}
      onUse={() => {
        const o = OBLASTS.find((x) => x.code === region)!;
        setLoc({ lat: o.lat, lon: o.lon, label: `област ${o.name.replace(/ (град|област)$/, "")}`, source: "place", region: o.name });
      }}
    />
  ) : null;

  return (
    <div className="flex flex-col gap-4">
      <header className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="sr-only font-display text-[36px] font-bold leading-tight lg:not-sr-only">{t("Карта", "Map")}</h1>
        <div role="radiogroup" aria-label={t("Какво да покаже картата", "What the map shows")} className="grid grid-cols-3 rounded-full bg-line p-1 lg:w-[420px]">
          {LAYERS.map((l) => (
            <button
              key={l.key}
              role="radio"
              aria-checked={layer === l.key}
              onClick={() => {
                setLayer(l.key);
                setRegion(null);
              }}
              className={`min-h-10 truncate rounded-full px-2 text-[15px] font-semibold ${
                layer === l.key ? "bg-tonal text-content" : "text-muted active:bg-card/50"
              }`}
            >
              {tp(l.label)}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
        <div className="-mx-4 overflow-hidden bg-card sm:mx-0 sm:rounded-[20px]">
          <div>
            <BulgariaMap
              zoomable
              className="aspect-square sm:aspect-[1000/657]"
              ariaLabel={t("Карта на България", "Map of Bulgaria")}
              fill={fill}
              points={layer === "fires" ? spots.points : undefined}
              onPoints={(pts) => setPicked(pts.map((p) => spots.byId.get(p.id)!).filter(Boolean))}
              me={{ lat: loc.lat, lon: loc.lon, radiusKm: layer === "fires" ? NEAR_KM : undefined }}
              onRegion={layer === "fires" ? undefined : setRegion}
              selected={region}
              regionName={shownName}
            />
          </div>
          <Legend layer={layer} hours={spots.data?.hours} who={loc.source === "gps" ? t("Вие", "You") : placeName(loc.label, lang)} />
        </div>

        <aside className="flex flex-col gap-4">
          {wide && regionInfo && <div className="rounded-[20px] bg-card p-5">{regionInfo}</div>}
          {layer === "fires" && <FiresSide loc={loc} spots={spots} onPick={(s) => setPicked([s])} />}
          {layer === "danger" && (
            <p className="px-1 text-[15px] leading-snug text-muted">
              {t(
                "Нивото е изчислено за центъра на всяка област. В планините и по долините може да е различно, затова за точно място изберете го на „Днес“. Докоснете област за подробности.",
                "The level is worked out for the centre of each oblast. It can differ in the mountains and valleys, so for an exact place choose it on Today. Tap an oblast for details.",
              )}
            </p>
          )}
          {layer === "burnt" && (
            <p className="px-1 text-[15px] leading-snug text-muted">
              {burnt.data ? (
                <>
                  {t(
                    `От началото на ${burnt.data.year} г.: ${nf(burnt.data.total.fires)} горски пожара и ${nf(burnt.data.total.dka)} декара изгоряла площ. Данни на ИАГ.`,
                    `Since the start of ${burnt.data.year}: ${nf(burnt.data.total.fires)} forest fires and ${nf(burnt.data.total.dka / 10)} hectares burnt. Data from the Executive Forest Agency.`,
                  )}{" "}
                </>
              ) : null}
              <Link href="/pozhari" className="font-medium text-accent">
                {t("Цялата статистика", "All statistics")}
              </Link>
            </p>
          )}
        </aside>
      </div>

      {!wide && (
        <Sheet open={!!region} onClose={() => setRegion(null)} title={region ? shownName(region) : ""}>
          {regionInfo}
        </Sheet>
      )}
      <SpotSheet spots={picked} who={who} onClose={() => setPicked(null)} onPick={(s) => setPicked([s])} />
    </div>
  );
}

function Legend({ layer, hours, who }: { layer: Layer; hours?: number; who: string }) {
  const item = "inline-flex items-center gap-1.5";
  const { t, lang } = useI18n();
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line px-4 py-3 text-[13px] text-muted" aria-label={t("Легенда", "Legend")}>
      {layer === "fires" && (
        <>
          <li className={item}>
            {t("Огън от спътник", "Fire seen by satellite")}
            {hours ? t(` за ${hours} ч, по топлина:`, ` in ${hours} h, by heat:`) : ":"}
          </li>
          {HEAT.map((h, i) => (
            <li key={h.color} className={item}>
              <FireIcon tier={i} age="day" color={h.color} size={12 + i * 2} />
              {t(["слаба", "средна", "силна", "много силна"][i], ["weak", "medium", "strong", "very strong"][i])}
            </li>
          ))}
          <li className={item}>
            <span className="relative grid size-4 place-items-center" aria-hidden>
              <span className="fire-halo absolute inset-0 rounded-full bg-[var(--heat-3)]" />
              <span className="size-2 rounded-full bg-[var(--heat-3)]" />
            </span>
            {t("пулсира: до 6 ч", "pulsing: under 6 h")}
          </li>
          <li className={item}>
            <FireIcon tier={1} age="old" color="var(--heat-2)" size={16} />
            {t("жарава: по-старо от 24 ч", "ember: older than 24 h")}
          </li>
          <li className={item}>
            <span className="size-3 rounded-full bg-[#1f6fd1]" aria-hidden />
            {who}
          </li>
          <li className={item}>
            {/* Drawn as SVG: CSS dashed borders on tiny circles render as uneven dashes. */}
            <svg width="14" height="14" viewBox="0 0 14 14" aria-hidden className="shrink-0">
              <circle cx="7" cy="7" r="5.75" fill="none" stroke="#1f6fd1" strokeWidth="1.5" strokeDasharray="3.01 3.01" />
            </svg>
            {NEAR_KM} {t("км", "km")}
          </li>
        </>
      )}
      {layer === "danger" &&
        DANGERS.map((d) => (
          <li key={d.key} className={item}>
            <span className="size-3 rounded-[4px]" style={{ background: d.color }} aria-hidden />
            {dangerText(d, lang).label}
          </li>
        ))}
      {layer === "burnt" &&
        BURNT.map((b) => (
          <li key={b.label} className={`${item} tabular-nums`}>
            <span className="size-3 rounded-[4px] shadow-[inset_0_0_0_1px_var(--land-line)]" style={{ background: b.color }} aria-hidden />
            {b.label}
          </li>
        ))}
      {layer === "burnt" && <li className={item}>{t("декара", "decares (0.1 ha)")}</li>}
      <li className="ml-auto hidden sm:list-item">{t("Влачете и приближавайте", "Drag and zoom")}</li>
    </ul>
  );
}

function FiresSide({ loc, spots, onPick }: { loc: Loc; spots: ReturnType<typeof useSpots>; onPick: (s: Spot) => void }) {
  const [all, setAll] = useState(false);
  const { t, lang } = useI18n();
  const who = whoOf(loc, lang);
  if (!spots.data) return spots.loading ? <div className="skeleton h-40 rounded-[20px]" /> : <p className="px-1 text-[15px]">{spots.error}</p>;
  const list = all ? spots.all : spots.all.slice(0, 6);
  return (
    <>
      <p className="px-1 text-[16px] leading-snug">
        {spots.near.length === 0 ? (
          <>{t(`Няма засечен огън до ${NEAR_KM} км от ${who}.`, `No fire detected within ${NEAR_KM} km of ${who}.`)}</>
        ) : (
          <>
            <span className="font-semibold text-ember">{firesWord(spots.near.length, lang)}</span> {t(`до ${NEAR_KM} км от ${who}.`, `within ${NEAR_KM} km of ${who}.`)}
          </>
        )}{" "}
        <span className="text-muted">{t(`В страната: ${spots.all.length} за ${spots.data.hours} ч.`, `Across Bulgaria: ${spots.all.length} in ${spots.data.hours} h.`)}</span>
      </p>
      {spots.all.length > 0 && (
        <div>
          <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-card">
            {list.map((s) => (
              <li key={s.id}>
                <SpotRow s={s} onClick={() => onPick(s)} />
              </li>
            ))}
          </ul>
          {spots.all.length > 6 && (
            <button onClick={() => setAll((v) => !v)} aria-expanded={all} className="pressable mt-1 min-h-11 px-1 text-[15px] font-medium text-accent">
              {all ? t("Покажи по-малко", "Show fewer") : t(`Покажи всички ${spots.all.length}`, `Show all ${spots.all.length}`)}
            </button>
          )}
        </div>
      )}
      <p className="flex gap-2 px-1 text-[13px] leading-snug text-muted">
        <Satellite size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
        {t(
          "Спътниците VIIRS на NASA засичат силна топлина. Освен горски пожар може да е горящо стърнище, сметище или завод.",
          "NASA's VIIRS satellites detect strong heat. Besides a forest fire it can be burning stubble, a landfill or a factory.",
        )}
      </p>
    </>
  );
}

function RegionInfo({
  code,
  layer,
  danger,
  burnt,
  onUse,
}: {
  code: string;
  layer: Layer;
  danger?: DangerMap["regions"][number];
  burnt?: FireStats["regions"][number];
  onUse: () => void;
}) {
  const { t, lang, nf } = useI18n();
  const name = placeName(OBLASTS.find((o) => o.code === code)?.name ?? "", lang);
  if (layer === "danger") {
    if (!danger) return <p className="text-[15px] text-muted">{t(`Няма данни за ${name}.`, `No data for ${name}.`)}</p>;
    const d = dangerByKey(danger.danger);
    const dt = dangerText(d, lang);
    const tomorrow = dangerText(dangerByKey(danger.tomorrow), lang);
    return (
      <div className="flex flex-col gap-3">
        <p className="hidden font-display text-[22px] font-semibold lg:block">{name}</p>
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full text-[17px] font-bold" style={{ background: d.color, color: d.onColor }}>
            {d.index + 1}
          </span>
          <div>
            <p className="text-[18px] font-semibold">
              {t("Опасност днес:", "Danger today:")} {dt.label.toLowerCase()}
            </p>
            <p className="text-[14px] text-muted">
              {t("Утре:", "Tomorrow:")} {tomorrow.label.toLowerCase()}
            </p>
          </div>
        </div>
        <p className="text-[15px] leading-snug">{dt.meaning}</p>
        <Link href="/" onClick={onUse} className="pressable mt-1 flex min-h-12 items-center justify-center rounded-2xl bg-accent text-[16px] font-semibold text-accent-content">
          {t("Прогноза за областта", "Forecast for this oblast")}
        </Link>
      </div>
    );
  }
  return (
    <div className="flex flex-col gap-3">
      <p className="hidden font-display text-[22px] font-semibold lg:block">{name}</p>
      {burnt ? (
        <dl className="grid grid-cols-2 gap-4 tabular-nums">
          <div>
            <dt className="text-[13px] text-muted">{t("Пожари", "Fires")}</dt>
            <dd className="font-display text-[24px] font-bold">{nf(burnt.fires)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">{t("Изгоряла площ", "Area burnt")}</dt>
            <dd className="font-display text-[24px] font-bold">
              {lang === "bg" ? nf(burnt.dka) : nf(burnt.dka / 10, 1)} <span className="text-[14px] font-semibold text-muted">{t("дка", "ha")}</span>
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-[16px]">{t("Няма горски пожари тази година.", "No forest fires this year.")}</p>
      )}
      <Link href="/pozhari" className="text-[15px] font-medium text-accent">
        {t("По години и причини", "By year and cause")}
      </Link>
    </div>
  );
}
