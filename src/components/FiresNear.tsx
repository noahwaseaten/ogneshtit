"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Phone, Navigation, ChevronRight, ArrowRight } from "lucide-react";
import { useJson, type Loc } from "@/lib/client";
import { distanceKm } from "@/lib/geo";
import { bearingWord } from "@/lib/oblast";
import type { FiresResponse, Hotspot } from "@/lib/fires";
import { useI18n } from "@/i18n/client";
import { formatters } from "@/i18n/format";
import type { Lang } from "@/i18n/lang";
import { placeName } from "@/i18n/names";
import { BulgariaMap, type MapPoint } from "./BulgariaMap";
import { FireTile, HeatMeter, fireAge } from "./FireMark";
import { Sheet } from "./Sheet";

export const NEAR_KM = 50;
const CONF = { high: ["висока", "high"], nominal: ["средна", "medium"], low: ["ниска", "low"] } as const;
export const strength = (frp: number, lang: Lang) => {
  const i = frp < 5 ? 0 : frp < 20 ? 1 : frp < 80 ? 2 : 3;
  return (lang === "bg" ? ["слаба", "средна", "силна", "много силна"] : ["weak", "medium", "strong", "very strong"])[i];
};
export const firesWord = (n: number, lang: Lang) =>
  lang === "bg" ? (n === 1 ? "1 огнище" : `${n} огнища`) : n === 1 ? "1 fire" : `${n} fires`;

export type Spot = Hotspot & { id: string; km: number; dir: string };

/** Fires coloured by how much heat the satellite measured, yellow to deep red. Older than a day: faded. */
export const HEAT = [
  { max: 5, color: "var(--heat-1)" },
  { max: 20, color: "var(--heat-2)" },
  { max: 80, color: "var(--heat-3)" },
  { max: Infinity, color: "var(--heat-4)" },
] as const;
export const heatRank = (frp: number) => HEAT.findIndex((h) => frp < h.max);
export const heatColor = (frp: number) => HEAT[heatRank(frp)].color;
export const isOld = (iso: string, now = Date.now()) => now - new Date(iso).getTime() > 24 * 3600e3;

/** "18 км на северозапад" / "18 km northwest" */
const where = (s: Spot, lang: Lang) => (lang === "bg" ? `${Math.round(s.km)} км на ${s.dir}` : `${Math.round(s.km)} km ${s.dir}`);

/** Who the distances are measured from: "вас"/"you" for GPS, otherwise the place name. */
export const whoOf = (loc: Loc, lang: Lang) => (loc.source === "gps" ? (lang === "bg" ? "вас" : "you") : placeName(loc.label, lang));

/** Satellite hotspots sorted by distance from the chosen place. */
export function useSpots(loc: Loc) {
  const res = useJson<FiresResponse>("/api/fires");
  const { lang, t, agoLong } = useI18n();
  const all = useMemo<Spot[]>(
    () =>
      (res.data?.hotspots ?? [])
        .map((h, i) => ({
          ...h,
          id: `${i}:${h.lat},${h.lon},${h.time}`,
          km: distanceKm(loc.lat, loc.lon, h.lat, h.lon),
          dir: bearingWord(loc.lat, loc.lon, h.lat, h.lon, lang),
        }))
        .sort((a, b) => a.km - b.km),
    [res.data, loc.lat, loc.lon, lang],
  );
  const points = useMemo<MapPoint[]>(
    () =>
      all.map((s) => ({
        id: s.id,
        lat: s.lat,
        lon: s.lon,
        label: `${t("Огнище на", "Fire")} ${where(s, lang)}, ${agoLong(s.time)}`,
        color: heatColor(s.frp),
        // Strongest fire decides a group's colour; fresh fires win over old ones.
        rank: (isOld(s.time) ? 10 : 0) - heatRank(s.frp),
        tier: heatRank(s.frp),
        age: fireAge(s.time),
      })),
    [all, t, lang, agoLong],
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
  const { t, lang } = useI18n();
  const who = whoOf(loc, lang);
  return (
    <section aria-labelledby="fires-title" className="enter">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <h2 id="fires-title" className="font-display text-[20px] font-semibold">
          {t("Огън наблизо", "Fire nearby")}
        </h2>
        <Link href="/karta" className="inline-flex min-h-11 items-center gap-1 text-[15px] font-medium text-accent">
          {t("Цяла карта", "Full map")}
          <ArrowRight size={16} strokeWidth={2} aria-hidden />
        </Link>
      </div>
      <p className="px-1 text-[16px] leading-snug">
        {!data ? (
          loading ? (
            t("Зареждаме…", "Loading…")
          ) : (
            t("Данните от спътниците не се заредиха.", "The satellite data didn't load.")
          )
        ) : near.length === 0 ? (
          t(
            `Спътниците не са видели огън до ${NEAR_KM} км от ${who} за ${data.hours} часа.`,
            `Satellites haven't seen any fire within ${NEAR_KM} km of ${who} in the last ${data.hours} hours.`,
          )
        ) : (
          <>
            <span className="font-semibold text-ember">{firesWord(near.length, lang)}</span>{" "}
            {t(`до ${NEAR_KM} км от ${who} за ${data.hours} часа.`, `within ${NEAR_KM} km of ${who} in the last ${data.hours} hours.`)}
          </>
        )}
      </p>
      <div className="mt-3 overflow-hidden rounded-[20px] bg-card p-2">
        <BulgariaMap
          ariaLabel={t(`Карта с ${firesWord(all.length, "bg")} в България`, `Map with ${firesWord(all.length, "en")} in Bulgaria`)}
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
  const { t, tp, lang, nf, time, agoLong } = useI18n();
  return (
    <Sheet
      open={!!spots && spots.length > 0}
      onClose={onClose}
      title={one ? t("Засечен огън", "Detected fire") : t(`${spots?.length ?? 0} огнища едно до друго`, `${spots?.length ?? 0} fires close together`)}
      description={
        one
          ? t(`${where(one, "bg")} от ${who}, ${agoLong(one.time)}.`, `${where(one, "en")} of ${who}, ${agoLong(one.time)}.`)
          : t("Изберете едно за подробности или приближете картата.", "Pick one for details, or zoom in on the map.")
      }
    >
      {one ? (
        <>
          <dl className="grid grid-cols-2 gap-x-4 gap-y-4 text-[15px] tabular-nums">
            <div>
              <dt className="text-[13px] text-muted">{t("Кога", "When")}</dt>
              <dd className="font-medium">{time(one.time, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" })}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">{t("Топлина", "Heat")}</dt>
              <dd className="font-medium">
                <HeatMeter tier={heatRank(one.frp)} color={heatColor(one.frp)} /> {strength(one.frp, lang)} <span className="text-muted">({nf(one.frp, 1)} MW)</span>
              </dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">{t("Сигурност на засичането", "Detection confidence")}</dt>
              <dd className="font-medium">{tp(CONF[one.confidence])}</dd>
            </div>
            <div>
              <dt className="text-[13px] text-muted">{t("Координати", "Coordinates")}</dt>
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
              {t("Звънни на 112", "Call 112")}
            </a>
          </div>
          <p className="pt-3 text-[14px] leading-snug text-muted">
            {t(
              "Звъннете, ако виждате дим или огън на място. Точката от спътника сама по себе си не е повод за обаждане.",
              "Call if you can see smoke or flames where you are. A satellite dot on its own is not a reason to call.",
            )}
          </p>
        </>
      ) : (
        <ul className="divide-y divide-line overflow-hidden rounded-2xl bg-surface">
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
  const { t, lang, agoLong } = useI18n();
  return (
    <button onClick={onClick} className="hover-fill flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left">
      <FireTile tier={heatRank(s.frp)} age={fireAge(s.time)} color={heatColor(s.frp)} />
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-medium tabular-nums">
          {where(s, lang)}
          {s.km <= NEAR_KM && <span className="text-ember"> · {t("наблизо", "nearby")}</span>}
        </span>
        <span className="block text-[13px] text-muted">
          {agoLong(s.time)} · <HeatMeter tier={heatRank(s.frp)} color={heatColor(s.frp)} /> {t(`${strength(s.frp, "bg")} топлина`, `${strength(s.frp, "en")} heat`)}
        </span>
      </span>
      <ChevronRight size={20} strokeWidth={1.75} className="shrink-0 text-muted" aria-hidden />
    </button>
  );
}

export function useSpotPicker() {
  return useState<Spot[] | null>(null);
}

// Server-safe helper for push alerts and other non-React code.
export const fireDistance = (km: number, dir: string, lang: Lang) => formatters(lang).nf(Math.round(km)) + (lang === "bg" ? ` км на ${dir}` : ` km ${dir}`);
