"use client";

import { useSyncExternalStore } from "react";
import { Share, SquarePlus, MoreVertical, MoreHorizontal, Menu, MonitorDown } from "lucide-react";
import { InstallButton, useInstall } from "./Install";
import { useI18n } from "@/i18n/client";
import { SettingsGroup } from "./Settings";

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
          <span className="grid size-7 shrink-0 place-items-center rounded-full bg-tonal text-[14px] font-semibold tabular-nums text-accent">
            {i + 1}
          </span>
          <span className="pt-0.5 text-[16px] leading-snug">{it}</span>
        </li>
      ))}
    </ol>
  );
}

/** How to install on this device: the platform and browser are detected, so only the right steps show. */
export function InstallHelp() {
  const { standalone, canPrompt } = useInstall();
  const device = useSyncExternalStore(noop, detect, () => null);
  const { t } = useI18n();
  if (standalone || !device) return null;
  const tab = device.platform;
  const browser = device.browser;

  const content: Record<Platform, React.ReactNode> = {
    ios: (
      <>
        <Steps
          items={[
            browser && browser !== "safari"
              ? t(
                  <>
                    Натиснете <Share className={icon} strokeWidth={2} aria-label="Сподели" /> до адреса горе.
                  </>,
                  <>
                    Tap <Share className={icon} strokeWidth={2} aria-label="Share" /> next to the address at the top.
                  </>,
                )
              : t(
                  <>
                    Натиснете <MoreHorizontal className={icon} strokeWidth={2} aria-label="Още" /> долу вдясно, после{" "}
                    <Share className={icon} strokeWidth={2} aria-hidden /> „Сподели“. На по-стар iPhone бутонът{" "}
                    <Share className={icon} strokeWidth={2} aria-hidden /> е направо в долната лента.
                  </>,
                  <>
                    Tap <MoreHorizontal className={icon} strokeWidth={2} aria-label="More" /> at the bottom right, then{" "}
                    <Share className={icon} strokeWidth={2} aria-hidden /> Share. On an older iPhone the{" "}
                    <Share className={icon} strokeWidth={2} aria-hidden /> button is right in the bottom bar.
                  </>,
                ),
            t(
              <>
                Превъртете надолу и изберете <SquarePlus className={icon} strokeWidth={2} aria-hidden /> „Добави към начален екран“.
              </>,
              <>
                Scroll down and choose <SquarePlus className={icon} strokeWidth={2} aria-hidden /> Add to Home Screen.
              </>,
            ),
            t(<>Оставете „Отвори като уеб приложение“ включено и натиснете „Добави“.</>, <>Leave Open as Web App on and tap Add.</>),
          ]}
        />
        <p className="pt-3 text-[14px] leading-snug text-muted">
          {t(
            "На iPhone известията работят само след като ОгнеЩит е добавен на началния екран.",
            "On iPhone, alerts only work once Fire Shield is on your Home Screen.",
          )}
        </p>
      </>
    ),
    android:
      browser === "samsung" ? (
        <Steps
          items={[
            t(
              <>
                Натиснете <Menu className={icon} strokeWidth={2} aria-label="Меню" /> долу вдясно.
              </>,
              <>
                Tap <Menu className={icon} strokeWidth={2} aria-label="Menu" /> at the bottom right.
              </>,
            ),
            t(<>Изберете „Добавяне на страница към“, после „Начален екран“.</>, <>Choose Add page to, then Home screen.</>),
          ]}
        />
      ) : (
        <Steps
          items={[
            t(
              <>
                В Chrome натиснете <MoreVertical className={icon} strokeWidth={2} aria-label="Меню" /> горе вдясно.
              </>,
              <>
                In Chrome, tap <MoreVertical className={icon} strokeWidth={2} aria-label="Menu" /> at the top right.
              </>,
            ),
            t(<>Изберете „Инсталиране на приложението“ или „Добавяне към началния екран“.</>, <>Choose Install app or Add to Home screen.</>),
            t(<>Потвърдете с „Инсталиране“.</>, <>Confirm with Install.</>),
          ]}
        />
      ),
    desktop:
      browser === "safari" ? (
        <Steps
          items={[t(<>В Safari отворете менюто „Файл“.</>, <>In Safari, open the File menu.</>), t(<>Изберете „Добави в Dock“.</>, <>Choose Add to Dock.</>)]}
        />
      ) : browser === "firefox" ? (
        <p className="text-[16px] leading-snug">
          {t(
            "Firefox на компютър не инсталира уеб приложения. Отворете сайта в Chrome, Edge или Safari.",
            "Firefox on a computer can't install web apps. Open the site in Chrome, Edge or Safari.",
          )}
        </p>
      ) : (
        <Steps
          items={[
            t(
              <>
                В Chrome или Edge натиснете <MonitorDown className={icon} strokeWidth={2} aria-label="Инсталиране" /> в края на адресната лента.
              </>,
              <>
                In Chrome or Edge, click <MonitorDown className={icon} strokeWidth={2} aria-label="Install" /> at the end of the address bar.
              </>,
            ),
            t(<>Потвърдете с „Инсталиране“.</>, <>Confirm with Install.</>),
          ]}
        />
      ),
  };

  return (
    <SettingsGroup
      id="install"
      title={t("Приложение", "App")}
      note={t("Отваря се на цял екран и показва последните данни и без интернет.", "It opens full screen and shows the latest data even offline.")}
    >
      <div className="bg-card p-4">
        {canPrompt && (
          <div className="pb-4">
            <InstallButton />
            <p className="pt-3 text-[14px] text-muted">{t("Или ръчно:", "Or by hand:")}</p>
          </div>
        )}
        <p className="pb-3 text-[16px] font-semibold">{t("Сложете го на началния екран", "Add it to your home screen")}</p>
        {content[tab]}
      </div>
    </SettingsGroup>
  );
}
