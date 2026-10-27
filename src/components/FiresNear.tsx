"use client";

import { useMemo, useState } from "react";
import { Phone, Navigation, Satellite, ChevronRight, RotateCw } from "lucide-react";
import { useJson, timeAgoLong, sofiaTime, nf, type Loc } from "@/lib/client";
import { distanceKm } from "@/lib/geo";
import { bearingWord } from "@/lib/oblast";
import type { FiresResponse, Hotspot } from "@/lib/fires";
import { BulgariaMap, type MapPoint } from "./BulgariaMap";
import { Sheet } from "./Sheet";

const NEAR_KM = 50;
const CONF = { high: "висока", nominal: "средна", low: "ниска" } as const;
const strength = (frp: number) => (frp < 5 ? "слаба" : frp < 20 ? "средна" : frp < 80 ? "силна" : "много силна");

type Spot = Hotspot & { id: string; km: number; dir: string };

const fires = (n: number) => (n === 1 ? "1 огнище" : `${n} огнища`);

export function FiresNear({ loc }: { loc: Loc }) {
  const { data, error, loading, offline, retry } = useJson<FiresResponse>("/api/fires");
  const [picked, setPicked] = useState<Spot[] | null>(null);
  const [showAll, setShowAll] = useState(false);
  const who = loc.source === "gps" ? "вас" : loc.label;

  const all = useMemo<Spot[]>(
    () =>
      (data?.hotspots ?? [])
        .map((h, i) => ({
          ...h,
          id: `${i}:${h.lat},${h.lon},${h.time}`,
          km: distanceKm(loc.lat, loc.lon, h.lat, h.lon),
          dir: bearingWord(loc.lat, loc.lon, h.lat, h.lon),
        }))
        .sort((a, b) => a.km - b.km),
    [data, loc.lat, loc.lon],
  );
  const near = all.filter((h) => h.km <= NEAR_KM);
  const byId = useMemo(() => new Map(all.map((s) => [s.id, s])), [all]);
  const points = useMemo<MapPoint[]>(
    () => all.map((s) => ({ id: s.id, lat: s.lat, lon: s.lon, label: `Огнище на ${Math.round(s.km)} км на ${s.dir}, ${timeAgoLong(s.time)}` })),
    [all],
  );
  const list = showAll ? all : all.slice(0, 5);

  return (
    <section aria-labelledby="fires-title" className="enter">
      <h2 id="fires-title" className="px-1 font-display text-[20px] font-semibold">
        Пожари, видени от спътник
      </h2>

      {data ? (
        <p className="px-1 pt-1.5 text-[16px] leading-snug">
          {near.length === 0 ? (
            <>
              Няма засечен огън до {NEAR_KM} км от {who} за последните {data.hours} часа.
            </>
          ) : (
            <>
              <span className="font-semibold text-ember">{fires(near.length)}</span> до {NEAR_KM} км от {who} за последните{" "}
              {data.hours} часа.
            </>
          )}{" "}
          <span className="text-muted">В цялата страна: {fires(all.length)}.</span>
        </p>
      ) : (
        <p className="px-1 pt-1.5 text-[16px] text-muted">Местата, където спътниците на NASA засичат огън.</p>
      )}

      <div className="mt-3 overflow-hidden rounded-[20px] bg-card shadow-[var(--shadow)]">
        {!data && loading && <div className="skeleton aspect-[1000/657] w-full" />}
        {!data && !loading && (
          <div className="p-5">
            <p className="text-[15px]">{error}</p>
            <button
              onClick={retry}
              className="pressable mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content"
            >
              <RotateCw size={18} strokeWidth={2} aria-hidden />
              Опитай пак
            </button>
          </div>
        )}
        {data && (
          <>
            <div className="p-2 pt-3 lg:p-4">
              <BulgariaMap
                ariaLabel={`Карта на България с ${fires(all.length)} от последните ${data.hours} часа`}
                points={points}
                onPoints={(pts) => setPicked(pts.map((p) => byId.get(p.id)!).filter(Boolean))}
                me={{ lat: loc.lat, lon: loc.lon, radiusKm: NEAR_KM }}
              />
            </div>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 border-t border-line px-4 py-3 text-[13px] text-muted" aria-label="Легенда">
              <li className="inline-flex items-center gap-2">
                <span className="size-3 rounded-full border-2 border-white bg-[var(--ember)] shadow-[0_0_0_1px_var(--line)]" aria-hidden />
                Засечен огън
              </li>
              <li className="inline-flex items-center gap-2">
                <span className="size-3 rounded-full border-2 border-white bg-[#1f6fd1] shadow-[0_0_0_1px_var(--line)]" aria-hidden />
                {loc.source === "gps" ? "Вие" : loc.label}
              </li>
              <li className="inline-flex items-center gap-2">
                <span className="size-3 rounded-full border-[1.5px] border-dashed border-[#1f6fd1]" aria-hidden />
                {NEAR_KM} км около {loc.source === "gps" ? "вас" : "мястото"}
              </li>
            </ul>
          </>
        )}
      </div>

      {data && all.length > 0 && (
        <>
          <h3 className="px-1 pt-5 text-[15px] font-semibold">Най-близо до {who}</h3>
          <ul className="mt-2 divide-y divide-line overflow-hidden rounded-[20px] bg-card shadow-[var(--shadow)]">
            {list.map((h) => (
              <li key={h.id}>
                <button
                  onClick={() => setPicked([h])}
                  className="flex min-h-14 w-full items-center justify-between gap-3 px-4 py-2.5 text-left hover:bg-line/50 active:bg-line"
                >
                  <span className="min-w-0">
                    <span className="block text-[16px] font-medium tabular-nums">
                      {Math.round(h.km)} км на {h.dir}
                      {h.km <= NEAR_KM && <span className="text-ember"> · наблизо</span>}
                    </span>
                    <span className="block text-[13px] text-muted">
                      {timeAgoLong(h.time)} · {strength(h.frp)} топлина
                    </span>
                  </span>
                  <ChevronRight size={20} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
                </button>
              </li>
            ))}
          </ul>
          {all.length > 5 && (
            <button
              onClick={() => setShowAll((v) => !v)}
              className="pressable mt-2 min-h-11 px-1 text-[15px] font-medium text-accent"
              aria-expanded={showAll}
            >
              {showAll ? "Покажи по-малко" : `Покажи всички ${all.length}`}
            </button>
          )}
        </>
      )}

      <p className="flex gap-2 px-1 pt-3 text-[13px] leading-snug text-muted">
        <Satellite size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Спътниците VIIRS на NASA засичат силна топлина няколко пъти на ден. Освен горски пожар това може да е горящо
          стърнище, сметище или завод, затова точката не е потвърден пожар.
          {offline && <span className="font-medium text-ember"> Нямате връзка, показваме последните запазени данни.</span>}
        </span>
      </p>

      <SpotSheet spots={picked} who={who} onClose={() => setPicked(null)} onPick={(s) => setPicked([s])} />
    </section>
  );
}

function SpotSheet({ spots, who, onClose, onPick }: { spots: Spot[] | null; who: string; onClose: () => void; onPick: (s: Spot) => void }) {
  const one = spots?.length === 1 ? spots[0] : null;
  return (
    <Sheet
      open={!!spots && spots.length > 0}
      onClose={onClose}
      title={one ? "Засечен огън" : `${spots?.length ?? 0} огнища на едно място`}
      description={
        one
          ? `${Math.round(one.km)} км на ${one.dir} от ${who}, ${timeAgoLong(one.time)}.`
          : "Спътникът ги е видял близо едно до друго. Изберете едно за подробности."
      }
    >
      {one ? (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-[15px] tabular-nums">
            <div>
              <dt className="text-[13px] text-muted">Кога</dt>
              <dd className="font-medium">{sofiaTime(one.time, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Топлина</dt>
              <dd className="font-medium">
                {strength(one.frp)} <span className="text-muted">({nf(one.frp, 1)} MW)</span>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Сигурност на засичането</dt>
              <dd className="font-medium">{CONF[one.confidence]}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">Координати</dt>
              <dd className="font-medium">
                {one.lat.toFixed(4)}, {one.lon.toFixed(4)}
              </dd>
            </div>
          </dl>
          <div className="mt-5 grid grid-cols-2 gap-3">
            <a
              href={`https://www.google.com/maps/search/?api=1&query=${one.lat},${one.lon}`}
              target="_blank"
              rel="noreferrer"
              className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line text-[15px] font-semibold"
            >
              <Navigation size={18} strokeWidth={2} aria-hidden />
              Виж на карта
            </a>
            <a
              href="tel:112"
              className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#c7361f] text-[15px] font-semibold text-white"
            >
              <Phone size={18} strokeWidth={2} aria-hidden />
              Звънни на 112
            </a>
          </div>
          <p className="pt-3 text-[14px] leading-snug text-muted">
            Звъннете, ако виждате дим или огън на място. Точката от спътника сама по себе си не е повод за обаждане.
          </p>
        </>
      ) : (
        <ul className="-mx-2 divide-y divide-line">
          {spots?.map((s) => (
            <li key={s.id}>
              <button
                onClick={() => onPick(s)}
                className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-line/50 active:bg-line"
              >
                <span>
                  <span className="block text-[16px] font-medium tabular-nums">
                    {Math.round(s.km)} км на {s.dir}
                  </span>
                  <span className="block text-[13px] text-muted">
                    {timeAgoLong(s.time)} · {strength(s.frp)} топлина
                  </span>
                </span>
                <ChevronRight size={20} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}
