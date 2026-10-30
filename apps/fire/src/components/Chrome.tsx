"use client";

import { Flame, Map, BarChart3, LifeBuoy } from "lucide-react";
import { AppShell, type NavItem } from "@shtit/core/ui/Shell";

const NAV: NavItem[] = [
  { href: "/", label: ["Днес", "Today"], Icon: Flame },
  { href: "/karta", label: ["Карта", "Map"], Icon: Map },
  { href: "/pozhari", label: ["Статистика", "Statistics"], Icon: BarChart3 },
  { href: "/pomogni", label: ["Помогни", "Help"], Icon: LifeBuoy },
];

/** ОгнеЩит's frame: the shared shell with this app's four destinations. */
export function Chrome({ children }: { children: React.ReactNode }) {
  return <AppShell nav={NAV}>{children}</AppShell>;
}
