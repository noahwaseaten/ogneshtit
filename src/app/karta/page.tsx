import type { Metadata } from "next";
import { Info } from "lucide-react";
import { LossMapLazy } from "@/components/LossMapLazy";

export const metadata: Metadata = { title: "Карта · Гората днес" };

export default function Karta() {
  return (
    <div className="flex flex-col gap-4">
      <header className="px-1 pt-2">
        <h1 className="font-display text-[32px] font-bold tracking-[-0.01em]">Къде изчезва гората</h1>
        <p className="pt-1 text-[16px] leading-snug text-muted">
          Розовото е загубена горска покривка, засечена от спътници. Зеленото — защитените зони Натура 2000. Докоснете
          зона за повече.
        </p>
      </header>
      <LossMapLazy />
      <p className="flex gap-2 px-1 text-[13px] leading-snug text-muted">
        <Info size={16} strokeWidth={1.5} className="mt-0.5 shrink-0" aria-hidden />
        <span>
          Загубата на покривка не означава непременно незаконна сеч: тя включва и законни сечи, пожари, корояд и
          ветровали. Данни: Hansen/UMD, Global Forest Watch; граници: Европейска агенция по околна среда.
        </span>
      </p>
    </div>
  );
}
