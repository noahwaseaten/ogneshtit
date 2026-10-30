"use client";

import { useSyncExternalStore } from "react";
import { ArrowUpRight, Download, Moon, Monitor, Phone, Sun } from "lucide-react";
import { useJson, useLocation, useTheme } from "@shtit/core/client";
import { setLanguage, useI18n } from "@shtit/core/i18n/client";
import { localeOf } from "@shtit/core/i18n/lang";
import { BRANDS, REPO, TOOLS, seasonOrder, type AppId } from "@shtit/core/brand";
import { Emblem, EmblemTile } from "@shtit/core/emblem";
import type { AppSummary } from "@shtit/core/summary";
import { LocationPicker } from "@shtit/core/ui/LocationPicker";
import { GithubIcon, Segmented } from "@shtit/core/ui/Settings";
import { familyHref } from "@shtit/core/ui/Shell";

const noop = () => () => {};
const month = () => Number(new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia", month: "numeric" }).format(new Date()));
const fmt = (lang: "bg" | "en") => () => new Intl.DateTimeFormat(localeOf(lang), { weekday: "long", day: "numeric", month: "long", timeZone: "Europe/Sofia" }).format(new Date());

/**
 * The front door of the family: today's answer from each app for one place, the season's app first, and a way into
 * each. It keeps nothing itself; the numbers come from each app's own /api/summary.
 */
export function Hub() {
  const { t, lang } = useI18n();
  const { loc } = useLocation();
  // The season's order is worked out on the device, so a prerendered page never shows last month's order.
  const lead = useSyncExternalStore(noop, () => seasonOrder(month())[0], () => TOOLS[0]);
  const date = useSyncExternalStore(noop, fmt(lang), () => "");
  const order = seasonOrder(lead === "fire" ? 6 : 12);

  return (
    <div className="flex flex-col gap-10">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Emblem app="hub" size={36} />
          <span className="font-display text-[24px] font-bold tracking-[-0.01em]">{BRANDS.hub.name[lang]}</span>
        </div>
        <Prefs />
      </header>

      <section aria-labelledby="hero" className="flex flex-col gap-3">
        <h1 id="hero" className="max-w-[18ch] font-display text-[36px] font-bold leading-[1.08] tracking-[-0.02em] lg:text-[52px]">
          {t("Въздух, вода и огън, днес, за вашето място", "Air, water and fire, today, for your place")}
        </h1>
        <p className="max-w-[56ch] text-[17px] leading-snug text-muted">
          {t(
            "Три безплатни приложения за опасностите в България: въздух, вода и огън. Всяко работи самостоятелно и се инсталира отделно, така че ползвате само това, което ви трябва.",
            "Three free apps for dangers in Bulgaria: air, water and fire. Each one works on its own and installs separately, so you use only the one you need.",
          )}
        </p>
        <div className="flex flex-col gap-0.5 pt-2">
          <p className="min-h-5 px-1 text-[14px] font-medium text-muted first-letter:uppercase">{date}</p>
          <LocationPicker />
        </div>
      </section>

      <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
        {order.map((a) => (
          <AppCard key={a} app={a} lat={loc.lat} lon={loc.lon} />
        ))}
      </div>

      <section aria-labelledby="how" className="grid gap-5 rounded-[24px] bg-card p-5 lg:grid-cols-3 lg:p-7">
        <h2 id="how" className="font-display text-[22px] font-semibold lg:col-span-3">
          {t("Как работи", "How it works")}
        </h2>
        {[
          [
            t("Всяко приложение е отделно", "Each app stands alone"),
            t(
              "ВъздухоЩит, ВодоЩит и ОгнеЩит имат свой адрес, свои известия и работят без интернет. Инсталирайте само това, което ви трябва.",
              "Air Shield, Flood Shield and Fire Shield each have their own address and alerts, and work offline. Install only what you need.",
            ),
          ],
          [
            t("Само отворени източници", "Open sources only"),
            t(
              "Прогнозите са от Copernicus (CAMS и GloFAS), Open-Meteo, NASA FIRMS и НИМХ, измерванията от граждански датчици и държавни агенции. Всяко число има източник.",
              "Forecasts come from Copernicus (CAMS and GloFAS), Open-Meteo, NASA FIRMS and NIMH, measurements from citizen sensors and state agencies. Every number has a source.",
            ),
          ],
          [
            t("Без профил, без следене", "No account, no tracking"),
            t(
              "Мястото ви остава на устройството. Сигналите се изпращат от вашия телефон, не от нас.",
              "Your place stays on your device. Reports go out from your own phone, not from us.",
            ),
          ],
        ].map(([h, p]) => (
          <div key={h} className="flex flex-col gap-1">
            <h3 className="text-[16px] font-semibold">{h}</h3>
            <p className="text-[15px] leading-snug text-muted">{p}</p>
          </div>
        ))}
      </section>

      <footer className="flex flex-col gap-6 border-t border-line pt-8">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-center gap-3">
            <Emblem app="hub" size={32} />
            <div>
              <p className="font-display text-[18px] font-bold leading-tight">{BRANDS.hub.name[lang]}</p>
              <p className="text-[14px] text-muted">{t("Въздух, вода и огън за България", "Air, water and fire for Bulgaria")}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <a href={REPO} target="_blank" rel="noreferrer" className="pressable hover-fill inline-flex min-h-11 items-center gap-2 rounded-full border border-line px-4 text-[15px] font-semibold">
              <span className="size-[18px] [&_svg]:size-full">
                <GithubIcon />
              </span>
              {t("Код в GitHub", "Code on GitHub")}
            </a>
            <a href="tel:112" className="pressable inline-flex min-h-11 items-center gap-2 rounded-full bg-[#c7361f] px-4 text-[15px] font-semibold text-white">
              <Phone size={17} strokeWidth={2.25} aria-hidden />
              {t("Спешно: 112", "Emergency: 112")}
            </a>
          </div>
        </div>
        <ul className="flex flex-wrap gap-x-5 gap-y-1 text-[14px] font-medium">
          {TOOLS.map((a) => (
            <li key={a}>
              <a href={familyHref(a, lang)} className="inline-flex min-h-11 items-center gap-2 hover:text-accent">
                <EmblemTile app={a} size={22} inset={0.1} radius={6} />
                {BRANDS[a].name[lang]}
              </a>
            </li>
          ))}
        </ul>
        <p className="max-w-[70ch] text-[13px] leading-snug text-muted">
          {t(
            "Щит не е официален източник и не заменя предупрежденията на властите. Безплатно и с отворен код. Направено от ",
            "Shield is not an official source and does not replace warnings from the authorities. Free and open source. Made by ",
          )}
          <a href="https://noahwaseaten.com/" target="_blank" rel="noreferrer" className="font-medium text-content underline underline-offset-2">
            {t("Камен", "Noah")}
          </a>
          .
        </p>
      </footer>
    </div>
  );
}

/**
 * One app: its tile, what it is for, today's answer for the place, and the way in. The card spans three rows of the
 * parent grid (subgrid), so headers, answers and buttons line up across cards whatever the length of the text.
 */
function AppCard({ app, lat, lon }: { app: AppId; lat: number; lon: number }) {
  const { t, lang, agoLong } = useI18n();
  const b = BRANDS[app];
  const s = useJson<AppSummary>(`${b.url}/api/summary?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&l=${lang}`);
  const lv = s.data?.level;
  return (
    <article aria-labelledby={`app-${app}`} className="enter row-span-3 grid grid-rows-subgrid gap-y-4 overflow-hidden rounded-[24px] bg-card">
      <div className="flex items-start gap-4 px-5 pt-5 lg:px-6 lg:pt-6">
        <EmblemTile app={app} size={60} inset={0.1} radius={16} />
        <div className="min-w-0 flex-1">
          <h2 id={`app-${app}`} className="truncate font-display text-[24px] font-bold leading-tight">
            {b.name[lang]}
          </h2>
          <p className="pt-0.5 text-[15px] leading-snug text-muted">
            {b.tagline[lang][0]}: {b.tagline[lang][1].toLowerCase()}
          </p>
        </div>
      </div>

      <div className="mx-5 flex flex-col rounded-[20px] p-4 lg:mx-6" style={lv ? { background: lv.hex, color: lv.onColor } : { background: "var(--surface)" }} aria-live="polite">
        {s.data ? (
          <>
            {lv && (
              <div className="flex gap-1 pb-3" role="img" aria-label={t(`Ниво ${lv.index + 1} от ${lv.of}`, `Level ${lv.index + 1} of ${lv.of}`)}>
                {Array.from({ length: lv.of }, (_, i) => (
                  <span key={i} className="h-1.5 flex-1 rounded-full" style={{ background: "currentColor", opacity: i === lv.index ? 1 : i < lv.index ? 0.45 : 0.18 }} />
                ))}
              </div>
            )}
            <p className="font-display text-[22px] font-bold leading-tight">{s.data.headline}</p>
            <p className="pt-1 text-[14px] leading-snug opacity-90">{s.data.detail}</p>
            <p className="mt-auto pt-2 text-[12px] opacity-80">{t(`Обновено ${agoLong(s.data.updated)}`, `Updated ${agoLong(s.data.updated)}`)}</p>
          </>
        ) : s.loading ? (
          <div className="skeleton h-[88px] rounded-xl" aria-label={t("Зареждаме", "Loading")} />
        ) : (
          <p className="text-[15px] leading-snug text-muted">
            {t("Не успяхме да вземем днешната оценка. Отворете приложението за пълната картина.", "We couldn't get today's rating. Open the app for the full picture.")}
          </p>
        )}
      </div>

      <div className="grid grid-cols-[1fr_auto] gap-2 px-5 pb-5 lg:px-6 lg:pb-6">
        <a href={familyHref(app, lang)} className="pressable inline-flex min-h-12 items-center justify-center gap-2 whitespace-nowrap rounded-2xl bg-accent px-4 text-[16px] font-semibold text-accent-content">
          {t("Отвори", "Open")}
          <span className="sr-only">{b.name[lang]}</span>
          <ArrowUpRight size={18} strokeWidth={2} aria-hidden />
        </a>
        <a
          href={familyHref(app, lang, "/nastroiki") + "#install"}
          aria-label={t(`Как да инсталирате ${b.name.bg}`, `How to install ${b.name.en}`)}
          title={t("Инсталирай", "Install")}
          className="pressable hover-fill grid size-12 place-items-center rounded-2xl bg-line"
        >
          <Download size={20} strokeWidth={2} aria-hidden />
        </a>
      </div>
    </article>
  );
}

/** Language and theme, compact, for a page without a settings screen. */
function Prefs() {
  const { t, lang } = useI18n();
  const [theme, setTheme] = useTheme();
  const next = theme === "system" ? "light" : theme === "light" ? "dark" : "system";
  const Icon = theme === "light" ? Sun : theme === "dark" ? Moon : Monitor;
  return (
    <div className="flex items-center gap-1">
      <div className="w-[132px]">
        <Segmented
          label={t("Език", "Language")}
          value={lang}
          options={[
            { value: "bg", label: "БГ" },
            { value: "en", label: "EN" },
          ]}
          onChange={(l) => l !== lang && setLanguage(l)}
        />
      </div>
      <button
        onClick={() => setTheme(next)}
        aria-label={t(`Тема: ${theme === "system" ? "като устройството" : theme === "light" ? "светла" : "тъмна"}. Смени`, `Theme: ${theme === "system" ? "same as device" : theme}. Change`)}
        className="pressable hover-fill grid size-11 place-items-center rounded-full text-muted"
      >
        <Icon size={20} strokeWidth={1.75} aria-hidden />
      </button>
    </div>
  );
}
