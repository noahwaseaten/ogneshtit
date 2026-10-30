"use client";

import { useState, useSyncExternalStore } from "react";
import { Check, Share2 } from "lucide-react";
import { oblastAt } from "@shtit/core/oblast";
import { OBLASTS } from "@shtit/core/data/oblasts";
import { APP_NAME } from "@/brand";
import { ChevronDown, RotateCw, Radio, Satellite, ShieldAlert } from "lucide-react";
import type { Loc } from "@shtit/core/client";
import { STORE } from "@shtit/core/client";
import { useI18n } from "@shtit/core/i18n/client";
import { placeName } from "@shtit/core/i18n/names";
import { Segmented } from "@shtit/core/ui/Settings";
import { BANDS, airHeadline, bandByKey, bandText, leadOf, type PlaceResponse } from "@/lib/air-types";

// Who the advice is for. Remembered on the device, because a parent or someone with asthma always wants their own.
const WHO = `${STORE}:who`;
const whoListeners = new Set<() => void>();
const readWho = (): "everyone" | "sensitive" => {
  try {
    return localStorage.getItem(WHO) === "sensitive" ? "sensitive" : "everyone";
  } catch {
    return "everyone";
  }
};
export function useWho() {
  const who = useSyncExternalStore(
    (cb) => {
      whoListeners.add(cb);
      return () => whoListeners.delete(cb);
    },
    readWho,
    () => "everyone" as const,
  );
  const set = (v: "everyone" | "sensitive") => {
    try {
      localStorage.setItem(WHO, v);
    } catch {}
    whoListeners.forEach((l) => l());
  };
  return [who, set] as const;
}

/**
 * The air now, as plain as a road sign: the band in large type, the particle number that decides it, the six-step
 * scale, and the EEA's advice for the person reading (everyone, or children, older people and people with asthma,
 * heart or lung disease). Measured by citizen sensors nearby when there are enough of them; else the forecast.
 */
export function AirCard({ data, loading, error, offline, onRetry, loc }: { data: PlaceResponse | null; loading: boolean; error: string | null; offline: boolean; onRetry: () => void; loc: Loc }) {
  const { t, lang, nf, inPlace, agoLong } = useI18n();
  const [who, setWho] = useWho();

  if (!data) {
    if (loading) return <div className="skeleton h-[360px] rounded-[24px]" aria-label={t("Зареждаме въздуха сега", "Loading the air now")} />;
    return (
      <div className="rounded-[20px] bg-card p-5">
        <p className="font-display text-lg font-semibold">{t("Не успяхме да вземем данните за въздуха", "We couldn't get the air data")}</p>
        <p className="pt-1 text-[15px] text-muted">{error}</p>
        <button onClick={onRetry} className="pressable mt-4 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content">
          <RotateCw size={18} strokeWidth={2} aria-hidden />
          {t("Опитай пак", "Try again")}
        </button>
      </div>
    );
  }

  const measured = data.sensors?.band ? data.sensors : null;
  const pm25 = measured?.pm25 ?? data.now?.pm25 ?? null;
  const pm10 = measured?.pm10 ?? data.now?.pm10 ?? null;
  const b = bandByKey(measured?.band ?? data.now?.band ?? "good");
  const text = bandText(b, lang);
  const lead = leadOf(pm25, pm10);
  const place = loc.source === "gps" ? t("около вас", "around you") : inPlace(placeName(loc.label, lang));

  return (
    <section aria-labelledby="air-title" className="enter">
      <div className="relative overflow-hidden rounded-[24px] p-5 lg:p-6" style={{ background: b.color, color: b.onColor }}>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[15px] font-semibold opacity-90">{t(`Качество на въздуха сега ${place}`, `Air quality now ${place}`)}</p>
          <ShareButton text={t(`${airHeadline(b, "bg")} сега ${place}.`, `${airHeadline(b, "en")} now ${place}.`)} loc={loc} />
        </div>
        <h2 id="air-title" className="pt-0.5 font-display text-[44px] font-bold leading-[1.05] tracking-[-0.02em] lg:text-[52px]">
          {text.label}
        </h2>

        <div className="flex items-end gap-2 pt-4 tabular-nums">
          <span className="font-display text-[40px] font-bold leading-none">{pm25 != null ? nf(lead === "pm10" ? (pm10 ?? 0) : pm25) : "?"}</span>
          <span className="pb-1 text-[15px] font-semibold opacity-90">µg/m³</span>
          <span className="pb-1 text-[15px] opacity-85">{lead === "pm10" ? t("ФПЧ10, едри прахови частици", "PM10, coarse particles") : t("ФПЧ2,5, фини прахови частици", "PM2.5, fine particles")}</span>
        </div>

        <div className="pt-5" role="img" aria-label={t(`Ниво ${b.index + 1} от 6`, `Level ${b.index + 1} of 6`)}>
          <div className="flex gap-1">
            {BANDS.map((c) => (
              <span key={c.key} className="h-2 flex-1 rounded-full" style={{ background: "currentColor", opacity: c.index === b.index ? 1 : c.index < b.index ? 0.45 : 0.18 }} />
            ))}
          </div>
          <div className="flex justify-between pt-1.5 text-[12px] font-medium tabular-nums opacity-85">
            <span>{t(`Ниво ${b.index + 1} от 6`, `Level ${b.index + 1} of 6`)}</span>
            <span>{t("Добро до изключително лошо", "Good to extremely poor")}</span>
          </div>
        </div>

        <p className="flex items-start gap-2 pt-4 text-[14px] font-medium leading-snug opacity-90">
          {measured ? <Radio size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden /> : <Satellite size={16} strokeWidth={2} className="mt-0.5 shrink-0" aria-hidden />}
          {measured
            ? t(
                `Измерено от ${measured.count} граждански датчика до ${measured.km} км, ${measured.newest ? agoLong(measured.newest) : "сега"}.`,
                `Measured by ${measured.count} citizen sensors within ${measured.km} km, ${measured.newest ? agoLong(measured.newest) : "now"}.`,
              )
            : t("По прогнозата на CAMS. Наблизо няма достатъчно датчици.", "From the CAMS forecast. Not enough sensors nearby.")}
        </p>
      </div>

      <div className="pt-4">
        <Segmented
          label={t("За кого е съветът", "Who the advice is for")}
          value={who}
          options={[
            { value: "everyone", label: t("За всички", "Everyone") },
            { value: "sensitive", label: t("Деца, възрастни, астма", "Children, elderly, asthma") },
          ]}
          onChange={setWho}
        />
      </div>
      <div className="flex gap-3 px-1 pt-3">
        <ShieldAlert size={22} strokeWidth={1.75} className="mt-0.5 shrink-0 text-content" aria-hidden />
        <p className="text-[16px] leading-snug" aria-live="polite">
          {who === "sensitive" ? text.sensitive : text.everyone}
        </p>
      </div>

      <details className="group px-1 pt-3">
        <summary className="inline-flex min-h-11 cursor-pointer list-none items-center gap-1.5 text-[15px] font-medium text-accent [&::-webkit-details-marker]:hidden">
          {t("Откъде са числата?", "Where do the numbers come from?")}
          <ChevronDown size={16} strokeWidth={2} className="transition-transform duration-200 group-open:rotate-180" aria-hidden />
        </summary>
        <div className="flex flex-col gap-2 pb-1 text-[15px] leading-snug text-muted">
          {lang === "bg" ? (
            <>
              <p>
                Нивата са от Европейския индекс за качество на въздуха на Европейската агенция за околна среда (EEA), по часовите
                стойности на фините (ФПЧ2,5) и едрите (ФПЧ10) прахови частици. Зимата у нас те идват главно от отоплението на дърва и
                въглища. Съветите под картата са на EEA.
              </p>
              <p>
                „Сега“ е средното (медианата) от гражданските датчици на sensor.community наоколо, ако са поне 3. Не ползваме датчици
                при влажност от 90% нагоре (тогава броят мъглата за прах), блокирали датчици и такива, които показват многократно
                повече от съседите си. Прогнозата е от CAMS, атмосферната служба на Copernicus, която ползва и държавните станции.
                Следващите часове са прогнозата, сверена с измереното сега.
              </p>
              {measured && data.now && (
                <p>
                  Прогнозата за този час е <span className="font-medium text-content tabular-nums">{nf(data.now.pm25)} µg/m³</span> ФПЧ2,5.
                </p>
              )}
            </>
          ) : (
            <>
              <p>
                The levels are the European Environment Agency&apos;s (EEA) European Air Quality Index, from hourly fine (PM2.5) and coarse
                (PM10) particles. In a Bulgarian winter they come mostly from heating with wood and coal. The advice above is the EEA&apos;s.
              </p>
              <p>
                &quot;Now&quot; is the median of the sensor.community citizen sensors nearby, when there are at least 3. We leave out sensors
                at 90% humidity or more (they count fog as dust), stuck sensors, and ones reading many times more than their
                neighbours. The forecast is CAMS, the Copernicus atmosphere service, which also takes in the official stations. The
                hours ahead are the forecast, matched to what is measured now.
              </p>
              {measured && data.now && (
                <p>
                  The forecast for this hour is <span className="font-medium text-content tabular-nums">{nf(data.now.pm25)} µg/m³</span> PM2.5.
                </p>
              )}
            </>
          )}
        </div>
      </details>

      <p className="px-1 pt-2 text-[13px] leading-snug text-muted">
        {offline
          ? t(`Нямате връзка. Данни от ${agoLong(data.updated)}.`, `You're offline. Data from ${agoLong(data.updated)}.`)
          : data.backupFrom
            ? t(`Датчиците не отговарят; запазено копие от ${agoLong(data.backupFrom)}.`, `The sensors aren't answering; saved copy from ${agoLong(data.backupFrom)}.`)
            : t(`Обновено ${agoLong(data.updated)}.`, `Updated ${agoLong(data.updated)}.`)}
      </p>
    </section>
  );
}

/** Shares a link whose preview shows today's level for this place. A GPS position is replaced by its oblast's centre. */
function ShareButton({ text, loc }: { text: string; loc: Loc }) {
  const [done, setDone] = useState(false);
  const { t, lang } = useI18n();
  const share = async () => {
    const o = loc.source === "gps" ? oblastAt(loc.lat, loc.lon) : null;
    const c = o ? OBLASTS.find((x) => x.code === o.code)! : null;
    const q = new URLSearchParams(
      c ? { lat: c.lat.toFixed(2), lon: c.lon.toFixed(2), n: `област ${c.name.replace(/ (град|област)$/, "")}` } : { lat: loc.lat.toFixed(2), lon: loc.lon.toFixed(2), n: loc.label },
    );
    q.set("l", lang);
    const url = `${window.location.origin}/s?${q}`;
    try {
      if (navigator.share) await navigator.share({ title: APP_NAME[lang], text, url });
      else {
        await navigator.clipboard.writeText(`${text} ${url}`);
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }
    } catch {}
  };
  return (
    <button onClick={share} aria-label={done ? t("Копирано", "Copied") : t("Сподели", "Share")} className="pressable relative -mr-2 -mt-2 grid size-11 shrink-0 place-items-center rounded-full hover:bg-black/10">
      <Share2 size={20} strokeWidth={2} aria-hidden className="swap absolute" data-hidden={done} />
      <Check size={20} strokeWidth={2.25} aria-hidden className="swap absolute" data-hidden={!done} />
    </button>
  );
}
