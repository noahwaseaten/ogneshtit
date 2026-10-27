"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Satellite } from "lucide-react";
import { OBLASTS } from "@/data/oblasts";
import { DANGERS, dangerByKey } from "@/lib/danger";
import { nf, useJson, useLocation, useMedia, type Loc } from "@/lib/client";
import type { DangerMap } from "@/lib/risk";
import type { FireStats } from "@/lib/iag";
import { BulgariaMap } from "./BulgariaMap";
import { NEAR_KM, SpotRow, SpotSheet, firesWord, useSpots, type Spot } from "./FiresNear";
import { Sheet } from "./Sheet";

type Layer = "fires" | "danger" | "burnt";
const LAYERS: { key: Layer; label: string }[] = [
  { key: "fires", label: "Огън сега" },
  { key: "danger", label: "Опасност днес" },
  { key: "burnt", label: "Изгоряло тази година" },
];

const BURNT = [
  { max: 0, color: "var(--land)", label: "0" },
  { max: 100, color: "#f6d2bd", label: "до 100" },
  { max: 500, color: "#efa37c", label: "до 500" },
  { max: 2000, color: "#e3741b", label: "до 2 000" },
  { max: 5000, color: "#c7361f", label: "до 5 000" },
  { max: Infinity, color: "#7d1810", label: "над 5 000" },
];
const burntColor = (dka: number) => (BURNT.find((b) => dka <= b.max) ?? BURNT[BURNT.length - 1]).color;
const year = () => Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric" }).format(new Date()));

export function MapView() {
  const { loc, setLoc } = useLocation();
  const [layer, setLayer] = useState<Layer>("fires");
  const [picked, setPicked] = useState<Spot[] | null>(null);
  const [region, setRegion] = useState<string | null>(null);
  const wide = useMedia("(min-width: 1024px)");
  const spots = useSpots(loc);
  const danger = useJson<DangerMap>(layer === "danger" || region ? "/api/danger-map" : null);
  const burnt = useJson<FireStats>(layer === "burnt" ? `/api/fire-stats?year=${year()}` : null);
  const who = loc.source === "gps" ? "вас" : loc.label;

  const dangerBy = useMemo(() => new Map((danger.data?.regions ?? []).map((r) => [r.code, r])), [danger.data]);
  const burntBy = useMemo(() => new Map((burnt.data?.regions ?? []).map((r) => [r.name, r])), [burnt.data]);
  const nameOf = (code: string) => OBLASTS.find((o) => o.code === code)?.name ?? "";

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
      <header className="flex flex-col gap-3 px-1 pt-1 lg:flex-row lg:items-end lg:justify-between">
        <h1 className="font-display text-[28px] font-bold leading-tight tracking-[-0.01em] lg:text-[36px]">Карта</h1>
        <div role="radiogroup" aria-label="Какво да покаже картата" className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:px-0">
          {LAYERS.map((l) => (
            <button
              key={l.key}
              role="radio"
              aria-checked={layer === l.key}
              onClick={() => {
                setLayer(l.key);
                setRegion(null);
              }}
              className={`pressable min-h-10 shrink-0 rounded-full px-4 text-[15px] font-semibold transition-colors duration-150 ${
                layer === l.key ? "bg-content text-surface" : "bg-card text-content shadow-[var(--shadow)] hover:bg-line"
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start lg:gap-6">
        <div className="overflow-hidden rounded-[20px] bg-card shadow-[var(--shadow)]">
          <div className="p-2 lg:p-3">
            <BulgariaMap
              zoomable
              ariaLabel="Карта на България"
              fill={fill}
              points={layer === "fires" ? spots.points : undefined}
              onPoints={(pts) => setPicked(pts.map((p) => spots.byId.get(p.id)!).filter(Boolean))}
              me={{ lat: loc.lat, lon: loc.lon, radiusKm: layer === "fires" ? NEAR_KM : undefined }}
              onRegion={layer === "fires" ? undefined : setRegion}
              selected={region}
              regionName={(code) => nameOf(code)}
            />
          </div>
          <Legend layer={layer} hours={spots.data?.hours} who={loc.source === "gps" ? "Вие" : loc.label} />
        </div>

        <aside className="flex flex-col gap-4">
          {wide && regionInfo && <div className="rounded-[20px] bg-card p-5 shadow-[var(--shadow)]">{regionInfo}</div>}
          {layer === "fires" && <FiresSide loc={loc} spots={spots} onPick={(s) => setPicked([s])} />}
          {layer === "danger" && (
            <p className="px-1 text-[15px] leading-snug text-muted">
              Нивото е изчислено за центъра на всяка област. В планините и по долините може да е различно, затова за точно място
              изберете го на „Днес“. Докоснете област за подробности.
            </p>
          )}
          {layer === "burnt" && (
            <p className="px-1 text-[15px] leading-snug text-muted">
              {burnt.data ? (
                <>
                  От началото на {burnt.data.year} г.: {nf(burnt.data.total.fires)} горски пожара и {nf(burnt.data.total.dka)} декара изгоряла
                  площ. Данни на ИАГ.{" "}
                </>
              ) : null}
              <Link href="/pozhari" className="font-medium text-accent">
                Цялата статистика
              </Link>
            </p>
          )}
        </aside>
      </div>

      {!wide && (
        <Sheet open={!!region} onClose={() => setRegion(null)} title={region ? nameOf(region) : ""}>
          {regionInfo}
        </Sheet>
      )}
      <SpotSheet spots={picked} who={who} onClose={() => setPicked(null)} onPick={(s) => setPicked([s])} />
    </div>
  );
}

function Legend({ layer, hours, who }: { layer: Layer; hours?: number; who: string }) {
  const item = "inline-flex items-center gap-1.5";
  return (
    <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line px-4 py-3 text-[13px] text-muted" aria-label="Легенда">
      {layer === "fires" && (
        <>
          <li className={item}>
            <span className="size-3 rounded-full bg-[var(--ember)]" aria-hidden />
            Огън от спътник{hours ? `, ${hours} ч` : ""}
          </li>
          <li className={item}>
            <span className="size-3 rounded-full bg-[#1f6fd1]" aria-hidden />
            {who}
          </li>
          <li className={item}>
            <span className="size-3 rounded-full border-[1.5px] border-dashed border-[#1f6fd1]" aria-hidden />
            {NEAR_KM} км
          </li>
        </>
      )}
      {layer === "danger" &&
        DANGERS.map((d) => (
          <li key={d.key} className={item}>
            <span className="size-3 rounded-[4px]" style={{ background: d.color }} aria-hidden />
            {d.label}
          </li>
        ))}
      {layer === "burnt" &&
        BURNT.map((b) => (
          <li key={b.label} className={`${item} tabular-nums`}>
            <span className="size-3 rounded-[4px] shadow-[inset_0_0_0_1px_var(--land-line)]" style={{ background: b.color }} aria-hidden />
            {b.label}
          </li>
        ))}
      {layer === "burnt" && <li className={item}>декара</li>}
      <li className="ml-auto hidden sm:list-item">Влачете и приближавайте</li>
    </ul>
  );
}

function FiresSide({ loc, spots, onPick }: { loc: Loc; spots: ReturnType<typeof useSpots>; onPick: (s: Spot) => void }) {
  const [all, setAll] = useState(false);
  const who = loc.source === "gps" ? "вас" : loc.label;
  if (!spots.data) return spots.loading ? <div className="skeleton h-40 rounded-[20px]" /> : <p className="px-1 text-[15px]">{spots.error}</p>;
  const list = all ? spots.all : spots.all.slice(0, 6);
  return (
    <>
      <p className="px-1 text-[16px] leading-snug">
        {spots.near.length === 0 ? (
          <>Няма засечен огън до {NEAR_KM} км от {who}.</>
        ) : (
          <>
            <span className="font-semibold text-ember">{firesWord(spots.near.length)}</span> до {NEAR_KM} км от {who}.
          </>
        )}{" "}
        <span className="text-muted">В страната: {spots.all.length} за {spots.data.hours} ч.</span>
      </p>
      {spots.all.length > 0 && (
        <div>
          <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-card px-2 shadow-[var(--shadow)]">
            {list.map((s) => (
              <li key={s.id}>
                <SpotRow s={s} onClick={() => onPick(s)} />
              </li>
            ))}
          </ul>
          {spots.all.length > 6 && (
            <button onClick={() => setAll((v) => !v)} aria-expanded={all} className="pressable mt-1 min-h-11 px-1 text-[15px] font-medium text-accent">
              {all ? "Покажи по-малко" : `Покажи всички ${spots.all.length}`}
            </button>
          )}
        </div>
      )}
      <p className="flex gap-2 px-1 text-[13px] leading-snug text-muted">
        <Satellite size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
        Спътниците VIIRS на NASA засичат силна топлина. Освен горски пожар може да е горящо стърнище, сметище или завод.
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
  const name = OBLASTS.find((o) => o.code === code)?.name ?? "";
  if (layer === "danger") {
    if (!danger) return <p className="text-[15px] text-muted">Няма данни за {name}.</p>;
    const d = dangerByKey(danger.danger);
    const t = dangerByKey(danger.tomorrow);
    return (
      <div className="flex flex-col gap-3">
        <p className="hidden font-display text-[22px] font-semibold lg:block">{name}</p>
        <div className="flex items-center gap-3">
          <span className="grid size-11 place-items-center rounded-full text-[17px] font-bold" style={{ background: d.color, color: d.onColor }}>
            {d.index + 1}
          </span>
          <div>
            <p className="text-[18px] font-semibold">Опасност днес: {d.label.toLowerCase()}</p>
            <p className="text-[14px] text-muted">Утре: {t.label.toLowerCase()}</p>
          </div>
        </div>
        <p className="text-[15px] leading-snug">{d.meaning}</p>
        <Link href="/" onClick={onUse} className="pressable mt-1 flex min-h-12 items-center justify-center rounded-2xl bg-accent text-[16px] font-semibold text-accent-content">
          Прогноза за областта
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
            <dt className="text-[13px] text-muted">Пожари</dt>
            <dd className="font-display text-[24px] font-bold">{nf(burnt.fires)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">Изгоряла площ</dt>
            <dd className="font-display text-[24px] font-bold">
              {nf(burnt.dka)} <span className="text-[14px] font-semibold text-muted">дка</span>
            </dd>
          </div>
        </dl>
      ) : (
        <p className="text-[16px]">Няма горски пожари тази година.</p>
      )}
      <Link href="/pozhari" className="text-[15px] font-medium text-accent">
        По години и причини
      </Link>
    </div>
  );
}
