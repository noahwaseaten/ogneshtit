"use client";

import { useMemo, useSyncExternalStore } from "react";
import { Check, Clock, Flame, RotateCw, Satellite } from "lucide-react";
import { useJson, useNow } from "@/lib/client";
import { SAT_NAMES, type Fire, type FiresResponse } from "@/lib/fire-types";
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

// One shared copy of the predicted passes for every small hint on the page, so ten fire rows make one request.
const PASSES_KEY = "ogneshtit:cache:/api/passes";
let shared: PassesResponse | null = null;
let sharedAt = 0;
let inflight = false;
const subs = new Set<() => void>();

function loadShared() {
  if (inflight || (shared && Date.now() - sharedAt < 30 * 60e3)) return;
  inflight = true;
  fetch("/api/passes")
    .then((r) => (r.ok ? (r.json() as Promise<PassesResponse>) : Promise.reject(new Error(String(r.status)))))
    .then((d) => {
      shared = d;
      sharedAt = Date.now();
      try {
        localStorage.setItem(PASSES_KEY, JSON.stringify(d));
      } catch {}
    })
    .catch(() => {
      if (shared) return;
      try {
        shared = JSON.parse(localStorage.getItem(PASSES_KEY) ?? "null");
      } catch {}
    })
    .finally(() => {
      inflight = false;
      subs.forEach((f) => f());
    });
}

const subscribe = (cb: () => void) => {
  subs.add(cb);
  loadShared();
  return () => void subs.delete(cb);
};

/** The last and next satellite look at Bulgaria. Quiet when the prediction is not available: hints just do not show. */
export function usePassInfo() {
  const data = useSyncExternalStore(subscribe, () => shared, () => null);
  const now = useNow();
  return useMemo(() => {
    const looks = looksOf(data?.passes ?? []);
    return {
      now,
      next: looks.find((l) => l.t > now) ?? null,
      last: [...looks].reverse().find((l) => l.t <= now) ?? null,
      ready: !!data && now > 0,
    };
  }, [data, now]);
}
export type PassInfo = ReturnType<typeof usePassInfo>;

const clockOf = (time: ReturnType<typeof useI18n>["time"], ms: number) => time(new Date(ms).toISOString(), { hour: "2-digit", minute: "2-digit" });

/**
 * Fire details: when a satellite looks at this fire next, with the wait drawn between the last sighting and
 * that look. Only for fires that can still change (not permanent heat, not already missed).
 */
export function NextCheck({ f, info }: { f: Fire; info: PassInfo }) {
  const { t, time } = useI18n();
  const dur = useDuration();
  const { next, now, ready } = info;
  if (!ready || !next) return null;
  const seen = Date.parse(f.last);
  const done = Math.min(1, Math.max(0, (now - seen) / Math.max(1, next.t - seen)));
  const sure = f.status === "confirmed";
  return (
    <div className="mt-3 rounded-2xl bg-surface p-4">
      <div className="flex items-center gap-2.5">
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-tonal text-accent">
          <Satellite size={18} strokeWidth={1.75} aria-hidden />
        </span>
        <p className="text-[15px] font-semibold leading-tight">{t("Следваща проверка от спътник", "Next satellite check")}</p>
      </div>
      <p className="flex items-baseline justify-between gap-3 pt-3 tabular-nums">
        <span className="font-display text-[24px] font-semibold leading-none">{t(`след ${dur(next.t - now)}`, `in ${dur(next.t - now)}`)}</span>
        <span className="text-[15px] font-medium text-muted">{clockOf(time, next.t)}</span>
      </p>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line" role="presentation">
        <div className="fill h-full origin-left rounded-full bg-accent" style={{ "--p": done } as React.CSSProperties} />
      </div>
      <p className="flex justify-between gap-3 pt-1.5 text-[13px] tabular-nums text-muted">
        <span>{t(`Видян преди ${dur(now - seen)}`, `Seen ${dur(now - seen)} ago`)}</span>
        <span className="truncate">{names(next)}</span>
      </p>
      <p className="pt-3 text-[14px] leading-[1.45]">
        {sure
          ? t("Тази проверка показва дали още гори.", "This check shows whether it is still burning.")
          : t("Ако още гори, ще се види пак и ще стане потвърден. Ако не се види, вероятно е угаснал.", "If it is still burning it will show up again and be confirmed. If not, it has probably gone out.")}{" "}
        {!next.sharp && t("Спътникът гледа под ъгъл, затова малък огън може да се изпусне.", "The satellite looks at an angle, so a small fire can be missed.")}
      </p>
      <p className="pt-1 text-[13px] leading-[1.4] text-muted">{t(`Данните стигат до приложението до ${dur(DATA_DELAY_MIN * 60e3)} след преминаването.`, `The data reaches the app up to ${dur(DATA_DELAY_MIN * 60e3)} after the pass.`)}</p>
    </div>
  );
}

/** One short line for a list row: "проверка в 01:53". */
export function CheckHint({ info }: { info: PassInfo }) {
  const { t, time } = useI18n();
  if (!info.ready || !info.next) return null;
  return (
    <span className="inline-flex items-center gap-1 whitespace-nowrap">
      <Satellite size={13} strokeWidth={1.75} aria-hidden />
      {t(`проверка в ${clockOf(time, info.next.t)}`, `check at ${clockOf(time, info.next.t)}`)}
    </span>
  );
}

/** Under a map: when satellites last looked and when they look next. */
export function PassCaption({ info }: { info: PassInfo }) {
  const { t, time } = useI18n();
  const dur = useDuration();
  const { next, last, now, ready } = info;
  if (!ready || !next) return null;
  return (
    <p className="flex items-start gap-2 px-1 pt-3 text-[14px] leading-[1.4] text-muted">
      <Satellite size={16} strokeWidth={1.75} className="mt-0.5 shrink-0" aria-hidden />
      <span className="tabular-nums">
        {last && t(`Последният спътник мина преди ${dur(now - last.t)}. `, `The last satellite passed ${dur(now - last.t)} ago. `)}
        {t(`Следващият: след ${dur(next.t - now)}, в ${clockOf(time, next.t)}.`, `The next one: in ${dur(next.t - now)}, at ${clockOf(time, next.t)}.`)}
      </span>
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
