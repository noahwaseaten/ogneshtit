"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Map, BarChart3, LifeBuoy, Info, Monitor, Sun, Moon } from "lucide-react";
import { InstallButton } from "./Install";
import { useTheme, type ThemeChoice } from "@/lib/client";

const NAV = [
  { href: "/", label: "Днес", Icon: Flame },
  { href: "/karta", label: "Карта", Icon: Map },
  { href: "/pozhari", label: "Статистика", Icon: BarChart3 },
  { href: "/pomogni", label: "Помогни", Icon: LifeBuoy },
];

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

const isActive = (path: string, href: string) => (href === "/" ? path === "/" : path.startsWith(href));

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="fixed inset-y-0 left-0 z-40 hidden w-[248px] flex-col border-r border-line bg-card/60 px-4 py-6 lg:flex">
      <Link href="/" className="flex items-center gap-2.5 rounded-xl px-2 py-1">
        <Logo size={34} />
        <span className="font-display text-[22px] font-bold tracking-[-0.01em]">ОгнеЩит</span>
      </Link>
      <nav aria-label="Основна навигация" className="mt-8">
        <ul className="flex flex-col gap-1">
          {NAV.map(({ href, label, Icon }) => {
            const active = isActive(path, href);
            return (
              <li key={href}>
                <Link
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={`flex min-h-12 items-center gap-3 rounded-full px-4 text-[15px] ${
                    active ? "bg-accent/15 font-semibold text-content" : "font-medium text-muted hover:bg-line/60 hover:text-content"
                  }`}
                >
                  <Icon size={20} strokeWidth={active ? 2.25 : 1.75} aria-hidden className={active ? "text-accent" : undefined} />
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
      <div className="mt-auto flex flex-col gap-3">
        <InstallButton />
        <Link
          href="/za"
          aria-current={isActive(path, "/za") ? "page" : undefined}
          className="flex min-h-11 items-center gap-3 rounded-xl px-3 text-[15px] font-medium text-muted hover:bg-line/60 hover:text-content aria-[current=page]:text-accent"
        >
          <Info size={20} strokeWidth={1.75} aria-hidden />
          За ОгнеЩит
        </Link>
        <ThemeControl compact />
        <a href="tel:112" className="pressable flex min-h-11 items-center justify-center rounded-xl bg-[#c7361f] text-[15px] font-semibold text-white">
          Спешно: 112
        </a>
      </div>
    </aside>
  );
}

/** Phone top bar: name on the left, install and "about" on the right. */
export function TopBar() {
  const path = usePathname();
  return (
    <header
      className="sticky top-0 z-30 border-b border-line bg-surface/85 backdrop-blur-xl supports-[not(backdrop-filter:blur(1px))]:bg-surface lg:hidden"
      style={{ paddingTop: "env(safe-area-inset-top)" }}
    >
      <div className="mx-auto flex h-12 max-w-xl items-center justify-between px-3">
        <Link href="/" className="flex items-center gap-2 rounded-lg px-1">
          <Logo size={24} />
          <span className="font-display text-[17px] font-bold">ОгнеЩит</span>
        </Link>
        <div className="flex items-center gap-1">
          <InstallButton compact />
          <Link
            href="/za"
            aria-label="За ОгнеЩит и настройки"
            aria-current={path === "/za" ? "page" : undefined}
            className="pressable grid size-11 place-items-center rounded-full text-muted hover:bg-line/60 aria-[current=page]:text-accent"
          >
            <Info size={22} strokeWidth={1.75} aria-hidden />
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
  const path = usePathname();
  return (
    <nav
      aria-label="Основна навигация"
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
                    className={`absolute inset-0 rounded-full bg-accent/15 transition-[transform,opacity] duration-200 ease-[var(--ease-out)] group-focus-visible:ring-2 group-focus-visible:ring-accent ${
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
                <span className={`text-[12px] leading-none tracking-[0.01em] ${active ? "font-semibold text-content" : "font-medium text-muted"}`}>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}

const THEMES: { key: ThemeChoice; label: string; Icon: typeof Sun }[] = [
  { key: "system", label: "Като устройството", Icon: Monitor },
  { key: "light", label: "Светла", Icon: Sun },
  { key: "dark", label: "Тъмна", Icon: Moon },
];

export function ThemeControl({ compact }: { compact?: boolean }) {
  const [theme, setTheme] = useTheme();
  return (
    <div role="radiogroup" aria-label="Тема" className="flex rounded-full bg-line p-1">
      {THEMES.map(({ key, label, Icon }) => (
        <button
          key={key}
          role="radio"
          aria-checked={theme === key}
          aria-label={compact ? label : undefined}
          title={compact ? label : undefined}
          onClick={() => setTheme(key)}
          className={`flex min-h-10 flex-1 items-center justify-center gap-1.5 rounded-full px-2 text-[14px] font-medium transition-colors duration-150 ${
            theme === key ? "bg-card text-content shadow-[var(--lift)]" : "text-muted hover:text-content"
          }`}
        >
          <Icon size={17} strokeWidth={1.75} aria-hidden />
          {!compact && <span>{key === "system" ? "Авто" : label}</span>}
        </button>
      ))}
    </div>
  );
}
