"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, LocateFixed, Mail, Phone, Send, X, ExternalLink, Check, ChevronDown } from "lucide-react";
import { getPosition, useLocation } from "@/lib/client";
import { useI18n } from "@/i18n/client";
import { formatters } from "@/i18n/format";
import { placeName } from "@/i18n/names";
import { nearestRdg, telOf, useRdgs } from "./rdg";
import { Sheet } from "./Sheet";

// What was seen. The report itself is always written in Bulgarian, because it goes to a Bulgarian office.
const KINDS: [string, string][] = [
  ["Сеч без марки или позволително", "Cutting without marks or a permit"],
  ["Извозване на дървесина", "Timber being hauled away"],
  ["Бракониерство", "Poaching"],
  ["Палене на огън", "Someone lighting a fire"],
  ["Отпадъци в гората", "Rubbish in the forest"],
  ["Друго", "Something else"],
];
const bgTime = formatters("bg").time;

type Photo = { file: File; url: string };

/**
 * Prepares a report and hands it to the person's own phone apps (share sheet, e-mail, call).
 * Nothing is sent or stored by ОгнеЩит itself.
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
  const [plate, setPlate] = useState("");
  const [desc, setDesc] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [rdgId, setRdgId] = useState<number | null>(null);
  const [copied, setCopied] = useState(false);
  const rdgs = useRdgs();
  const { loc } = useLocation();

  // Closest directorate to the reported spot, or to the place chosen on the home screen.
  const at = pos ?? loc;
  const auto = useMemo(() => nearestRdg(rdgs, at.lat, at.lon), [rdgs, at.lat, at.lon]);
  const rdg = rdgs?.find((r) => r.id === rdgId) ?? auto;

  // Free the photo previews when the form goes away.
  const photosRef = useRef(photos);
  useEffect(() => {
    photosRef.current = photos;
  }, [photos]);
  useEffect(() => () => photosRef.current.forEach((p) => URL.revokeObjectURL(p.url)), []);

  // Photos shared into the app from the gallery (see the share target in public/sw.js).
  useEffect(() => {
    const sp = new URLSearchParams(window.location.search);
    const n = Number(sp.get("shared") ?? 0);
    const text = sp.get("text");
    if (!n && !text) return;
    (async () => {
      if (text) setDesc(text);
      if (n && "caches" in window) {
        const cache = await caches.open("ogneshtit-shared");
        const files: Photo[] = [];
        for (let i = 0; i < n; i++) {
          const res = await cache.match(`/shared/${i}`);
          if (!res) continue;
          const blob = await res.blob();
          const file = new File([blob], decodeURIComponent(res.headers.get("x-name") ?? `photo-${i}.jpg`), { type: blob.type });
          files.push({ file, url: URL.createObjectURL(file) });
          await cache.delete(`/shared/${i}`);
        }
        setPhotos(files);
      }
      window.history.replaceState(null, "", window.location.pathname);
    })();
  }, []);

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
    plate.trim() && `Превозно средство: ${plate.trim().toUpperCase()}`,
    desc.trim() && `Описание: ${desc.trim()}`,
    photos.length > 0 && `Снимки: ${photos.length}`,
    "",
    lang === "en" ? "Подготвено с ОгнеЩит. Подателят пише на английски." : "Подготвено с ОгнеЩит",
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
          {t("Незаконна сеч или бракониерство?", "Illegal logging or poaching?")}
        </h2>
      </div>
      <p className="pt-2 text-[16px] leading-snug">
        {t(
          "Подгответе сигнала тук и го изпратете до регионалната дирекция по горите с имейл, съобщение или обаждане. ОгнеЩит не изпраща и не пази нищо сам.",
          "Put the report together here and send it to the regional forest directorate by email, message or phone. Fire Shield doesn't send or keep anything itself.",
        )}
      </p>
      {lang === "en" && (
        <p className="pt-2 text-[14px] leading-snug text-muted">
          The directorates work in Bulgarian, so the report is written in Bulgarian for you. Your own description can stay in English.
        </p>
      )}
      <p className="pt-2 text-[14px] font-medium text-ember">{t("Ако сечта или пожарът е в момента, звъннете на 112.", "If the cutting or a fire is happening now, call 112.")}</p>

      <fieldset className="mt-5">
        <legend className="text-[15px] font-semibold">{t("Какво видяхте?", "What did you see?")}</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {KINDS.map((k, i) => (
            <label
              key={k[0]}
              className={`pressable inline-flex min-h-11 cursor-pointer items-center rounded-full border px-3.5 text-[15px] font-medium transition-colors duration-150 has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent ${
                kindIx === i ? "border-content bg-content text-surface" : "border-line hover:bg-line/50"
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
            <button onClick={() => setPos(null)} className="pressable grid size-11 shrink-0 place-items-center rounded-full hover:bg-line" aria-label={t("Махни координатите", "Remove the coordinates")}>
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
          <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t("Село, път или местност", "Village, road or area")} className={`${field} min-h-12`} />
        </label>
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="text-[15px] font-semibold">{t("Номер на превозно средство", "Vehicle number plate")}</span>
          <input
            value={plate}
            onChange={(e) => setPlate(e.target.value)}
            placeholder={t("Ако има", "If there is one")}
            autoCapitalize="characters"
            autoComplete="off"
            className={`${field} mt-2 min-h-12 uppercase placeholder:normal-case`}
          />
        </label>
        <div>
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
          placeholder={t("Например: режат дъбове без боядисани марки, около 10 дървета, има трактор", "For example: they're cutting oaks with no painted marks, about 10 trees, there's a tractor")}
          className={`${field} mt-2 py-3 leading-snug`}
        />
      </label>

      <div className="mt-6 rounded-2xl bg-surface p-4">
        <p className="text-[13px] font-medium text-muted">{t("Изпращате до", "Sending to")}</p>
        {rdgs ? (
          <button
            onClick={() => setPicking(true)}
            className="pressable -mx-2 mt-0.5 flex min-h-11 w-[calc(100%+1rem)] items-center justify-between gap-2 rounded-xl px-2 text-left text-[17px] font-semibold hover:bg-line/50"
          >
            <span className="truncate">{rdg ? placeName(rdg.name, lang) : t("Изберете регионална дирекция", "Choose a regional directorate")}</span>
            <ChevronDown size={18} strokeWidth={2} className="shrink-0 text-muted" aria-hidden />
          </button>
        ) : (
          <div className="skeleton mt-1 h-8 rounded-lg" />
        )}
        {/* Our own list instead of the system <select>, which looks out of place on Windows and Android. */}
        <Sheet
          open={picking}
          onClose={() => setPicking(false)}
          title={t("Регионална дирекция по горите", "Regional forest directorate")}
          description={t("Сигналът отива до дирекцията, в чийто район е мястото.", "The report goes to the directorate whose area the place is in.")}
        >
          <ul className="-mx-2">
            {rdgs?.map((r) => (
              <li key={r.id}>
                <button
                  onClick={() => {
                    setRdgId(r.id);
                    setPicking(false);
                  }}
                  className="flex min-h-12 w-full items-center justify-between gap-3 rounded-xl px-3 text-left hover:bg-line/50 active:bg-line"
                >
                  <span className="min-w-0">
                    <span className="block text-[16px] font-medium">{placeName(r.name, lang)}</span>
                    {auto?.id === r.id && <span className="block text-[13px] text-muted">{t("Най-близката", "The closest")}</span>}
                  </span>
                  {rdg?.id === r.id && <Check size={20} strokeWidth={2} className="shrink-0 text-accent" aria-label={t("Избрано", "Selected")} />}
                </button>
              </li>
            ))}
          </ul>
        </Sheet>
        {rdg && (
          <p className="pt-1 text-[13px] text-muted">
            {auto?.id === rdg.id
              ? pos
                ? t("Най-близката до мястото на сигнала. ", "The closest to the place you're reporting. ")
                : t(`Най-близката до ${loc.source === "gps" ? "вас" : loc.label}. `, `The closest to ${loc.source === "gps" ? "you" : placeName(loc.label, "en")}. `)
              : ""}
            {rdg.phone && <>{t(`Телефон ${rdg.phone} в работно време. `, `Phone ${rdg.phone} in office hours. `)}</>}
            {rdg.email}
          </p>
        )}

        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          <button
            onClick={share}
            disabled={!ready}
            className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-accent px-4 text-[16px] font-semibold text-accent-content disabled:opacity-50"
          >
            {copied ? <Check size={18} strokeWidth={2.25} aria-hidden /> : <Send size={18} strokeWidth={2} aria-hidden />}
            {copied ? t("Текстът е копиран", "Text copied") : canShareFiles ? t("Изпрати със снимките", "Send with the photos") : t("Изпрати", "Send")}
          </button>
          {rdg?.email && (
            <button
              onClick={() => {
                window.location.href = `mailto:${rdg.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(compose())}`;
              }}
              disabled={!ready}
              className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line px-4 text-[16px] font-semibold disabled:opacity-50"
            >
              <Mail size={18} strokeWidth={2} aria-hidden />
              {t(`Имейл до ${rdg.name}`, `Email ${placeName(rdg.name, "en")}`)}
            </button>
          )}
          {rdg?.phone && (
            <a
              href={`tel:${telOf(rdg.phone)}`}
              className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl bg-line px-4 text-[16px] font-semibold"
            >
              <Phone size={18} strokeWidth={2} aria-hidden />
              {t(`Обади се в ${rdg.name}`, `Call ${placeName(rdg.name, "en")}`)}
            </a>
          )}
          <a
            href="https://app.gorata.bg/new-report"
            target="_blank"
            rel="noreferrer"
            onClick={() => ready && copy()}
            className="pressable flex min-h-12 items-center justify-center gap-2 rounded-2xl px-4 text-[15px] font-medium text-accent"
          >
            {t("Подай в „Защити гората“", "Report in Zashtiti Gorata")}
            <ExternalLink size={16} strokeWidth={2} aria-hidden />
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
