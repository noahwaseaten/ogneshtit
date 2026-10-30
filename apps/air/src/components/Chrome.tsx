"use client";

import { Wind, Map, Building2, LifeBuoy } from "lucide-react";
import { AppShell, type NavItem } from "@shtit/core/ui/Shell";

const NAV: NavItem[] = [
  { href: "/", label: ["Днес", "Today"], Icon: Wind },
  { href: "/karta", label: ["Карта", "Map"], Icon: Map },
  { href: "/gradove", label: ["Градове", "Cities"], Icon: Building2 },
  { href: "/pomogni", label: ["Помогни", "Help"], Icon: LifeBuoy },
];

/** ВъздухоЩит's frame: the shared shell with this app's four destinations. */
export function Chrome({ children }: { children: React.ReactNode }) {
  return <AppShell nav={NAV}>{children}</AppShell>;
}
