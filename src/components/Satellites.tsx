"use client";

import { useMemo } from "react";
import { Check, Clock, Flame, RotateCw, Satellite } from "lucide-react";
import { useJson, useNow } from "@/lib/client";
import { SAT_NAMES, type FiresResponse } from "@/lib/fire-types";
import { DATA_DELAY_MIN, longestGap, looksOf, stateOf, type Look, type LookState, type PassesResponse } from "@/lib/pass-types";
import { useI18n } from "@/i18n/client";

const HOUR = 3600e3;
/** The strip shows this much of the past and of the future. */
const BACK = 3 * HOUR;
const AHEAD = 24 * HOUR;

/** "35 мин" / "2 ч 10 мин" */
export function useDuration() {
  const { t } = useI18n();
  return (ms: number) => {
    const m = Math.max(1, Math.round(ms / 60e3));
    const h = Math.floor(m / 60);
    const r = m % 60;
    if (h === 0) return t(`${m} мин`, `${m} min`);
    return r === 0 ? t(`${h} ч`, `${h} h`) : t(`${h} ч ${r} мин`, `${h} h ${r} min`);
  };
}

/** Predicted satellite looks at Bulgaria, joined with what the fire feed found. */
export function useLooks() {
  const orbit = useJson<PassesResponse>("/api/passes");
  const fires = useJson<FiresResponse>("/api/fires");
  const now = useNow();
  const looks = useMemo(() => looksOf(orbit.data?.passes ?? []), [orbit.data]);
  const seen = fires.data?.seen;
  return useMemo(() => {
    const upcoming = looks.filter((l) => l.t > now);
    const past = looks.filter((l) => l.t <= now);
    return {
      now,
      looks,
      next: upcoming[0] ?? null,
      upcoming,
      past,
      // Without the fire feed we cannot say what a past look found, only that it happened.
      stateOf: (l: Look): LookState => stateOf(l, seen ?? [], now),
      haveFires: !!seen,
      loading: orbit.loading,
      error: orbit.error,
      retry: orbit.retry,
      ready: !!orbit.data && now > 0,
      stale: !!orbit.data && orbit.data.dropped.length > 0,
      dropped: orbit.data?.dropped ?? [],
    };
  }, [looks, seen, now, orbit.data, orbit.loading, orbit.error, orbit.retry]);
}

const names = (l: Look) => [...new Set(l.passes.map((p) => SAT_NAMES[p.sat]))].join(", ");

/** "Следващото преминаване над България е след 2 ч 10 мин, в 14:12." for a fire's details. */
export function NextLook() {
  const { t, time } = useI18n();
  const dur = useDuration();
  const { next, now, ready } = useLooks();
  if (!ready || !next) return null;
  const at = time(new Date(next.t).toISOString(), { hour: "2-digit", minute: "2-digit" });
  return (
    <p className="pt-2 text-[15px] leading-snug">
      {t(`Следващият спътник минава над България след ${dur(next.t - now)}, в ${at}.`, `The next satellite passes over Bulgaria in ${dur(next.t - now)}, at ${at}.`)}
    </p>
  );
}

export function Satellites() {
  const { t, time } = useI18n();
  const dur = useDuration();
  const { now, looks, next, upcoming, past, stateOf: state, haveFires, ready, loading, error, retry, dropped } = useLooks();
  const clock = (ms: number) => time(new Date(ms).toISOString(), { hour: "2-digit", minute: "2-digit" });

  const lastPast = past[past.length - 1];
  const rows = [...(lastPast ? [lastPast] : []), ...upcoming.slice(0, 4)];
  const start = now - BACK;
  const end = now + AHEAD;
  const pos = (ms: number) => `${(Math.min(Math.max((ms - start) / (end - start), 0), 1) * 100).toFixed(2)}%`;

  // The pause that matters: the longest wait between two sharp looks ahead. The wait until the next one is in the headline.
  const gap = useMemo(() => {
    if (!ready) return null;
    const ahead = looks.filter((l) => l.sharp && l.t > now && l.t <= end);
    if (ahead.length < 2) return null;
    const g = longestGap(looks, ahead[0].t, ahead[ahead.length - 1].t);
    return g.ms >= 3 * HOUR ? g : null;
  }, [ready, looks, now, end]);

  // Labels under the strip at every 6th hour of Sofia time.
  const ticks = useMemo(() => {
    if (!ready) return [];
    const out: { at: number; label: string }[] = [];
    for (let at = Math.ceil(start / HOUR) * HOUR; at <= end; at += HOUR) {
      const h = Number(time(new Date(at).toISOString(), { hour: "numeric", hourCycle: "h23" }));
      if (h % 6 === 0) out.push({ at, label: `${String(h).padStart(2, "0")}:00` });
    }
    return out;
  }, [ready, start, end, time]);

  return (
    <section aria-labelledby="sat-title" className="enter">
      <h2 id="sat-title" className="px-1 font-display text-[20px] font-semibold">
        {t("Кога минават спътниците", "When satellites pass")}
      </h2>
      {!ready ? (
        loading ? (
          <div className="skeleton mt-3 h-[300px] rounded-[20px]" aria-label={t("Зареждаме часовете на преминаване", "Loading pass times")} />
        ) : (
          <div className="mt-1 px-1">
            <p className="text-[15px] leading-[1.4] text-muted">{error ?? t("Не успяхме да пресметнем кога минават спътниците.", "We couldn't work out when the satellites pass.")}</p>
            <button
              onClick={retry}
              className="pressable mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content"
            >
              <RotateCw size={18} strokeWidth={2} aria-hidden />
              {t("Опитай пак", "Try again")}
            </button>
          </div>
        )
      ) : (
        <p className="px-1 text-[16px] leading-[1.4]">
          {next ? (
            <>
              {t("Следващият спътник минава над България", "The next satellite passes over Bulgaria")}{" "}
              <span className="font-semibold tabular-nums">{t(`след ${dur(next.t - now)}`, `in ${dur(next.t - now)}`)}</span>
              {t(`, в ${clock(next.t)}. `, `, at ${clock(next.t)}. `)}
              {t(`Пожарите от него се появяват на картата до ${dur(DATA_DELAY_MIN * 60e3)} по-късно.`, `Fires it sees show up on the map up to ${dur(DATA_DELAY_MIN * 60e3)} later.`)}
            </>
          ) : (
            t("През следващите 24 часа няма преминаване, което да покажем.", "There is no pass to show in the next 24 hours.")
          )}
        </p>
      )}

      {ready && (
        <div className="mt-3 overflow-hidden rounded-[20px] bg-card">
          <div className="px-4 pt-5 pb-3">
            <div className="relative h-6" aria-hidden>
              <div className="absolute inset-x-0 top-1/2 h-1.5 -translate-y-1/2 rounded-full bg-surface" />
              {gap && (
                <div
                  className="absolute top-1/2 h-1.5 -translate-y-1/2 rounded-full"
                  style={{ left: pos(Math.max(gap.from, start)), right: `calc(100% - ${pos(gap.to)})`, background: "color-mix(in oklab, var(--ember) 35%, transparent)" }}
                />
              )}
              {looks
                .filter((l) => l.t >= start && l.t <= end)
                .map((l) => {
                  const s = state(l);
                  const solid = l.sharp;
                  const color = s === "fires" ? "var(--ember)" : s === "upcoming" ? "var(--accent)" : "var(--muted)";
                  return (
                    <span
                      key={l.t}
                      className="absolute top-1/2 size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full"
                      style={{ left: pos(l.t), background: solid ? color : "var(--card)", boxShadow: `inset 0 0 0 1.5px ${color}`, opacity: s === "quiet" || s === "waiting" ? 0.7 : 1 }}
                    />
                  );
                })}
              <span className="absolute inset-y-0 w-0.5 -translate-x-1/2 rounded-full bg-content" style={{ left: pos(now) }} />
              <span className="absolute -top-4 -translate-x-1/2 text-[12px] font-medium text-content" style={{ left: pos(now) }}>
                {t("сега", "now")}
              </span>
            </div>
            <div className="relative mt-1.5 h-4 text-[12px] tabular-nums text-muted" aria-hidden>
              {ticks.map((k) => (
                <span key={k.at} className="absolute -translate-x-1/2" style={{ left: pos(k.at) }}>
                  {k.label}
                </span>
              ))}
            </div>
            <p className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-[13px] text-muted">
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-accent" aria-hidden />
                {t("отвесно, ясно", "overhead, sharp")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-card" style={{ boxShadow: "inset 0 0 0 1.5px var(--accent)" }} aria-hidden />
                {t("под ъгъл", "at an angle")}
              </span>
              <span className="inline-flex items-center gap-1.5">
                <span className="size-2.5 rounded-full bg-muted opacity-70" aria-hidden />
                {t("минало", "passed")}
              </span>
              {gap && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="h-1.5 w-4 rounded-full" style={{ background: "color-mix(in oklab, var(--ember) 35%, transparent)" }} aria-hidden />
                  {t("най-дълга пауза", "longest gap")}
                </span>
              )}
            </p>
          </div>
          <ul className="divide-y divide-line border-t border-line">
            {rows.map((l) => {
              const s = state(l);
              const Icon = s === "fires" ? Flame : s === "quiet" ? Check : s === "waiting" ? Clock : Satellite;
              const detail =
                s === "upcoming"
                  ? l.sharp
                    ? t("Гледа отгоре: ясна картина.", "Looks from above: a sharp picture.")
                    : t("Гледа под ъгъл: малък огън може да се изпусне.", "Looks at an angle: a small fire can be missed.")
                  : s === "waiting"
                    ? t("Мина. Данните още пристигат.", "Passed. The data is still arriving.")
                    : !haveFires
                      ? t("Мина.", "Passed.")
                      : s === "fires"
                        ? t("Данните са тук. Видя топлина в района.", "The data is in. It saw heat in the area.")
                        : t("Данните са тук. Не видя огън в района.", "The data is in. It saw no fire in the area.");
              return (
                <li key={l.t} className="flex min-h-14 items-center gap-3 px-4 py-2.5">
                  <span className="grid size-10 shrink-0 place-items-center rounded-full bg-surface" style={{ color: s === "fires" ? "var(--ember)" : undefined }}>
                    <Icon size={20} strokeWidth={1.75} aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[16px] font-medium tabular-nums">
                      {clock(l.t)} <span className="text-muted">·</span> {names(l)}
                    </span>
                    <span className="block text-[13px] leading-[1.4] text-muted">{detail}</span>
                  </span>
                  <span className="shrink-0 whitespace-nowrap text-[14px] tabular-nums text-muted">
                    {l.t > now ? t(`след ${dur(l.t - now)}`, `in ${dur(l.t - now)}`) : t(`преди ${dur(now - l.t)}`, `${dur(now - l.t)} ago`)}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {ready && (
        <p className="px-1 pt-3 text-[14px] leading-[1.45] text-muted">
          {gap
            ? t(
                `Най-дългата пауза между две ясни преминавания е ${dur(gap.ms)}, от ${clock(gap.from)} до ${clock(gap.to)}. Малък огън, пламнал по това време, може да не се види преди ${clock(gap.to)}.`,
                `The longest wait between two sharp looks is ${dur(gap.ms)}, from ${clock(gap.from)} to ${clock(gap.to)}. A small fire that starts in between may not be seen before ${clock(gap.to)}.`,
              )
            : t("Огън, пламнал между две преминавания, се вижда чак при следващото.", "A fire that starts between two passes only shows at the next one.")}{" "}
          {t("Пресметнато от публикуваните орбити на 5 спътника на НАСА (CelesTrak).", "Worked out from the published orbits of 5 NASA satellites (CelesTrak).")}
          {dropped.length > 0 &&
            " " +
              t(
                `Без ${dropped.map((s) => SAT_NAMES[s]).join(", ")}: данните за орбитата му са твърде стари.`,
                `Without ${dropped.map((s) => SAT_NAMES[s]).join(", ")}: its orbit data is too old.`,
              )}
        </p>
      )}
    </section>
  );
}
