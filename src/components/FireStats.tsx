"use client";

import { useMemo, useState, useSyncExternalStore } from "react";
import { RotateCw, ExternalLink } from "lucide-react";
import { OBLASTS } from "@/data/oblasts";
import { useJson, useMedia } from "@/lib/client";
import { useI18n } from "@/i18n/client";
import { iagLabel, placeName } from "@/i18n/names";
import { formatters } from "@/i18n/format";
import type { Lang } from "@/i18n/lang";
import type { FireHistory, FireStats as Stats, Share } from "@/lib/iag";
import { BulgariaMap } from "./BulgariaMap";
import { Sheet } from "./Sheet";

// Burnt area classes in decares (1 дка = 1000 m²). Fixed, so years can be compared by colour.
const BINS = [
  { max: 0, color: "var(--land)", label: ["Без пожари", "No fires"] },
  { max: 100, color: "#f6d2bd", label: ["до 100 дка", "up to 10 ha"] },
  { max: 500, color: "#efa37c", label: ["100 до 500", "10 to 50"] },
  { max: 2000, color: "#e3741b", label: ["500 до 2 000", "50 to 200"] },
  { max: 5000, color: "#c7361f", label: ["2 000 до 5 000", "200 to 500"] },
  { max: Infinity, color: "#7d1810", label: ["над 5 000", "over 500"] },
] as const;
const binFor = (dka: number) => BINS.find((b) => dka <= b.max) ?? BINS[BINS.length - 1];

const CAUSE_NOTE: Record<Lang, Record<string, string>> = {
  bg: {
    Небрежност: "Палене на стърнища и сухи треви, непогасен огън, фас",
    Умишлени: "Палежи",
    Естествени: "Най-често мълния",
    Неизвестни: "Причината не е установена",
  },
  en: {
    Небрежност: "Burning stubble and dry grass, fires left burning, cigarette ends",
    Умишлени: "Started on purpose",
    Естествени: "Mostly lightning",
    Неизвестни: "Cause not found",
  },
};

const thisYear = () => Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", year: "numeric" }).format(new Date()));
const noop = () => () => {};
/** Words that depend on the language: fire counts, areas (decares in Bulgarian, hectares in English), ordinals. */
function words(lang: Lang) {
  const { nf } = formatters(lang);
  const bg = lang === "bg";
  return {
    fires: (n: number) => (bg ? (n === 1 ? "1 пожар" : `${nf(n)} пожара`) : n === 1 ? "1 fire" : `${nf(n)} fires`),
    /** The main area unit: дка in Bulgarian (how ИАГ publishes it), ha in English. */
    area: (dka: number) => (bg ? `${nf(dka)} дка` : `${nf(dka / 10, dka < 100 ? 1 : 0)} ha`),
    areaNum: (dka: number) => (bg ? nf(dka) : nf(dka / 10, dka < 100 ? 1 : 0)),
    areaUnit: bg ? "дка" : "ha",
    ha: (dka: number) => `${nf(dka / 10)} ${bg ? "ха" : "ha"}`,
    /** 1-во, 2-ро, 7-мо / 1st, 2nd, 3rd, 11th */
    ordinal: (n: number) => {
      const t = n % 100;
      const u = n % 10;
      if (!bg) return `${n}${t >= 11 && t <= 13 ? "th" : u === 1 ? "st" : u === 2 ? "nd" : u === 3 ? "rd" : "th"}`;
      return `${n}-${t >= 11 && t <= 19 ? "то" : u === 1 ? "во" : u === 2 ? "ро" : u === 7 || u === 8 ? "мо" : "то"}`;
    },
  };
}

export function FireStats() {
  // The current year is read on the device, so a page prerendered last year never shows stale choices.
  const now = useSyncExternalStore(noop, thisYear, () => 0);
  const [picked, setYear] = useState<number | null>(null);
  const year = picked ?? now;
  const [region, setRegion] = useState<string | null>(null);
  const wide = useMedia("(min-width: 1024px)");
  const { t, tp, lang, nf, time } = useI18n();
  const w = words(lang);
  const stats = useJson<Stats>(year ? `/api/fire-stats?year=${year}` : null);
  const history = useJson<FireHistory>("/api/fire-history");
  const years = useMemo(() => (now ? Array.from({ length: now - 2007 + 1 }, (_, i) => now - i) : []), [now]);

  const s = stats.data;
  const byName = useMemo(() => new Map((s?.regions ?? []).map((r) => [r.name, r])), [s]);
  const ranked = useMemo(() => [...(s?.regions ?? [])].sort((a, b) => b.dka - a.dka), [s]);
  const nameOf = (code: string) => OBLASTS.find((o) => o.code === code)?.name ?? "";
  const selectedCode = region ? OBLASTS.find((o) => o.name === region)?.code ?? null : null;
  const partial = s && s.to !== `${s.year}-12-31`;

  return (
    <div className="flex flex-col gap-8">
      <header className="flex flex-col gap-2 px-1 pt-2">
        <h1 className="font-display text-[32px] font-bold leading-tight tracking-[-0.01em] lg:text-[40px]">
          {t("Горски пожари по области", "Forest fires by oblast")}
        </h1>
        <p className="max-w-[60ch] text-[16px] leading-snug text-muted">
          {t(
            "Официалните данни на Изпълнителната агенция по горите за пожарите в горските територии. Изберете година и докоснете област, за да видите подробности.",
            "Official figures from Bulgaria's Executive Forest Agency for fires on forest land. Pick a year and tap an oblast for details.",
          )}
        </p>
      </header>

      {/* Year picker: a scrolling row of chips, newest first. */}
      <div role="radiogroup" aria-label={t("Година", "Year")} className="no-scrollbar -mx-4 flex gap-2 overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
        {years.map((y) => (
          <button
            key={y}
            role="radio"
            aria-checked={y === year}
            onClick={() => {
              setYear(y);
              setRegion(null);
            }}
            className={`pressable hover-fill min-h-11 shrink-0 rounded-full px-4 text-[15px] font-semibold tabular-nums ${
              y === year ? "bg-tonal text-content" : "bg-card text-content"
            }`}
          >
            {y}
          </button>
        ))}
      </div>

      {!s && (stats.loading || !year) && <div className="skeleton h-[520px] rounded-[20px]" aria-label={t("Зареждаме данните", "Loading the data")} />}
      {!s && year > 0 && !stats.loading && (
        <div className="rounded-[20px] bg-card p-5">
          <p className="text-[15px]">{stats.error}</p>
          <button
            onClick={stats.retry}
            className="pressable mt-3 inline-flex min-h-11 items-center gap-2 rounded-full bg-accent px-4 text-[15px] font-semibold text-accent-content"
          >
            <RotateCw size={18} strokeWidth={2} aria-hidden />
            {t("Опитай пак", "Try again")}
          </button>
        </div>
      )}

      {s && (
        <>
          <section aria-label={t("Обобщение", "Summary")} className="enter">
            {lang === "bg" ? (
              <p className="px-1 text-[18px] leading-snug lg:text-[20px]">
                {partial ? (
                  <>
                    От началото на {s.year} г. до {time(`${s.to}T12:00:00Z`, { day: "numeric", month: "long" })}{" "}
                  </>
                ) : (
                  <>През {s.year} г. </>
                )}
                в горите на България е имало <strong className="font-semibold">{w.fires(s.total.fires)}</strong>. Изгоряли са{" "}
                <strong className="font-semibold">{w.area(s.total.dka)}</strong> ({w.ha(s.total.dka)}).
              </p>
            ) : (
              <p className="px-1 text-[18px] leading-snug lg:text-[20px]">
                {partial ? <>From the start of {s.year} to {time(`${s.to}T12:00:00Z`, { day: "numeric", month: "long" })}, </> : <>In {s.year}, </>}
                Bulgaria&apos;s forests had <strong className="font-semibold">{w.fires(s.total.fires)}</strong>, and{" "}
                <strong className="font-semibold">{w.area(s.total.dka)}</strong> burnt.
              </p>
            )}
            {s.total.crownDka > 0 && (
              <p className="px-1 pt-2 text-[16px] leading-snug text-muted">
                {t(
                  `От тях ${nf(s.total.crownDka)} дка са изгорели при върхов пожар, когато огънят минава по короните и унищожава гората.`,
                  `Of that, ${w.area(s.total.crownDka)} burnt in crown fires, where the fire runs through the treetops and destroys the forest.`,
                )}
              </p>
            )}
          </section>

          <div className="grid gap-8 lg:grid-cols-[minmax(0,7fr)_minmax(0,5fr)] lg:items-start lg:gap-10">
            <section aria-labelledby="map-title" className="enter min-w-0">
              <h2 id="map-title" className="px-1 font-display text-[20px] font-semibold">
                {t("Изгоряла площ по области", "Area burnt by oblast")}
              </h2>
              <div className="mt-3 overflow-hidden rounded-[20px] bg-card">
                <div className="p-2 pt-3 lg:p-4">
                  <BulgariaMap
                    ariaLabel={t(`Карта на областите, оцветени по изгоряла площ през ${s.year} г.`, `Map of the oblasts coloured by area burnt in ${s.year}`)}
                    fill={(code) => binFor(byName.get(nameOf(code))?.dka ?? 0).color}
                    regionName={(code) => {
                      const r = byName.get(nameOf(code));
                      return `${placeName(nameOf(code), lang)}: ${r ? `${w.fires(r.fires)}, ${w.area(r.dka)}` : t("без пожари", "no fires")}`;
                    }}
                    selected={selectedCode}
                    onRegion={(code) => setRegion(nameOf(code))}
                    cities={false}
                  />
                </div>
                <ul className="flex flex-wrap gap-x-4 gap-y-1.5 border-t border-line px-4 py-3 text-[13px] text-muted" aria-label={t("Легенда, изгоряла площ", "Legend, area burnt")}>
                  {BINS.map((b) => (
                    <li key={b.color} className="inline-flex items-center gap-1.5 tabular-nums">
                      <span className="size-3 rounded-[4px] shadow-[inset_0_0_0_1px_var(--land-line)]" style={{ background: b.color }} aria-hidden />
                      {tp(b.label)}
                    </li>
                  ))}
                </ul>
              </div>
            </section>

            {/* On wide screens the details sit next to the map instead of in a sheet. */}
            <div className="flex min-w-0 flex-col gap-8 lg:sticky lg:top-8">
              {wide && (
                <section aria-live="polite" className="rounded-[20px] bg-card p-5">
                  {region ? (
                    <RegionDetail name={region} stats={s} history={history.data} />
                  ) : (
                    <p className="text-[15px] leading-snug text-muted">
                      {t("Изберете област на картата или в списъка, за да видите подробности.", "Choose an oblast on the map or in the list to see details.")}
                    </p>
                  )}
                </section>
              )}
              <Ranking ranked={ranked} total={s.total.dka} onPick={setRegion} selected={region} />
            </div>
          </div>

          <div className="grid gap-8 lg:grid-cols-3 lg:gap-6">
            <Bars title={t("Защо горят", "Why they burn")} unit={t("пожара", "fires")} data={s.causes} notes={CAUSE_NOTE[lang]} />
            <Bars title={t("Какво изгоря", "What burnt")} area data={s.vegetation} />
            <Bars title={t("Чии са горите", "Who owns the land")} area data={s.ownership} />
          </div>

          <History data={history.data} loading={history.loading} year={year} onYear={(y) => (setYear(y), setRegion(null))} />

          <p className="px-1 text-[13px] leading-snug text-muted">
            {t("Източник:", "Source:")}{" "}
            <a href="https://www.iag.bg/fires/lang/1/index" target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 underline underline-offset-2">
              {t("ИАГ, Горски пожари по области", "Executive Forest Agency, forest fires by oblast")}
              <ExternalLink size={12} strokeWidth={2} aria-hidden />
            </a>
            .{" "}
            {t(
              "Броят се само пожарите в горските територии. Европейската система EFFIS засича от спътник всички изгорели площи над 30 ха, затова нейните числа са по-големи.",
              "Only fires on forest land are counted. The European EFFIS system maps every burnt area over 30 ha from satellites, so its numbers are larger.",
            )}
          </p>

          {!wide && (
            <Sheet
              open={!!region}
              onClose={() => setRegion(null)}
              title={region ? placeName(region, lang) : ""}
              description={t(`Горски пожари през ${s.year} г.`, `Forest fires in ${s.year}`)}
            >
              {region && <RegionDetail name={region} stats={s} history={history.data} bare />}
            </Sheet>
          )}
        </>
      )}
    </div>
  );
}


function RegionDetail({ name, stats, history, bare }: { name: string; stats: Stats; history: FireHistory | null; bare?: boolean }) {
  const r = stats.regions.find((x) => x.name === name);
  const rank = [...stats.regions].sort((a, b) => b.dka - a.dka).findIndex((x) => x.name === name) + 1;
  const series = history?.regions[name];
  const max = series ? Math.max(1, ...series) : 1;
  const { t, lang, nf } = useI18n();
  const w = words(lang);
  return (
    <div>
      {!bare && (
        <>
          <h3 className="font-display text-[22px] font-semibold">{placeName(name, lang)}</h3>
          <p className="text-[15px] text-muted">{t(`Горски пожари през ${stats.year} г.`, `Forest fires in ${stats.year}`)}</p>
        </>
      )}
      {r ? (
        <dl className={`grid grid-cols-2 gap-x-4 gap-y-4 text-[15px] tabular-nums ${bare ? "" : "pt-4"}`}>
          <div>
            <dt className="text-[13px] text-muted">{t("Пожари", "Fires")}</dt>
            <dd className="font-display text-[24px] font-bold">{nf(r.fires)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">{t("Изгоряла площ", "Area burnt")}</dt>
            <dd className="font-display text-[24px] font-bold">
              {w.areaNum(r.dka)} <span className="text-[14px] font-semibold text-muted">{w.areaUnit}</span>
            </dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">{t("По изгоряла площ", "Rank by area burnt")}</dt>
            <dd className="font-medium">{t(`${w.ordinal(rank)} място от 28`, `${w.ordinal(rank)} of 28`)}</dd>
          </div>
          <div>
            <dt className="text-[13px] text-muted">{t("Върхов пожар", "Crown fire")}</dt>
            <dd className="font-medium">{w.area(r.crownDka)}</dd>
          </div>
        </dl>
      ) : (
        <p className={`text-[16px] ${bare ? "" : "pt-4"}`}>{t("Няма регистрирани горски пожари.", "No forest fires were recorded.")}</p>
      )}
      {series && history && (
        <div className="pt-6">
          <p className="text-[13px] font-medium text-muted">{t("Изгоряла площ по години, дка", "Area burnt by year, ha")}</p>
          <div
            className="mt-2 flex h-24 items-end gap-[3px]"
            role="img"
            aria-label={t(`Изгоряла площ в област ${name} по години`, `Area burnt in ${placeName(name, "en")} by year`)}
          >
            {series.map((v, i) => (
              <span
                key={history.years[i].year}
                className="flex-1 rounded-t-[3px]"
                style={{
                  height: `${Math.max(2, (v / max) * 100)}%`,
                  background: history.years[i].year === stats.year ? "var(--ember)" : "var(--line)",
                }}
                title={`${history.years[i].year}: ${w.area(v)}`}
              />
            ))}
          </div>
          <div className="flex justify-between pt-1 text-[12px] tabular-nums text-muted">
            <span>{history.years[0].year}</span>
            <span>{history.years[history.years.length - 1].year}</span>
          </div>
        </div>
      )}
    </div>
  );
}

function Ranking({
  ranked,
  total,
  onPick,
  selected,
}: {
  ranked: Stats["regions"];
  total: number;
  onPick: (n: string) => void;
  selected: string | null;
}) {
  const [all, setAll] = useState(false);
  const { t, lang } = useI18n();
  const w = words(lang);
  const list = all ? ranked : ranked.slice(0, 6);
  const max = Math.max(1, ranked[0]?.dka ?? 1);
  return (
    <section aria-labelledby="rank-title">
      <h2 id="rank-title" className="px-1 font-display text-[20px] font-semibold">
        {t("Най-засегнати области", "Worst-hit oblasts")}
      </h2>
      <ol className="mt-3 divide-y divide-line overflow-hidden rounded-[20px] bg-card">
        {list.map((r, i) => (
          <li key={r.name}>
            <button
              onClick={() => onPick(r.name)}
              aria-pressed={selected === r.name}
              className={`hover-fill flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left ${selected === r.name ? "bg-line/60" : ""}`}
            >
              <span className="w-5 shrink-0 text-[14px] font-semibold tabular-nums text-muted">{i + 1}</span>
              <span className="min-w-0 flex-1">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="truncate text-[16px] font-medium">{placeName(r.name, lang)}</span>
                  <span className="shrink-0 text-[14px] tabular-nums text-muted">{w.area(r.dka)}</span>
                </span>
                <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line" aria-hidden>
                  <span className="block h-full rounded-full" style={{ width: `${(r.dka / max) * 100}%`, background: binFor(r.dka).color }} />
                </span>
                <span className="sr-only">
                  {w.fires(r.fires)}, {total ? Math.round((r.dka / total) * 100) : 0}% {t("от изгорялата площ", "of the area burnt")}
                </span>
              </span>
            </button>
          </li>
        ))}
      </ol>
      {ranked.length > 6 && (
        <button onClick={() => setAll((v) => !v)} aria-expanded={all} className="pressable mt-2 min-h-11 px-1 text-[15px] font-medium text-accent">
          {all ? t("Покажи по-малко", "Show fewer") : t(`Покажи всички ${ranked.length}`, `Show all ${ranked.length}`)}
        </button>
      )}
    </section>
  );
}

function Bars({ title, unit, area, data, notes }: { title: string; unit?: string; area?: boolean; data: Share[]; notes?: Record<string, string> }) {
  const { lang, nf } = useI18n();
  const w = words(lang);
  const total = data.reduce((s, d) => s + d.value, 0);
  if (!total) return null;
  const sorted = [...data].sort((a, b) => b.value - a.value);
  return (
    <section aria-label={title} className="enter">
      <h2 className="px-1 font-display text-[20px] font-semibold">{title}</h2>
      <ul className="mt-3 flex flex-col gap-4 rounded-[20px] bg-card p-4">
        {sorted.map((d) => {
          const pct = Math.round((d.value / total) * 100);
          return (
            <li key={d.label}>
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-[15px] font-medium leading-tight first-letter:uppercase">{iagLabel(d.label, lang)}</span>
                <span className="shrink-0 text-[15px] font-semibold tabular-nums">{pct}%</span>
              </div>
              <div className="mt-1.5 h-2 overflow-hidden rounded-full bg-line" aria-hidden>
                <div className="h-full rounded-full bg-[var(--ember)]" style={{ width: `${pct}%` }} />
              </div>
              <p className="pt-1 text-[13px] leading-snug text-muted tabular-nums">
                {notes?.[d.label] ? `${notes[d.label]} · ` : ""}
                {area ? w.area(d.value) : `${nf(d.value)} ${unit}`}
              </p>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function History({ data, loading, year, onYear }: { data: FireHistory | null; loading: boolean; year: number; onYear: (y: number) => void }) {
  const [metric, setMetric] = useState<"dka" | "fires">("dka");
  const { t, lang } = useI18n();
  const w = words(lang);
  if (!data) return loading ? <div className="skeleton h-[260px] rounded-[20px]" /> : null;
  const max = Math.max(1, ...data.years.map((y) => y[metric]));
  const avg = data.years.filter((y) => !y.partial).reduce((s, y) => s + y[metric], 0) / Math.max(1, data.years.filter((y) => !y.partial).length);
  return (
    <section aria-labelledby="hist-title" className="enter">
      <div className="flex flex-wrap items-end justify-between gap-3 px-1">
        <h2 id="hist-title" className="font-display text-[20px] font-semibold">
          {t("По години", "By year")}
        </h2>
        <div role="radiogroup" aria-label={t("Показател", "Measure")} className="flex rounded-full bg-line p-1 text-[14px] font-medium">
          {(["dka", "fires"] as const).map((m) => (
            <button
              key={m}
              role="radio"
              aria-checked={metric === m}
              onClick={() => setMetric(m)}
              className={`min-h-9 rounded-full px-3.5 transition-colors duration-150 ${metric === m ? "bg-tonal text-content" : "text-muted"}`}
            >
              {m === "dka" ? t("Изгоряла площ", "Area burnt") : t("Брой пожари", "Number of fires")}
            </button>
          ))}
        </div>
      </div>
      <div className="mt-3 rounded-[20px] bg-card p-4 lg:p-5">
        <div className="relative flex h-44 items-end gap-1 lg:h-56 lg:gap-1.5">
          <div
            className="pointer-events-none absolute inset-x-0 border-t border-dashed border-muted/60"
            style={{ bottom: `${(avg / max) * 100}%` }}
            aria-hidden
          />
          {data.years.map((y) => (
            <button
              key={y.year}
              onClick={() => onYear(y.year)}
              aria-label={`${y.year}: ${metric === "dka" ? w.area(y.dka) : w.fires(y.fires)}${y.partial ? t(" до днес", " so far") : ""}. ${t("Покажи годината", "Show this year")}`}
              aria-pressed={y.year === year}
              className="group relative flex h-full flex-1 items-end"
            >
              <span
                className="block w-full rounded-t-[4px] transition-colors duration-150 group-hover:opacity-80"
                style={{
                  height: `${Math.max(1.5, (y[metric] / max) * 100)}%`,
                  background: y.year === year ? "var(--ember)" : "var(--muted)",
                  opacity: y.year === year ? 1 : 0.35,
                }}
              />
            </button>
          ))}
        </div>
        <div className="flex justify-between pt-2 text-[12px] tabular-nums text-muted">
          <span>{data.years[0].year}</span>
          <span>{data.years[data.years.length - 1].year}</span>
        </div>
        <p className="pt-3 text-[13px] leading-snug text-muted">
          {t(
            `Прекъснатата линия е средното за година (${metric === "dka" ? w.area(Math.round(avg)) : w.fires(Math.round(avg))}). Докоснете стълбче, за да отворите годината.`,
            `The dashed line is the yearly average (${metric === "dka" ? w.area(Math.round(avg)) : w.fires(Math.round(avg))}). Tap a bar to open that year.`,
          )}
        </p>
      </div>
    </section>
  );
}
