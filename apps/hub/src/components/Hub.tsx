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
import { Segmented } from "@shtit/core/ui/Settings";
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
          <AppCard key={a} app={a} lat={loc.lat} lon={loc.lon} first={a === lead} />
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

      <footer className="flex flex-col gap-4 border-t border-line pt-6 text-[14px] text-muted sm:flex-row sm:items-center sm:justify-between">
        <p className="max-w-[60ch] leading-snug">
          {t(
            "Щит не е официален източник и не заменя предупрежденията на властите. Направено от Камен, отворен код.",
            "Shield is not an official source and does not replace warnings from the authorities. Made by Noah, open source.",
          )}{" "}
          <a href={REPO} target="_blank" rel="noreferrer" className="font-medium text-accent">
            GitHub
          </a>
        </p>
        <a href="tel:112" className="pressable inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#c7361f] px-5 text-[15px] font-semibold text-white">
          <Phone size={18} strokeWidth={2} aria-hidden />
          {t("Спешно: 112", "Emergency: 112")}
        </a>
      </footer>
    </div>
  );
}

/** One app: its tile, what it is for, today's answer for the place, and the way in. */
function AppCard({ app, lat, lon, first }: { app: AppId; lat: number; lon: number; first: boolean }) {
  const { t, lang, agoLong } = useI18n();
  const b = BRANDS[app];
  const s = useJson<AppSummary>(`${b.url}/api/summary?lat=${lat.toFixed(2)}&lon=${lon.toFixed(2)}&l=${lang}`);
  const lv = s.data?.level;
  return (
    <article aria-labelledby={`app-${app}`} className="enter flex flex-col overflow-hidden rounded-[24px] bg-card">
      <div className="flex items-start gap-4 p-5 lg:p-6">
        <EmblemTile app={app} size={60} inset={0.1} radius={16} />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 id={`app-${app}`} className="font-display text-[24px] font-bold leading-tight">
              {b.name[lang]}
            </h2>
            {first && <span className="rounded-full bg-tonal px-2.5 py-1 text-[12px] font-semibold">{t("Сезонът е сега", "In season now")}</span>}
          </div>
          <p className="pt-0.5 text-[15px] leading-snug text-muted">
            {b.tagline[lang][0]}: {b.tagline[lang][1].toLowerCase()}
          </p>
        </div>
      </div>

      <div className="mx-5 rounded-[20px] p-4 lg:mx-6" style={lv ? { background: lv.hex, color: lv.onColor } : { background: "var(--surface)" }} aria-live="polite">
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
            <p className="pt-2 text-[12px] opacity-80">{t(`Обновено ${agoLong(s.data.updated)}`, `Updated ${agoLong(s.data.updated)}`)}</p>
          </>
        ) : s.loading ? (
          <div className="skeleton h-[88px] rounded-xl" aria-label={t("Зареждаме", "Loading")} />
        ) : (
          <p className="text-[15px] leading-snug text-muted">
            {t("Не успяхме да вземем днешната оценка. Отворете приложението за пълната картина.", "We couldn't get today's rating. Open the app for the full picture.")}
          </p>
        )}
      </div>

      <div className="mt-auto grid grid-cols-[1fr_auto] gap-2 p-5 lg:p-6">
        <a href={familyHref(app, lang)} className="pressable inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-[16px] font-semibold text-accent-content">
          {t(`Отвори ${b.name.bg}`, `Open ${b.name.en}`)}
          <ArrowUpRight size={18} strokeWidth={2} aria-hidden />
        </a>
        <a href={familyHref(app, lang, "/nastroiki") + "#install"} className="pressable hover-fill inline-flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line px-4 text-[16px] font-semibold">
          <Download size={18} strokeWidth={2} aria-hidden />
          {t("Инсталирай", "Install")}
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
