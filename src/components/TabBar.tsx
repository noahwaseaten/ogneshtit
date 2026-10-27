"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Flame, Map, LifeBuoy } from "lucide-react";

const TABS = [
  { href: "/", label: "Днес", Icon: Flame },
  { href: "/karta", label: "Карта", Icon: Map },
  { href: "/pomogni", label: "Помогни", Icon: LifeBuoy },
];

export function TabBar() {
  const path = usePathname();
  return (
    <nav
      aria-label="Основна навигация"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/85 backdrop-blur-xl supports-[not(backdrop-filter:blur(1px))]:bg-card"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto flex h-[var(--tabbar-h)] max-w-xl">
        {TABS.map(({ href, label, Icon }) => {
          const active = href === "/" ? path === "/" : path.startsWith(href);
          return (
            <li key={href} className="flex-1">
              <Link
                href={href}
                aria-current={active ? "page" : undefined}
                className={`pressable flex h-full flex-col items-center justify-center gap-0.5 text-[11px] ${
                  active ? "font-semibold text-accent" : "font-medium text-muted"
                }`}
              >
                <Icon
                  aria-hidden
                  size={24}
                  strokeWidth={active ? 2 : 1.5}
                  fill={active ? "currentColor" : "none"}
                  fillOpacity={active ? 0.18 : 0}
                />
                {label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
