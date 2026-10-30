"use client";

import { Droplets, Map, Waves, LifeBuoy } from "lucide-react";
import { AppShell, type NavItem } from "@shtit/core/ui/Shell";

const NAV: NavItem[] = [
  { href: "/", label: ["Днес", "Today"], Icon: Droplets },
  { href: "/karta", label: ["Карта", "Map"], Icon: Map },
  { href: "/reki", label: ["Реки", "Rivers"], Icon: Waves },
  { href: "/pomogni", label: ["Помогни", "Help"], Icon: LifeBuoy },
];

/** ВодоЩит's frame: the shared shell with this app's four destinations. */
export function Chrome({ children }: { children: React.ReactNode }) {
  return <AppShell nav={NAV}>{children}</AppShell>;
}
