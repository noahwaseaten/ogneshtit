"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Phone, Navigation, ChevronRight, ArrowRight } from "lucide-react";
import { useJson, timeAgoLong, sofiaTime, nf, type Loc } from "@/lib/client";
import { distanceKm } from "@/lib/geo";
import { bearingWord } from "@/lib/oblast";
import type { FiresResponse, Hotspot } from "@/lib/fires";
import { BulgariaMap, type MapPoint } from "./BulgariaMap";
import { Sheet } from "./Sheet";

export const NEAR_KM = 50;
const CONF = { high: "висока", nominal: "средна", low: "ниска" } as const;
export const strength = (frp: number) => (frp < 5 ? "слаба" : frp < 20 ? "средна" : frp < 80 ? "силна" : "много силна");
export const firesWord = (n: number) => (n === 1 ? "1 огнище" : `${n} огнища`);

export type Spot = Hotspot & { id: string; km: number; dir: string };

/** Satellite hotspots sorted by distance from the chosen place. */
export function useSpots(loc: Loc) {
  const res = useJson<FiresResponse>("/api/fires");
  const all = useMemo<Spot[]>(
    () =>
      (res.data?.hotspots ?? [])
        .map((h, i) => ({
          ...h,
          id: `${i}:${h.lat},${h.lon},${h.time}`,
          km: distanceKm(loc.lat, loc.lon, h.lat, h.lon),
          dir: bearingWord(loc.lat, loc.lon, h.lat, h.lon),
        }))
        .sort((a, b) => a.km - b.km),
    [res.data, loc.lat, loc.lon],
  );
  const points = useMemo<MapPoint[]>(
    () => all.map((s) => ({ id: s.id, lat: s.lat, lon: s.lon, label: `Огнище на ${Math.round(s.km)} км на ${s.dir}, ${timeAgoLong(s.time)}` })),
    [all],
  );
  const byId = useMemo(() => new Map(all.map((s) => [s.id, s])), [all]);
  return { ...res, all, near: all.filter((h) => h.km <= NEAR_KM), points, byId };
}

/**
 * Home screen fires: the sentence that matters and a map you can tap without leaving the page.
 * Pan and zoom live on the Карта tab, where the map can take the whole screen without
 * fighting the page scroll.
 */
export function FiresSummary({ loc }: { loc: Loc }) {
  const { data, all, near, points, byId, loading } = useSpots(loc);
  const [picked, setPicked] = useState<Spot[] | null>(null);
  const who = loc.source === "gps" ? "вас" : loc.label;
  return (
    <section aria-labelledby="fires-title" className="enter">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="fires-title" className="font-display text-[20px] font-semibold">
          Огън наблизо
        </h2>
        <Link href="/karta" className="inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-accent">
          Цяла карта
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Link>
      </div>
      <p className="px-1 text-[16px] leading-snug">
        {!data ? (
          loading ? "Зареждаме…" : "Данните от спътниците не се заредиха."
        ) : near.length === 0 ? (
          <>Спътниците не са видели огън до {NEAR_KM} км от {who} за {data.hours} часа.</>
        ) : (
          <>
            <span className="font-semibold text-ember">{firesWord(near.length)}</span> до {NEAR_KM} км от {who} за {data.hours} часа.
          </>
        )}
      </p>
      <div className="mt-3 overflow-hidden rounded-[20px] bg-card p-2">
        <BulgariaMap
          ariaLabel={`Карта с ${firesWord(all.length)} в България`}
          points={points}
          onPoints={(pts) => setPicked(pts.map((p) => byId.get(p.id)!).filter(Boolean))}
          me={{ lat: loc.lat, lon: loc.lon, radiusKm: NEAR_KM }}
          cities={false}
        />
      </div>
      <SpotSheet spots={picked} who={who} onClose={() => setPicked(null)} onPick={(s) => setPicked([s])} />
    </section>
  );
}

export function SpotSheet({ spots, who, onClose, onPick }: { spots: Spot[] | null; who: string; onClose: () => void; onPick: (s: Spot) => void }) {
  const one = spots?.length === 1 ? spots[0] : null;
  return (
    <Sheet
      open={!!spots && spots.length > 0}
      onClose={onClose}
      title={one ? "Засечен огън" : `${spots?.length ?? 0} огнища едно до друго`}
      description={one ? `${Math.round(one.km)} км на ${one.dir} от ${who}, ${timeAgoLong(one.time)}.` : "Изберете едно за подробности или приближете картата."}
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
              Google Maps
            </a>
            <a href="tel:112" className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-[#c7361f] text-[15px] font-semibold text-white">
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
              <SpotRow s={s} onClick={() => onPick(s)} />
            </li>
          ))}
        </ul>
      )}
    </Sheet>
  );
}

export function SpotRow({ s, onClick }: { s: Spot; onClick: () => void }) {
  return (
    <button onClick={onClick} className="flex min-h-14 w-full items-center justify-between gap-3 rounded-xl px-2 py-2.5 text-left hover:bg-line/50 active:bg-line">
      <span className="min-w-0">
        <span className="block text-[16px] font-medium tabular-nums">
          {Math.round(s.km)} км на {s.dir}
          {s.km <= NEAR_KM && <span className="text-ember"> · наблизо</span>}
        </span>
        <span className="block text-[13px] text-muted">
          {timeAgoLong(s.time)} · {strength(s.frp)} топлина
        </span>
      </span>
      <ChevronRight size={20} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
    </button>
  );
}

export function useSpotPicker() {
  return useState<Spot[] | null>(null);
}
