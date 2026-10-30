"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, LocateFixed, Mail, Phone, Send, X, Check, ChevronDown } from "lucide-react";
import { getPosition, useLocation } from "@shtit/core/client";
import { useI18n } from "@shtit/core/i18n/client";
import { formatters } from "@shtit/core/i18n/format";
import { DIRECTORATES, directorateFor, type Directorate } from "@/data/basins";
import { GAUGES } from "@/data/gauges";
import { distanceKm } from "@shtit/core/geo";
import { Sheet } from "@shtit/core/ui/Sheet";

// What was seen. The report itself is always written in Bulgarian, because it goes to a Bulgarian office.
// These are the things the basin directorates ask people to report (blocked beds, rubbish, digging, damaged banks).
const KINDS: [string, string][] = [
  ["Запушено речно корито (клони, дървета, отпадъци)", "Blocked river bed (branches, trees, rubbish)"],
  ["Изхвърляне на отпадъци в реката", "Rubbish dumped in the river"],
  ["Изземване на пясък и чакъл", "Sand or gravel being dug out"],
  ["Подкопан бряг или повредена дига", "Undermined bank or damaged dike"],
  ["Строеж или насип в коритото", "Building or fill in the river bed"],
  ["Друго", "Something else"],
];
const bgTime = formatters("bg").time;

type Photo = { file: File; url: string };

/** A first guess at the directorate: the basin of the nearest river point. Basins follow watersheds, so it can be wrong
 *  near a ridge; the person can pick another. */
function nearestDirectorate(lat: number, lon: number): Directorate {
  const g = [...GAUGES].sort((a, b) => distanceKm(lat, lon, a.lat, a.lon) - distanceKm(lat, lon, b.lat, b.lon))[0];
  return directorateFor(g?.basin ?? "dunav");
}
const telOf = (p: string) => p.replace(/\s/g, "");

/**
 * Prepares a report and hands it to the person's own phone apps (share sheet, e-mail, call).
 * Nothing is sent or stored by ВодоЩит itself.
 */
export function ReportForm() {
  const [kindIx, setKindIx] = useState(0);
  const [picking, setPicking] = useState(false);
  const kind = KINDS[kindIx][0];
  const { t, tp, lang } = useI18n();
  const [pos, setPos] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);
  const [place, setPlace] = useState("");
  const [desc, setDesc] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [chosen, setChosen] = useState<Directorate["basin"] | null>(null);
  const [copied, setCopied] = useState(false);
  const { loc } = useLocation();

  // The directorate for the reported spot, or for the place chosen on the home screen.
  const at = pos ?? loc;
  const auto = useMemo(() => nearestDirectorate(at.lat, at.lon), [at.lat, at.lon]);
  const rdg = chosen ? directorateFor(chosen) : auto;

  // Free the photo previews when the form goes away.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  const locate = () => {
    setLocating(true);
    setLocErr(null);
    getPosition(true, lang)
      .then((p) => setPos({ lat: p.coords.latitude, lon: p.coords.longitude, acc: p.coords.accuracy }))
      .catch((e: Error) => setLocErr(e.message))
      .finally(() => setLocating(false));
  };

  // Composed when sent, so "Кога" is the moment of sending.
  const compose = () => [
    `Сигнал: ${kind}`,
    `Кога: ${bgTime(new Date().toISOString(), { day: "numeric", month: "long", year: "numeric", hour: "2-digit", minute: "2-digit" })}`,
    pos && `Координати: ${pos.lat.toFixed(5)}, ${pos.lon.toFixed(5)} (точност около ${Math.round(pos.acc)} м)`,
    pos && `Карта: https://www.google.com/maps/search/?api=1&query=${pos.lat.toFixed(5)},${pos.lon.toFixed(5)}`,
    place.trim() && `Място: ${place.trim()}`,
    desc.trim() && `Описание: ${desc.trim()}`,
    photos.length > 0 && `Снимки: ${photos.length}`,
    "",
    lang === "en" ? "Подготвено с ВодоЩит. Подателят пише на английски." : "Подготвено с ВодоЩит",
  ]
    .filter((l) => l !== false && l !== null && l !== undefined)
    .join("\n");
  const subject = `Сигнал: ${kind.toLowerCase()}${place.trim() ? `, ${place.trim()}` : ""}`;
  const ready = !!pos || place.trim().length > 2;

  const canShareFiles = typeof navigator !== "undefined" && "canShare" in navigator && photos.length > 0 && navigator.canShare({ files: photos.map((p) => p.file) });

  const share = async () => {
    try {
      if (navigator.share) {
        await navigator.share({ title: subject, text: compose(), ...(canShareFiles ? { files: photos.map((p) => p.file) } : {}) });
        return;
      }
    } catch (e) {
      if ((e as Error).name === "AbortError") return;
    }
    await copy();
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(compose());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };

  const field = "w-full rounded-2xl border border-line bg-surface px-4 text-[16px] outline-none placeholder:text-muted focus:border-accent";

  return (
    <section aria-labelledby="report-title" className="rounded-[20px] bg-card p-5 lg:p-6">
      <div>
        <h2 id="report-title" className="font-display text-[22px] font-semibold leading-tight">
          {t("Проблем с река?", "A problem with a river?")}
        </h2>
      </div>
      <p className="pt-2 text-[16px] leading-snug">
        {t(
          "Запушени корита и боклуци в реките правят наводненията по-лоши. Подгответе сигнала тук и го изпратете до басейновата дирекция с имейл, съобщение или обаждане. ВодоЩит не изпраща и не пази нищо сам.",
          "Blocked beds and rubbish in rivers make floods worse. Put the report together here and send it to the river basin directorate by email, message or phone. Flood Shield doesn't send or keep anything itself.",
        )}
      </p>
      {lang === "en" && (
        <p className="pt-2 text-[14px] leading-snug text-muted">
          The directorates work in Bulgarian, so the report is written in Bulgarian for you. Your own description can stay in English.
        </p>
      )}
      <p className="pt-2 text-[14px] font-medium text-ember">{t("Ако водата се качва или някой е в опасност, звъннете на 112.", "If the water is rising or someone is in danger, call 112.")}</p>

      <fieldset className="mt-5">
        <legend className="text-[15px] font-semibold">{t("Какво видяхте?", "What did you see?")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {KINDS.map((k, i) => (
            <label
              key={k[0]}
              className={`pressable inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3.5 text-[15px] font-medium has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                kindIx === i ? "border-content bg-content text-surface" : "hover-fill border-line"
              }`}
            >
              <input type="radio" name="kind" value={k[0]} checked={kindIx === i} onChange={() => setKindIx(i)} className="sr-only" />
              {tp(k)}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-5">
        <p className="text-[15px] font-semibold">{t("Къде?", "Where?")}</p>
        {pos ? (
          <div className="mt-2 flex items-center justify-between gap-3 rounded-2xl bg-surface p-3 pl-4">
            <div className="min-w-0">
              <p className="font-display text-[18px] font-semibold tabular-nums">
                {pos.lat.toFixed(5)}, {pos.lon.toFixed(5)}
              </p>
              <p className="text-[13px] text-muted tabular-nums">{t(`Точност около ${Math.round(pos.acc)} м`, `Accurate to about ${Math.round(pos.acc)} m`)}</p>
            </div>
            <button onClick={() => setPos(null)} className="pressable hover-fill grid size-11 shrink-0 place-items-center rounded-full" aria-label={t("Махни координатите", "Remove the coordinates")}>
              <X size={18} strokeWidth={2} aria-hidden />
            </button>
          </div>
        ) : (
          <button
            onClick={locate}
            disabled={locating}
            className="pressable mt-2 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-line px-4 text-[16px] font-semibold disabled:opacity-60"
          >
            <LocateFixed size={20} strokeWidth={2} aria-hidden />
            {locating ? t("Търсим сигнал от GPS…", "Finding a GPS signal…") : t("Добави точните ми координати", "Add my exact coordinates")}
          </button>
        )}
        {locErr && <p className="pt-2 text-[14px] leading-snug text-ember">{locErr} {t("Може и да опишете мястото по-долу.", "You can also describe the place below.")}</p>}
        <label className="mt-2 block">
          <span className="sr-only">{t("Описание на мястото", "Describe the place")}</span>
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t("Река, село, мост или местност", "River, village, bridge or area")} className={`${field} min-h-12`} />
        </label>
      </div>

      <div className="mt-5">
        <div className="sm:max-w-[50%]">
          <span className="text-[15px] font-semibold">{t("Снимки", "Photos")}</span>
          <label className="pressable mt-2 flex min-h-12 cursor-pointer items-center justify-center gap-2 rounded-2xl bg-line px-4 text-[16px] font-semibold has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
            <Camera size={20} strokeWidth={2} aria-hidden />
            {t("Добави снимки", "Add photos")}
            <input
              type="file"
              accept="image/*"
              multiple
              className="sr-only"
              onChange={(e) => {
                const files = [...(e.target.files ?? [])].slice(0, 6 - photos.length);
                setPhotos((p) => [...p, ...files.map((file) => ({ file, url: URL.createObjectURL(file) }))]);
                e.target.value = "";
              }}
            />
          </label>
        </div>
      </div>
      {photos.length > 0 && (
        <ul className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
          {photos.map((p, i) => (
            <li key={p.url} className="relative">
              {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file */}
              <img src={p.url} alt={t(`Снимка ${i + 1}`, `Photo ${i + 1}`)} className="aspect-square w-full rounded-xl object-cover outline outline-1 -outline-offset-1 outline-black/10" />
              <button
                onClick={() => {
                  URL.revokeObjectURL(p.url);
                  setPhotos((ps) => ps.filter((x) => x !== p));
                }}
                className="absolute right-1 top-1 grid size-8 place-items-center rounded-full bg-black/60 text-white after:absolute after:-inset-1.5"
                aria-label={t(`Махни снимка ${i + 1}`, `Remove photo ${i + 1}`)}
              >
                <X size={16} strokeWidth={2.25} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}

      <label className="mt-5 block">
        <span className="text-[15px] font-semibold">{t("Какво се случва?", "What's happening?")}</span>
        <textarea
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          rows={3}
          placeholder={t("Например: под моста има паднали дървета и клони, водата вече се връща", "For example: fallen trees and branches under the bridge, the water is already backing up")}
          className={`${field} mt-2 py-3 leading-snug`}
        />
      </label>

      <div className="mt-6 rounded-2xl bg-surface p-4">
        <p className="text-[13px] font-medium text-muted">{t("Изпращате до", "Sending to")}</p>
        <button
          onClick={() => setPicking(true)}
          className="pressable hover-fill -mx-3 mt-0.5 flex min-h-11 w-[calc(100%+1.5rem)] items-center justify-between gap-2 rounded-xl px-3 text-left text-[17px] font-semibold"
        >
          <span className="truncate">{lang === "bg" ? rdg.name : rdg.en}</span>
          <ChevronDown size={18} strokeWidth={2} className="shrink-0 text-muted" aria-hidden />
        </button>
        {/* Our own list instead of the system <select>, which looks out of place on Windows and Android. */}
        <Sheet
          open={picking}
          onClose={() => setPicking(false)}
          title={t("Басейнова дирекция", "River basin directorate")}
          description={t("Сигналът отива до дирекцията на басейна, в който е реката.", "The report goes to the directorate of the basin the river is in.")}
        >
          <ul className="-mx-3">
            {DIRECTORATES.map((r) => (
              <li key={r.basin}>
                <button
                  onClick={() => {
                    setChosen(r.basin);
                    setPicking(false);
                  }}
                  className="hover-fill flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 text-left"
                >
                  <span className="min-w-0">
                    <span className="block text-[16px] font-medium">{lang === "bg" ? r.name : r.en}</span>
                    <span className="block text-[13px] text-muted">
                      {r.town}
                      {auto.basin === r.basin ? t(", по най-близката река", ", by the nearest river") : ""}
                    </span>
                  </span>
                  {rdg.basin === r.basin && <Check size={20} strokeWidth={2} className="shrink-0 text-accent" aria-label={t("Избрано", "Selected")} />}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
        <p className="pt-1 text-[13px] leading-snug text-muted">
          {auto.basin === rdg.basin && t("Избрана по най-близката река; басейните следват вододелите, затова проверете. ", "Picked by the nearest river; basins follow watersheds, so check. ")}
          {t(`Зелен телефон ${rdg.phones[0]}. `, `Report line ${rdg.phones[0]}. `)}
          {rdg.email}
        </p>

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            onClick={share}
            disabled={!ready}
            className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-[16px] font-semibold text-accent-content disabled:opacity-50"
          >
            {copied ? <Check size={18} strokeWidth={2.25} aria-hidden /> : <Send size={18} strokeWidth={2} aria-hidden />}
            {copied ? t("Текстът е копиран", "Text copied") : canShareFiles ? t("Изпрати със снимките", "Send with the photos") : t("Изпрати", "Send")}
          </button>
          <button
              onClick={() => {
                window.location.href = `mailto:${rdg.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(compose())}`;
              }}
              disabled={!ready}
              className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line px-4 text-[16px] font-semibold disabled:opacity-50"
            >
              <Mail size={18} strokeWidth={2} aria-hidden />
              {t("Имейл до дирекцията", "Email the directorate")}
            </button>
          <a
            href={`tel:${telOf(rdg.phones[0])}`}
            className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line px-4 text-[16px] font-semibold sm:col-span-2"
          >
            <Phone size={18} strokeWidth={2} aria-hidden />
            {t("Обади се на зеления телефон", "Call the report line")}
          </a>
        </div>
        {!ready && <p className="pt-2 text-[13px] text-muted">{t("Добавете координати или опишете мястото, за да изпратите.", "Add coordinates or describe the place to send it.")}</p>}
        {photos.length > 0 && !canShareFiles && (
          <p className="pt-2 text-[13px] text-muted">
            {t("При имейл прикачете снимките ръчно: браузърът не може да ги добави сам.", "For email, attach the photos yourself: the browser can't add them for you.")}
          </p>
        )}
      </div>
    </section>
  );
}
