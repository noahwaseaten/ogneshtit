"use client";

import { Footprints, PanelTopClose } from "lucide-react";
import { useI18n } from "@shtit/core/i18n/client";
import { bandByKey, bandText, hhmm, type Hour, type PlaceResponse, type Window } from "@/lib/air-types";

/** A small pill: the band's colour and its word, so colour is never the only signal. */
export function BandChip({ band, size = "md" }: { band: string; size?: "sm" | "md" }) {
  const { lang } = useI18n();
  const b = bandByKey(band);
  return (
    <span className={`inline-flex max-w-full items-center rounded-full font-semibold leading-tight ${size === "sm" ? "px-2 py-1 text-[12px]" : "px-2.5 py-1.5 text-[13px]"}`} style={{ background: b.color, color: b.onColor }}>
      {bandText(b, lang).label}
    </span>
  );
}

/**
 * When to go out and when to keep the windows shut: the cleanest and dirtiest three daytime hours ahead, then the next
 * 48 hours as a ribbon of bars (height = PM2.5, colour = band), the way a weather app shows hourly temperature.
 */
export function Planner({ data }: { data: PlaceResponse }) {
  const { t, lang, weekday } = useI18n();
  if (!data.hours.length) return null;
  const sameBand = data.best && data.worst && data.best.band === data.worst.band && data.worst.pm25 - data.best.pm25 < 5;
  const dayWord = (w: Window) => {
    const today = data.hours[0].time.slice(0, 10);
    return w.start.slice(0, 10) === today ? t("днес", "today") : lang === "bg" ? `в ${weekday(w.start.slice(0, 10), "long")}` : `on ${weekday(w.start.slice(0, 10), "long")}`;
  };
  return (
    <section aria-labelledby="plan-title" className="enter flex min-w-0 flex-col gap-3">
      <h2 id="plan-title" className="px-1 font-display text-[20px] font-semibold">
        {t("Кога да излезете", "When to go out")}
      </h2>
      {data.best && data.worst && (
        <div className="grid grid-cols-2 gap-3">
          <Tile
            icon={<Footprints size={20} strokeWidth={2} aria-hidden />}
            title={t("Най-чист въздух", "Cleanest air")}
            when={`${hhmm(data.best.start)} до ${hhmm(data.best.end)}`}
            whenEn={`${hhmm(data.best.start)} to ${hhmm(data.best.end)}`}
            day={dayWord(data.best)}
            band={data.best.band}
            note={t("За разходка, спорт и проветряване", "For a walk, exercise and airing the room")}
          />
          {sameBand ? (
            <div className="flex flex-col justify-center rounded-[20px] bg-card p-4 text-[15px] leading-snug text-muted">
              {t("Въздухът е почти еднакъв през целия ден.", "The air is about the same all day.")}
            </div>
          ) : (
            <Tile
              icon={<PanelTopClose size={20} strokeWidth={2} aria-hidden />}
              title={t("Затворете прозорците", "Keep windows shut")}
              when={`${hhmm(data.worst.start)} до ${hhmm(data.worst.end)}`}
              whenEn={`${hhmm(data.worst.start)} to ${hhmm(data.worst.end)}`}
              day={dayWord(data.worst)}
              band={data.worst.band}
              note={t("Най-мръсният въздух за деня", "The dirtiest air of the day")}
            />
          )}
        </div>
      )}
      <Ribbon hours={data.hours} />
      <Gap data={data} />
      {data.days.length > 1 && <Days days={data.days} />}
    </section>
  );
}

function Tile({ icon, title, when, whenEn, day, band, note }: { icon: React.ReactNode; title: string; when: string; whenEn: string; day: string; band: string; note: string }) {
  const { lang } = useI18n();
  return (
    <div className="flex flex-col gap-1 rounded-[20px] bg-card p-4">
      <p className="flex min-h-[2.6em] items-start gap-1.5 text-[14px] font-semibold leading-tight text-muted [&_svg]:shrink-0">
        {icon}
        {title}
      </p>
      <p className="pt-1 font-display text-[22px] font-bold leading-tight tabular-nums">{lang === "bg" ? when : whenEn}</p>
      <p className="text-[14px] text-muted">{day}</p>
      <div className="pt-1.5">
        <BandChip band={band} size="sm" />
      </div>
      <p className="pt-1.5 text-[13px] leading-snug text-muted">{note}</p>
    </div>
  );
}

/**
 * When the sensors nearby and the forecast disagree, say so and say what each is good for, instead of leaving people to
 * wonder why the card is cyan and the bars are yellow.
 */
function Gap({ data }: { data: PlaceResponse }) {
  const { t, nf } = useI18n();
  const s = data.sensors;
  const now = data.hours[0];
  if (!s?.band || s.pm25 == null || !now || s.band === now.band) return null;
  return (
    <p className="px-1 text-[14px] leading-snug text-muted">
      {t(
        `Сега датчиците наоколо мерят ${nf(s.pm25)} µg/m³, а прогнозата дава ${nf(now.pm25)}. Гледайте прогнозата за това кога ще е по-чисто или по-мръсно, а датчиците за това какво е сега.`,
        `Right now the sensors nearby measure ${nf(s.pm25)} µg/m³ and the forecast says ${nf(now.pm25)}. Use the forecast for when it gets cleaner or dirtier, and the sensors for what it is now.`,
      )}
    </p>
  );
}

/** 48 hours of bars. Scrolls sideways on a phone; each new day is labelled. Numbers are in the labels for screen readers. */
function Ribbon({ hours }: { hours: Hour[] }) {
  const { t, nf, weekday } = useI18n();
  const max = Math.max(30, ...hours.map((h) => h.pm25));
  return (
    <div className="min-w-0 rounded-[20px] bg-card py-3">
      <p className="px-4 text-[14px] font-medium text-muted">{t("Фини прахови частици по часове, µg/m³", "Fine particles hour by hour, µg/m³")}</p>
      <ol className="hours no-scrollbar mt-2 flex gap-1 overflow-x-auto px-4 pb-1" aria-label={t("Следващите 48 часа", "The next 48 hours")}>
        {hours.map((h, i) => {
          const b = bandByKey(h.band);
          const hr = Number(h.time.slice(11, 13));
          const newDay = i > 0 && hr === 0;
          return (
            <li key={h.time} className={`relative flex w-9 shrink-0 flex-col items-center gap-1 ${newDay ? "ml-2 border-l border-line pl-2" : ""}`}>
              <span className="h-4 text-[11px] font-semibold capitalize text-muted">{newDay ? weekday(h.time.slice(0, 10)) : ""}</span>
              <span className="text-[11px] tabular-nums text-muted" aria-hidden>
                {nf(h.pm25)}
              </span>
              <span className="flex h-20 w-full items-end" aria-hidden>
                <span className="rise w-full rounded-t-[6px] rounded-b-[3px]" style={{ height: `${Math.max(8, (h.pm25 / max) * 100)}%`, background: b.color, transitionDelay: `${Math.min(i, 24) * 12}ms` }} />
              </span>
              <span className={`text-[12px] tabular-nums ${i === 0 ? "font-bold" : "font-medium"}`}>{i === 0 ? t("Сега", "Now") : hhmm(h.time)}</span>
              <span className="sr-only">
                {t(`${hhmm(h.time)}: ${nf(h.pm25)} микрограма, ${bandText(b, "bg").label}`, `${hhmm(h.time)}: ${nf(h.pm25)} micrograms, ${bandText(b, "en").label}`)}
              </span>
            </li>
          );
        })}
      </ol>
      <p className="px-4 pt-1 text-[12px] text-muted">{t("Прогноза CAMS (Copernicus).", "CAMS forecast (Copernicus).")}</p>
    </div>
  );
}

/** Today, tomorrow and the day after, as a grouped list: the worst daytime band of each. */
function Days({ days }: { days: PlaceResponse["days"] }) {
  const { t, weekday } = useI18n();
  return (
    <ul className="divide-y divide-line overflow-hidden rounded-[20px] bg-card" aria-label={t("Най-лошото през деня, по дни", "Worst in daytime, by day")}>
      {days.map((d, i) => (
        <li key={d.date} className="flex min-h-12 items-center justify-between gap-3 px-4 py-2.5">
          <span className="text-[16px] font-medium capitalize">{i === 0 ? t("Днес", "Today") : i === 1 ? t("Утре", "Tomorrow") : weekday(d.date, "long")}</span>
          <span className="flex items-center gap-2">
            <span className="text-[13px] text-muted">{t("най-лошото", "worst")}</span>
            <BandChip band={d.band} size="sm" />
          </span>
        </li>
      ))}
    </ul>
  );
}
