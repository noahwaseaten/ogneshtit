"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Map, BarChart3, LifeBuoy, Settings, Monitor, Sun, Moon, Phone } from "lucide-react";
import { InstallButton } from "./Install";
import { useTheme, type ThemeChoice } from "@/lib/client";
import { useI18n } from "@/i18n/client";
import { APP_NAME } from "@/i18n/lang";

const NAV = [
  { href: "/", label: ["Днес", "Today"], Icon: Flame },
  { href: "/karta", label: ["Карта", "Map"], Icon: Map },
  { href: "/pozhari", label: ["Статистика", "Statistics"], Icon: BarChart3 },
  { href: "/pomogni", label: ["Помогни", "Help"], Icon: LifeBuoy },
] as const;

export const SETTINGS = "/nastroiki";

export const REPO = "https://github.com/noahwaseaten/ogneshtit";

/** Shield with a flame: the app's mark. Colours come from the theme. */
export function Logo({ size = 32 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <path d="M16 2.5 27 6.6v8.2c0 7-4.7 12.6-11 14.7C9.7 27.4 5 21.8 5 14.8V6.6L16 2.5Z" fill="var(--accent)" />
      <path
        d="M16 9.2c.9 2.6 4.1 4.3 4.1 8.1a4.1 4.1 0 1 1-8.2 0c0-1.9 1-3 1.9-4 .3 1.4 1 2.2 1.8 2.4-.5-2.1 0-4.4.4-6.5Z"
        fill="var(--ember)"
      />
    </svg>
  );
}

/** The visible path. Pages live under /bg and /en (src/proxy.ts rewrites to them); drop that prefix. */
function usePath() {
  return usePathname().replace(/^\/(bg|en)(?=\/|$)/, "") || "/";
}

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Sidebar() {
  const path = usePath();
  const { t, tp, lang } = useI18n();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-card/60 px-4 py-6 lg:flex">
      <Link href="/" className="flex items-center gap-2.5 rounded-xl px-2 py-1">
        <Logo size={34} />
        <span className="font-display text-[22px] font-bold tracking-[-0.01em]">{APP_NAME[lang]}</span>
      </Link>
      <nav aria-label={t("Основна навигация", "Main navigation")} className="mt-8">
        <ul className="flex flex-col gap-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(path, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-full px-4 text-[15px] transition-colors duration-150 ${
                    active ? "bg-tonal font-semibold text-content" : "font-medium text-muted hover:bg-line hover:text-content"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden className={active ? "text-accent" : undefined} />
                  {tp(label)}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <InstallButton />
        <Link
          href={SETTINGS}
          aria-current={isActive(path, SETTINGS) ? "page" : undefined}
          className={`flex min-h-12 items-center gap-3 rounded-full px-4 text-[15px] transition-colors duration-150 ${
            isActive(path, SETTINGS) ? "bg-tonal font-semibold text-content" : "font-medium text-muted hover:bg-line hover:text-content"
          }`}
        >
          <Settings size={20} strokeWidth={isActive(path, SETTINGS) ? 2.25 : 1.75} aria-hidden className={isActive(path, SETTINGS) ? "text-accent" : undefined} />
          {t("Настройки", "Settings")}
        </Link>
        <a href="tel:112" className="pressable flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#c7361f] text-[15px] font-semibold text-white">
          <Phone size={18} strokeWidth={2} aria-hidden />
          {t("Спешно: 112", "Emergency: 112")}
        </a>
      </div>
    </aside>
  );
}

/** Phone top bar: name on the left, install and settings on the right. */
export function TopBar() {
  const path = usePath();
  const { t, lang } = useI18n();
  return (
    <header
      className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl supports-[not(backdrop-filter:blur(1px))]:bg-surface lg:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-12 max-w-xl items-center justify-between px-3">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-1">
          <Logo size={24} />
          <span className="font-display text-[17px] font-bold">{APP_NAME[lang]}</span>
        </Link>
        <div className="flex items-center gap-1">
          <InstallButton compact />
          <Link
            href={SETTINGS}
            aria-label={t("Настройки", "Settings")}
            aria-current={path === SETTINGS ? "page" : undefined}
            className="pressable grid size-11 place-items-center rounded-full text-muted hover:bg-line/60 aria-[current=page]:text-accent"
          >
            <Settings size={22} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}

/**
 * Bottom navigation in the Material 3 style: four destinations, labels always visible, and a pill
 * indicator behind the active icon. The pill grows from the centre (transform and opacity only,
 * so fast taps never leave half-drawn states). Short bar: 64 px plus the safe area.
 */
export function TabBar() {
  const path = usePath();
  const { t, tp } = useI18n();
  return (
    <nav
      aria-label={t("Основна навигация", "Main navigation")}
      className="fixed inset-x-0 bottom-0 z-40 bg-card/90 backdrop-blur-xl supports-[not(backdrop-filter:blur(1px))]:bg-card lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid h-[var(--tabbar-h)] max-w-xl grid-cols-4">
        {NAV.map(({ href, label, Icon }) => {
          const active = isActive(path, href);
          return (
            <li key={href}>
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className="group flex h-full flex-col items-center justify-center gap-1 outline-none"
              >
                <span className="relative grid h-8 w-14 place-items-center">
                  <span
                    aria-hidden
                    className={`absolute inset-0 rounded-full bg-tonal transition-[transform,opacity] duration-200 ease-[var(--ease-out)] group-focus-visible:ring-2 group-focus-visible:ring-accent ${
                      active ? "scale-x-100 opacity-100" : "scale-x-50 opacity-0 group-active:scale-x-90 group-active:opacity-60"
                    }`}
                  />
                  <Icon
                    aria-hidden
                    size={22}
                    strokeWidth={active ? 2.25 : 1.75}
                    className={`relative ${active ? "text-accent" : "text-muted"}`}
                  />
                </span>
                <span className={`text-[12px] leading-none tracking-[0.01em] ${active ? "font-semibold text-content" : "font-medium text-muted"}`}>{tp(label)}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const THEMES: { key: ThemeChoice; label: [string, string]; short: [string, string]; Icon: typeof Sun }[] = [
  { key: "system", label: ["Като устройството", "Same as device"], short: ["Авто", "Auto"], Icon: Monitor },
  { key: "light", label: ["Светла", "Light"], short: ["Светла", "Light"], Icon: Sun },
  { key: "dark", label: ["Тъмна", "Dark"], short: ["Тъмна", "Dark"], Icon: Moon },
];

export function ThemeControl({ compact }: { compact?: boolean }) {
  const [theme, setTheme] = useTheme();
  const { t, tp } = useI18n();
  return (
    <div role="radiogroup" aria-label={t("Тема", "Theme")} className="flex rounded-full bg-line p-1">
      {THEMES.map(({ key, label, short, Icon }) => (
        <button
          key={key}
          role="radio"
          aria-checked={theme === key}
          aria-label={compact ? tp(label) : undefined}
          title={compact ? tp(label) : undefined}
          onClick={() => setTheme(key)}
          className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[14px] font-medium transition-colors duration-150 ${
            theme === key ? "bg-tonal text-content" : "text-muted hover:text-content"
          }`}
        >
          <Icon size={17} strokeWidth={1.75} aria-hidden />
          {!compact && <span>{tp(short)}</span>}
        </button>
      ))}
    </div>
  );
}
