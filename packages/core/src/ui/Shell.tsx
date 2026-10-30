"use client";

import Link from "next/link";
import { useState } from "react";
import { usePathname } from "next/navigation";
import { Settings, Monitor, Sun, Moon, Phone, LayoutGrid, Check, ArrowUpRight, type LucideIcon } from "lucide-react";
import { InstallButton } from "./Install";
import { Sheet } from "./Sheet";
import { useBrand } from "./Brand";
import { useTheme, type ThemeChoice } from "../client";
import { useI18n } from "../i18n/client";
import { BRANDS, type AppId } from "../brand";
import { Emblem } from "../emblem";

export type NavItem = { href: string; label: readonly [string, string]; Icon: LucideIcon };

export const SETTINGS = "/nastroiki";

export { REPO } from "../brand";

/** The app's mark: the family shield with this app's centre, in the theme's colours. */
export function Logo({ size = 32 }: { size?: number }) {
  const brand = useBrand();
  return <Emblem app={brand.id} size={size} />;
}

/** The visible path. Pages live under /bg and /en (each app's proxy rewrites to them); drop that prefix. */
export function usePath() {
  return usePathname().replace(/^\/(bg|en)(?=\/|$)/, "") || "/";
}

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

/** A link to another app of the family, in the visitor's language. */
export function familyHref(app: AppId, lang: string, path = "/") {
  return `${BRANDS[app].url}${path}?l=${lang}`;
}

/** The whole frame of an app: sidebar from `lg`, top bar and bottom tabs on phones. */
export function AppShell({ nav, children }: { nav: readonly NavItem[]; children: React.ReactNode }) {
  return (
    <>
      <Sidebar nav={nav} />
      <TopBar />
      <div className="lg:pl-[248px]">
        <main className="mx-auto max-w-xl px-4 pb-[calc(var(--tabbar-h)_+_env(safe-area-inset-bottom)_+_32px)] pt-4 lg:max-w-[1180px] lg:px-10 lg:pb-16 lg:pt-10">
          {children}
        </main>
      </div>
      <TabBar nav={nav} />
    </>
  );
}

export function Sidebar({ nav }: { nav: readonly NavItem[] }) {
  const path = usePath();
  const brand = useBrand();
  const { t, tp, lang } = useI18n();
  const others = (["fire", "flood", "hub"] as const).filter((a) => a !== brand.id);
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-card/60 px-4 py-6 lg:flex">
      <Link href="/" className="flex items-center gap-2.5 rounded-xl px-2 py-1">
        <Logo size={34} />
        <span className="font-display text-[22px] font-bold tracking-[-0.01em]">{brand.name[lang]}</span>
      </Link>
      <nav aria-label={t("Основна навигация", "Main navigation")} className="mt-8">
        <ul className="flex flex-col gap-1">
          {nav.map(({ href, label, Icon }) => {
            const active = isActive(path, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-full px-4 text-[15px] ${
                    active ? "bg-tonal font-semibold text-content" : "hover-fill font-medium text-muted hover:text-content"
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

      {/* The rest of the family, one tap away but out of the way. */}
      <nav aria-label={t("Други приложения от Щит", "Other Shield apps")} className="mt-8">
        <p className="px-4 pb-1 text-[13px] font-medium text-muted">{t("Още от Щит", "More from Shield")}</p>
        <ul className="flex flex-col gap-1">
          {others.map((a) => (
            <li key={a}>
              <a href={familyHref(a, lang)} className="hover-fill flex min-h-11 items-center gap-3 rounded-full px-4 text-[15px] font-medium text-muted hover:text-content">
                <Emblem app={a} size={22} fixed />
                <span className="min-w-0 flex-1 truncate">{BRANDS[a].name[lang]}</span>
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        <InstallButton />
        <Link
          href={SETTINGS}
          aria-current={isActive(path, SETTINGS) ? "page" : undefined}
          className={`flex min-h-12 items-center gap-3 rounded-full px-4 text-[15px] ${
            isActive(path, SETTINGS) ? "bg-tonal font-semibold text-content" : "hover-fill font-medium text-muted hover:text-content"
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

/** Phone top bar: name on the left; install, the family and settings on the right. */
export function TopBar() {
  const path = usePath();
  const brand = useBrand();
  const { t, lang } = useI18n();
  return (
    <header
      className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl supports-[not(backdrop-filter:blur(1px))]:bg-surface lg:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-12 max-w-xl items-center justify-between px-3">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-1">
          <Logo size={24} />
          <span className="font-display text-[17px] font-bold">{brand.name[lang]}</span>
        </Link>
        <div className="flex items-center gap-1">
          <InstallButton compact />
          {brand.id !== "hub" && <AppSwitcher />}
          <Link
            href={SETTINGS}
            aria-label={t("Настройки", "Settings")}
            aria-current={path === SETTINGS ? "page" : undefined}
            className="pressable hover-fill grid size-11 place-items-center rounded-full text-muted aria-[current=page]:text-accent"
          >
            <Settings size={22} strokeWidth={1.75} aria-hidden />
          </Link>
        </div>
      </div>
    </header>
  );
}

/** The family in a sheet: every app with what it is for. The current one is marked, the others open in their own place. */
export function AppSwitcher() {
  const [open, setOpen] = useState(false);
  const brand = useBrand();
  const { t, lang } = useI18n();
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label={t("Приложения от Щит", "Shield apps")}
        className="pressable hover-fill grid size-11 place-items-center rounded-full text-muted"
      >
        <LayoutGrid size={21} strokeWidth={1.75} aria-hidden />
      </button>
      <Sheet
        open={open}
        onClose={() => setOpen(false)}
        title={t("Приложения от Щит", "Shield apps")}
        description={t("Всяко работи само и се инсталира отделно. Едно и също място, тема и език.", "Each one works on its own and installs separately. Same look, same languages.")}
      >
        <FamilyList current={brand.id} lang={lang} />
      </Sheet>
    </>
  );
}

export function FamilyList({ current, lang }: { current: AppId; lang: "bg" | "en" }) {
  const { t } = useI18n();
  return (
    <ul className="-mx-3 flex flex-col">
      {(["fire", "flood", "hub"] as const).map((a) => {
        const b = BRANDS[a];
        const here = a === current;
        const body = (
          <>
            <Emblem app={a} size={40} fixed />
            <span className="min-w-0 flex-1">
              <span className="block text-[17px] font-semibold leading-tight">{b.name[lang]}</span>
              <span className="block pt-0.5 text-[14px] leading-snug text-muted">
                {b.tagline[lang][1]}
              </span>
            </span>
            {here ? (
              <span className="flex items-center gap-1 text-[14px] font-medium text-muted">
                <Check size={16} strokeWidth={2.25} aria-hidden />
                {t("Тук сте", "You're here")}
              </span>
            ) : (
              <ArrowUpRight size={18} strokeWidth={2} className="text-muted" aria-hidden />
            )}
          </>
        );
        return (
          <li key={a}>
            {here ? (
              <div className="flex min-h-16 items-center gap-3 rounded-xl px-3 py-2">{body}</div>
            ) : (
              <a href={familyHref(a, lang)} className="hover-fill flex min-h-16 items-center gap-3 rounded-xl px-3 py-2">
                {body}
              </a>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Bottom navigation in the Material 3 style: up to five destinations, labels always visible, and a pill
 * indicator behind the active icon. The pill grows from the centre (transform and opacity only,
 * so fast taps never leave half-drawn states). Short bar: 64 px plus the safe area.
 */
export function TabBar({ nav }: { nav: readonly NavItem[] }) {
  const path = usePath();
  const { t, tp } = useI18n();
  return (
    <nav
      aria-label={t("Основна навигация", "Main navigation")}
      className="fixed inset-x-0 bottom-0 z-40 bg-card/90 backdrop-blur-xl supports-[not(backdrop-filter:blur(1px))]:bg-card lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid h-[var(--tabbar-h)] max-w-xl" style={{ gridTemplateColumns: `repeat(${nav.length}, minmax(0, 1fr))` }}>
        {nav.map(({ href, label, Icon }) => {
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
