"use client";

import { useState, useSyncExternalStore } from "react";
import { Share, SquarePlus, MoreVertical, MoreHorizontal, Menu, MonitorDown } from "lucide-react";
import { InstallButton, useInstall } from "./Install";

type Platform = "ios" | "android" | "desktop";
type Browser = "safari" | "chrome" | "samsung" | "firefox" | "edge" | "other";

let detected: { platform: Platform; browser: Browser } | null = null;
function detect(): { platform: Platform; browser: Browser } {
  if (detected) return detected;
  const ua = navigator.userAgent;
  const ipad = /Macintosh/.test(ua) && navigator.maxTouchPoints > 1;
  const platform: Platform = /iPhone|iPad|iPod/.test(ua) || ipad ? "ios" : /Android/.test(ua) ? "android" : "desktop";
  const browser: Browser = /SamsungBrowser/.test(ua)
    ? "samsung"
    : /EdgA|EdgiOS|Edg\//.test(ua)
      ? "edge"
      : /FxiOS|Firefox/.test(ua)
        ? "firefox"
        : /CriOS|Chrome/.test(ua)
          ? "chrome"
          : /Safari/.test(ua)
            ? "safari"
            : "other";
  detected = { platform, browser };
  return detected;
}
const noop = () => () => {};

const icon = "mx-0.5 inline-block size-[1.15em] -translate-y-px align-middle";

function Steps({ items }: { items: React.ReactNode[] }) {
  return (
    <ol className="flex flex-col gap-3">
      {items.map((it, i) => (
        <li key={i} className="flex gap-3">
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-accent/15 text-[14px] font-semibold tabular-nums text-accent">
            {i + 1}
          </span>
          <span className="pt-0.5 text-[16px] leading-snug">{it}</span>
        </li>
      ))}
    </ol>
  );
}

const TABS: { key: Platform; label: string }[] = [
  { key: "ios", label: "iPhone" },
  { key: "android", label: "Android" },
  { key: "desktop", label: "Компютър" },
];

/** How to install, for each platform. The tab for this device is chosen for you. */
export function InstallHelp() {
  const { standalone, canPrompt } = useInstall();
  const device = useSyncExternalStore(noop, detect, () => null);
  const [picked, setPicked] = useState<Platform | null>(null);
  const tab = picked ?? device?.platform ?? "ios";
  const browser = device && device.platform === tab ? device.browser : null;

  if (standalone) return null;

  const content: Record<Platform, React.ReactNode> = {
    ios: (
      <>
        <Steps
          items={[
            browser && browser !== "safari" ? (
              <>
                Натиснете <Share className={icon} strokeWidth={2} aria-label="Сподели" /> до адреса горе.
              </>
            ) : (
              <>
                Натиснете <MoreHorizontal className={icon} strokeWidth={2} aria-label="Още" /> долу вдясно, после{" "}
                <Share className={icon} strokeWidth={2} aria-hidden /> „Сподели“. На по-стар iPhone бутонът{" "}
                <Share className={icon} strokeWidth={2} aria-hidden /> е направо в долната лента.
              </>
            ),
            <>
              Превъртете надолу и изберете <SquarePlus className={icon} strokeWidth={2} aria-hidden /> „Добави към начален екран“.
            </>,
            <>Оставете „Отвори като уеб приложение“ включено и натиснете „Добави“.</>,
          ]}
        />
        <p className="pt-3 text-[14px] leading-snug text-muted">На iPhone известията работят само след като ОгнеЩит е добавен на началния екран.</p>
      </>
    ),
    android:
      browser === "samsung" ? (
        <Steps
          items={[
            <>
              Натиснете <Menu className={icon} strokeWidth={2} aria-label="Меню" /> долу вдясно.
            </>,
            <>Изберете „Добавяне на страница към“, после „Начален екран“.</>,
          ]}
        />
      ) : (
        <Steps
          items={[
            <>
              В Chrome натиснете <MoreVertical className={icon} strokeWidth={2} aria-label="Меню" /> горе вдясно.
            </>,
            <>Изберете „Инсталиране на приложението“ или „Добавяне към началния екран“.</>,
            <>Потвърдете с „Инсталиране“.</>,
          ]}
        />
      ),
    desktop:
      browser === "safari" ? (
        <Steps items={[<>В Safari отворете менюто „Файл“.</>, <>Изберете „Добави в Dock“.</>]} />
      ) : browser === "firefox" ? (
        <p className="text-[16px] leading-snug">Firefox на компютър не инсталира уеб приложения. Отворете сайта в Chrome, Edge или Safari.</p>
      ) : (
        <Steps
          items={[
            <>
              В Chrome или Edge натиснете <MonitorDown className={icon} strokeWidth={2} aria-label="Инсталиране" /> в края на адресната лента.
            </>,
            <>Потвърдете с „Инсталиране“.</>,
          ]}
        />
      ),
  };

  return (
    <section id="install" aria-labelledby="install-title" className="scroll-mt-20">
      <h2 id="install-title" className="px-1 text-[17px] font-semibold">
        Сложете го на началния екран
      </h2>
      <p className="px-1 pt-1 text-[15px] leading-snug text-muted">Отваря се на цял екран и показва последните данни и без интернет.</p>
      <div className="mt-3 rounded-[20px] bg-card p-4">
        {canPrompt && (
          <div className="pb-4">
            <InstallButton />
          </div>
        )}
        <div role="tablist" aria-label="Устройство" className="grid grid-cols-3 rounded-full bg-line p-1">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              onClick={() => setPicked(t.key)}
              className={`min-h-10 rounded-full text-[15px] font-semibold ${tab === t.key ? "bg-tonal text-content" : "text-muted"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div role="tabpanel" className="pt-4">
          {content[tab]}
        </div>
      </div>
    </section>
  );
}
