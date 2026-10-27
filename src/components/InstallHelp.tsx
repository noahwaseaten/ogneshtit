"use client";

import { Share, SquarePlus } from "lucide-react";
import { InstallButton, useInstall } from "./Install";

/** Install as an app: a real button where the browser allows it, short steps elsewhere. */
export function InstallHelp() {
  const { standalone, ios, canPrompt } = useInstall();
  if (standalone) return null;
  const icon = "mx-0.5 inline-block size-[1.1em] -translate-y-px align-middle";
  return (
    <section aria-labelledby="install" className="flex flex-col gap-2">
      <h2 id="install" className="px-1 text-[17px] font-semibold">
        Сложете го на началния екран
      </h2>
      <div className="rounded-[20px] bg-card p-4 text-[15px] leading-relaxed">
        <p>Отваря се на цял екран, без адресна лента, и показва последните данни и без интернет.</p>
        {canPrompt && (
          <div className="pt-3">
            <InstallButton />
          </div>
        )}
        {ios && (
          <ol className="list-decimal pl-5 pt-2 marker:font-semibold">
            <li>
              Натиснете <Share className={icon} strokeWidth={2} aria-label="Сподели" /> долу в Safari.
            </li>
            <li>
              Изберете <SquarePlus className={icon} strokeWidth={2} aria-hidden /> „Добави към началния екран“.
            </li>
          </ol>
        )}
        {!canPrompt && !ios && <p className="pt-2 text-muted">В Chrome: меню ⋮, после „Инсталиране на приложението“.</p>}
      </div>
    </section>
  );
}
