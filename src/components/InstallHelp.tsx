"use client";

import { Share, SquarePlus } from "lucide-react";
import { InstallButton, useInstall } from "./Install";

/** Install as an app: a real button where the browser allows it, short steps on iPhone. */
export function InstallHelp() {
  const { standalone, ios, canPrompt } = useInstall();
  if (standalone) return null;
  return (
    <section aria-labelledby="install" className="flex flex-col gap-2">
      <h2 id="install" className="px-1 text-[13px] font-semibold uppercase tracking-wide text-muted">
        Като приложение
      </h2>
      <div className="rounded-[20px] bg-card p-4 shadow-[var(--shadow)]">
        <p className="text-[15px] leading-snug">Добавете ОгнеЩит на началния екран. Отваря се на цял екран и работи без интернет.</p>
        {canPrompt && (
          <div className="pt-3">
            <InstallButton />
          </div>
        )}
        {ios && (
          <ol className="flex flex-col gap-2 pt-3 text-[15px]">
            <li className="flex items-center gap-2">
              <span className="font-semibold">1.</span> Натиснете <Share size={18} strokeWidth={2} aria-label="Сподели" /> в Safari
            </li>
            <li className="flex items-center gap-2">
              <span className="font-semibold">2.</span> Изберете <SquarePlus size={18} strokeWidth={2} aria-hidden /> „Добави към началния екран“
            </li>
          </ol>
        )}
        {!canPrompt && !ios && <p className="pt-2 text-[14px] text-muted">В Chrome отворете менюто ⋮ и изберете „Инсталиране на приложението“.</p>}
      </div>
    </section>
  );
}
