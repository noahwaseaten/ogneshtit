"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Phone, Navigation, ChevronRight, ArrowRight } from "lucide-react";
import { useJson, useNow, type Loc } from "@/lib/client";
import { distanceKm } from "@/lib/geo";
import { bearingWord } from "@/lib/oblast";
import { isCurrent, isReal, type Fire, type FiresResponse, type Sat } from "@/lib/fire-types";
import { useI18n } from "@/i18n/client";
import { formatters } from "@/i18n/format";
import type { Lang } from "@/i18n/lang";
import { placeName } from "@/i18n/names";
import { BulgariaMap, type MapPoint } from "./BulgariaMap";
import { FireTile, HeatMeter } from "./FireMark";
import { Sheet } from "./Sheet";

export const NEAR_KM = 50;
export const strength = (frp: number, lang: Lang) => {
  const i = heatRank(frp);
  return (lang === "bg" ? ["слаба", "средна", "силна", "много силна"] : ["weak", "medium", "strong", "very strong"])[i];
};
export const firesWord = (n: number, lang: Lang) =>
  lang === "bg" ? (n === 1 ? "1 огнище" : `${n} огнища`) : n === 1 ? "1 fire" : `${n} fires`;

export type Spot = Fire & { km: number; dir: string };

/** Fires coloured and sized by how much heat the satellite measured, yellow to deep red. */
export const HEAT = [
  { max: 5, color: "var(--heat-1)" },
  { max: 20, color: "var(--heat-2)" },
  { max: 80, color: "var(--heat-3)" },
  { max: Infinity, color: "var(--heat-4)" },
] as const;
export const heatRank = (frp: number) => Math.max(0, HEAT.findIndex((h) => frp < h.max));
export const heatColor = (frp: number) => HEAT[heatRank(frp)].color;

export const SAT_NAMES: Record<Sat, string> = { SNPP: "Suomi NPP", "NOAA-20": "NOAA-20", "NOAA-21": "NOAA-21", Terra: "Terra", Aqua: "Aqua" };

/** "18 км на северозапад" / "18 km northwest" */
const where = (s: Spot, lang: Lang) => (lang === "bg" ? `${Math.round(s.km)} км на ${s.dir}` : `${Math.round(s.km)} km ${s.dir}`);

/** Who the distances are measured from: "вас"/"you" for GPS, otherwise the place name. */
export const whoOf = (loc: Loc, lang: Lang) => (loc.source === "gps" ? (lang === "bg" ? "вас" : "you") : placeName(loc.label, lang));

/** Short verdict for lists. */
export function verdict(s: Fire, lang: Lang) {
  const bg = lang === "bg";
  if (s.status === "static") return bg ? "Постоянна топлина, вероятно завод" : "Constant heat, probably industry";
  if (s.status === "weak") return bg ? "Слаб сигнал" : "Weak signal";
  if (s.missed > 0) return bg ? "Не е видян отново" : "Not seen again";
  if (s.status === "confirmed") return bg ? `Потвърден, видян ${s.passes} пъти` : `Confirmed, seen ${s.passes} times`;
  return bg ? "Видян веднъж" : "Seen once";
}

/**
 * Fires sorted by distance from the chosen place. By default only real ones (confirmed or seen once with
 * normal confidence); `showAll` adds weak signals and permanent heat sources, drawn pale.
 */
export function useSpots(loc: Loc, showAll = false) {
  const res = useJson<FiresResponse>("/api/fires");
  const { lang, t, agoLong } = useI18n();
  const now = useNow();
  const every = useMemo<Spot[]>(
    () =>
      (res.data?.fires ?? [])
        .map((f) => ({ ...f, km: distanceKm(loc.lat, loc.lon, f.lat, f.lon), dir: bearingWord(loc.lat, loc.lon, f.lat, f.lon, lang) }))
        .sort((a, b) => a.km - b.km),
    [res.data, loc.lat, loc.lon, lang],
  );
  const all = useMemo(() => (showAll ? every : every.filter(isReal)), [every, showAll]);
  const hidden = every.length - every.filter(isReal).length;
  const points = useMemo<MapPoint[]>(
    () =>
      all.map((s) => {
        const pale = !isCurrent(s, now);
        return {
          id: s.id,
          lat: s.lat,
          lon: s.lon,
          label: `${t("Огнище на", "Fire")} ${where(s, lang)}, ${agoLong(s.last)}. ${verdict(s, lang)}.`,
          color: heatColor(s.frp),
          // The strongest current fire decides a group's look.
          rank: (pale ? 10 : 0) - heatRank(s.frp),
          tier: heatRank(s.frp),
          pale,
        };
      }),
    [all, t, lang, agoLong, now],
  );
  const byId = useMemo(() => new Map(every.map((s) => [s.id, s])), [every]);
  return { ...res, all, hidden, near: all.filter((h) => h.km <= NEAR_KM && isReal(h)), points, byId };
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
  const { t } = useI18n();
  const title = !one
    ? t(`${spots?.length ?? 0} огнища едно до друго`, `${spots?.length ?? 0} fires close together`)
    : one.status === "static"
      ? t("Вероятно не е пожар", "Probably not a wildfire")
      : one.status === "weak"
        ? t("Слаб сигнал от спътник", "Weak satellite signal")
        : one.status === "confirmed"
          ? t("Потвърден огън", "Confirmed fire")
          : t("Засечен огън", "Detected fire");
  return (
    <Sheet
      open={!!spots && spots.length > 0}
      onClose={onClose}
      title={title}
      description={
        one
          ? t(`${where(one, "bg")} от ${who}.`, `${where(one, "en")} of ${who}.`)
          : t("Изберете едно за подробности или приближете картата.", "Pick one for details, or zoom in on the map.")
      }
    >
      {one ? (
        <FireDetails f={one} />
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

/** Everything we know about one fire, and how sure we are, in plain words. */
function FireDetails({ f }: { f: Spot }) {
  const { t, lang, nf, time, agoLong } = useI18n();
  const now = useNow();
  const when = (iso: string) => time(iso, { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" });
  const sats = f.sats.map((s) => SAT_NAMES[s]).join(", ");
  const modisOnly = f.sats.every((s) => s === "Terra" || s === "Aqua");
  const old = now - Date.parse(f.last) > 24 * 3600e3;

  const why =
    f.status === "static"
      ? t(
          `На това място спътниците виждат топлина в ${f.days ?? 0} различни дни през последните две седмици. Така изглежда завод, ТЕЦ или сметище, а не горски пожар.`,
          `Satellites have seen heat at this spot on ${f.days ?? 0} different days in the past two weeks. That is what a factory, power plant or landfill looks like, not a wildfire.`,
        )
      : f.status === "weak"
        ? t(
            "Един слаб сигнал. Често това не е огън: слънчев отблясък, нагрят покрив или нещо малко, което бързо е угаснало.",
            "One weak signal. Often this is not a fire: sun glint, a hot roof, or something small that went out quickly.",
          )
        : f.status === "confirmed"
          ? t(
              `Видян при ${f.passes} отделни преминавания на спътник. Това почти сигурно е истински огън: горски пожар, горящо стърнище или сметище.`,
              `Seen on ${f.passes} separate satellite passes. This is almost certainly a real fire: a wildfire, burning stubble or a landfill.`,
            )
          : t(
              "Видян само веднъж. Може да е пожар, може и да е кратко палене на стърнище или боклук. Следващото преминаване на спътник ще покаже.",
              "Seen only once. It may be a wildfire, or a short burn of stubble or rubbish. The next satellite pass will tell.",
            );
  const after =
    f.status !== "static" && f.missed > 0
      ? t(
          "След това спътник е минал отново и не го е видял. Може вече да е угаснал или да е бил закрит от облаци.",
          "A satellite passed again afterwards and did not see it. It may have gone out, or been hidden by cloud.",
        )
      : null;

  return (
    <>
      <div className="rounded-2xl bg-surface p-4">
        <p className="text-[15px] leading-snug">{why}</p>
        {after && <p className="pt-2 text-[15px] leading-snug">{after}</p>}
        {old && <p className="pt-2 text-[15px] font-medium leading-snug">{t(`Последно видян ${agoLong(f.last)}.`, `Last seen ${agoLong(f.last)}.`)}</p>}
      </div>
      <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-[15px] tabular-nums">
        <div>
          <dt className="text-[13px] text-muted">{t("Последно видян", "Last seen")}</dt>
          <dd className="font-medium">{when(f.last)}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">{t("Първо видян", "First seen")}</dt>
          <dd className="font-medium">{f.first === f.last ? t("същото", "same time") : when(f.first)}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">{t("Топлина", "Heat")}</dt>
          <dd className="font-medium">
            <HeatMeter tier={heatRank(f.frp)} color={heatColor(f.frp)} /> {strength(f.frp, lang)} <span className="text-muted">({nf(f.frp, 1)} MW)</span>
          </dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">{t("Спътници", "Satellites")}</dt>
          <dd className="font-medium">{sats}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">{t("Точност на мястото", "Position accuracy")}</dt>
          <dd className="font-medium">{modisOnly ? t("до 1 км", "within 1 km") : t("до 400 м", "within 400 m")}</dd>
        </div>
        <div>
          <dt className="text-[13px] text-muted">{t("Координати", "Coordinates")}</dt>
          <dd className="font-medium">
            {f.lat.toFixed(4)}, {f.lon.toFixed(4)}
          </dd>
        </div>
      </dl>
      <div className="mt-5 grid grid-cols-2 gap-3">
        <a
          href={`https://www.google.com/maps/search/?api=1&query=${f.lat},${f.lon}`}
          target="_blank"
          rel="noreferrer"
          className="pressable hover-fill flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line text-[15px] font-semibold"
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
          "Звъннете, ако виждате дим или огън на място. Точката от спътника сама по себе си не е повод за обаждане. Спътниците минават над България около 13 до 15 ч. и около 1 до 4 ч. през нощта; между две преминавания огън може да пламне или угасне, без да го видят.",
          "Call if you can see smoke or flames where you are. A satellite dot on its own is not a reason to call. Satellites pass over Bulgaria around 1 to 3 pm and around 1 to 4 am; between passes a fire can start or go out unseen.",
        )}
      </p>
    </>
  );
}

export function SpotRow({ s, onClick }: { s: Spot; onClick: () => void }) {
  const { t, lang, agoLong } = useI18n();
  const now = useNow();
  const pale = !isCurrent(s, now);
  return (
    <button onClick={onClick} className="hover-fill flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left">
      <FireTile tier={heatRank(s.frp)} pale={pale} color={heatColor(s.frp)} />
      <span className="min-w-0 flex-1">
        <span className="block text-[16px] font-medium tabular-nums">
          {where(s, lang)}
          {s.km <= NEAR_KM && isReal(s) && <span className="text-ember"> · {t("наблизо", "nearby")}</span>}
        </span>
        <span className="block text-[13px] text-muted">
          {verdict(s, lang)} · {agoLong(s.last)} · <HeatMeter tier={heatRank(s.frp)} color={heatColor(s.frp)} />
          <span className="sr-only">{t(`${strength(s.frp, "bg")} топлина`, `${strength(s.frp, "en")} heat`)}</span>
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
