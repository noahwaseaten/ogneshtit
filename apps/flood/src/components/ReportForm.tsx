"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Camera, Check, ChevronRight, Construction, Fence, Hammer, LocateFixed, Mail, MoreHorizontal, Phone, Send, Shovel, Trash2, TreePine, X } from "lucide-react";
import { getPosition, useLocation } from "@shtit/core/client";
import { useI18n } from "@shtit/core/i18n/client";
import { formatters } from "@shtit/core/i18n/format";
import { distanceKm } from "@shtit/core/geo";
import { ChoiceList } from "@shtit/core/ui/ChoiceList";
import { Sheet } from "@shtit/core/ui/Sheet";
import { DIRECTORATES, directorateFor, type Directorate } from "@/data/basins";
import { GAUGES } from "@/data/gauges";
import { BASINS } from "@/lib/flood-types";

// What was seen. Short titles on screen; the report itself is always written in Bulgarian (`report`), because it goes
// to a Bulgarian office. These are the things the basin directorates ask people to report.
const KINDS = [
  { value: "blocked", Icon: TreePine, bg: "Запушено корито", en: "Blocked river bed", report: "Запушено речно корито (клони, дървета, отпадъци)" },
  { value: "rubbish", Icon: Trash2, bg: "Отпадъци в реката", en: "Rubbish in the river", report: "Изхвърляне на отпадъци в реката" },
  { value: "digging", Icon: Shovel, bg: "Изкопан пясък или чакъл", en: "Sand or gravel dug out", report: "Изземване на пясък и чакъл" },
  { value: "bank", Icon: Fence, bg: "Подкопан бряг или дига", en: "Damaged bank or dike", report: "Подкопан бряг или повредена дига" },
  { value: "building", Icon: Hammer, bg: "Строеж в коритото", en: "Building in the river bed", report: "Строеж или насип в коритото" },
  { value: "other", Icon: MoreHorizontal, bg: "Друго", en: "Something else", report: "Друго" },
] as const;
type Kind = (typeof KINDS)[number]["value"];

const bgTime = formatters("bg").time;
type Photo = { file: File; url: string };

/** A first guess at the directorate: the basin of the nearest river point (basins follow watersheds, so it can be wrong
 *  near a ridge; the person can pick another). */
function nearestDirectorate(lat: number, lon: number): Directorate {
  const g = [...GAUGES].sort((a, b) => distanceKm(lat, lon, a.lat, a.lon) - distanceKm(lat, lon, b.lat, b.lon))[0];
  return directorateFor(g?.basin ?? "dunav");
}
const telOf = (p: string) => p.replace(/\s/g, "");

/** A titled block of the form: a small heading, then its content on a card. */
function Step({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-2">
      <h2 className="px-1 text-[15px] font-semibold text-muted">{title}</h2>
      {children}
    </section>
  );
}

/**
 * Prepares a report and hands it to the person's own phone apps (share sheet, e-mail, call).
 * Nothing is sent or stored by ВодоЩит itself.
 */
export function ReportForm() {
  const { t, lang } = useI18n();
  const { loc } = useLocation();
  const [kind, setKind] = useState<Kind>("blocked");
  const [pos, setPos] = useState<{ lat: number; lon: number; acc: number } | null>(null);
  const [locating, setLocating] = useState(false);
  const [locErr, setLocErr] = useState<string | null>(null);
  const [place, setPlace] = useState("");
  const [desc, setDesc] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [chosen, setChosen] = useState<Directorate["basin"] | null>(null);
  const [picking, setPicking] = useState(false);
  const [copied, setCopied] = useState(false);

  const at = pos ?? loc;
  const auto = useMemo(() => nearestDirectorate(at.lat, at.lon), [at.lat, at.lon]);
  const rdg = chosen ? directorateFor(chosen) : auto;
  const k = KINDS.find((x) => x.value === kind)!;

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
  const compose = () =>
    [
      `Сигнал: ${k.report}`,
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
  const subject = `Сигнал: ${k.report.toLowerCase()}${place.trim() ? `, ${place.trim()}` : ""}`;
  const ready = !!pos || place.trim().length > 2;
  const canShareFiles = typeof navigator !== "undefined" && "canShare" in navigator && photos.length > 0 && navigator.canShare({ files: photos.map((p) => p.file) });

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(compose());
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {}
  };
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

  const field = "w-full rounded-2xl border border-line bg-surface px-4 text-[16px] outline-none placeholder:text-muted focus:border-accent";
  const basinName = (d: Directorate) => (lang === "bg" ? BASINS[d.basin].bg : BASINS[d.basin].en);

  return (
    <div className="flex flex-col gap-6">
      <header className="flex flex-col gap-1 px-1">
        <h1 className="font-display text-[30px] font-bold leading-tight tracking-[-0.01em]">{t("Сигнал за река", "Report a river problem")}</h1>
        <p className="text-[16px] leading-snug text-muted">
          {t("Отива до басейновата дирекция от вашия телефон. Ние не пазим нищо.", "It goes to the river basin directorate from your own phone. We keep nothing.")}
        </p>
      </header>

      <a href="tel:112" className="pressable flex min-h-12 items-center gap-3 rounded-2xl bg-[#c7361f] px-4 text-white">
        <Phone size={20} strokeWidth={2.25} aria-hidden />
        <span className="flex-1 text-[15px] font-semibold">{t("Водата се качва? Звъннете на 112", "Water rising? Call 112")}</span>
        <ChevronRight size={18} strokeWidth={2} aria-hidden />
      </a>

      <Step title={t("Какво видяхте?", "What did you see?")}>
        <ChoiceList onCard={false} label={t("Какво видяхте?", "What did you see?")} value={kind} onChange={setKind} options={KINDS.map((x) => ({ value: x.value, title: t(x.bg, x.en), Icon: x.Icon }))} />
      </Step>

      <Step title={t("Къде?", "Where?")}>
        <div className="flex flex-col gap-2 rounded-2xl bg-card p-3">
          {pos ? (
            <div className="flex items-center gap-3 rounded-xl bg-surface py-2 pl-3.5 pr-1">
              <LocateFixed size={18} strokeWidth={2} className="shrink-0 text-accent" aria-hidden />
              <div className="min-w-0 flex-1">
                <p className="text-[16px] font-semibold tabular-nums">
                  {pos.lat.toFixed(5)}, {pos.lon.toFixed(5)}
                </p>
                <p className="text-[13px] text-muted tabular-nums">{t(`Точност около ${Math.round(pos.acc)} м`, `Accurate to about ${Math.round(pos.acc)} m`)}</p>
              </div>
              <button onClick={() => setPos(null)} className="pressable hover-fill grid size-11 shrink-0 place-items-center rounded-full" aria-label={t("Махни координатите", "Remove the coordinates")}>
                <X size={18} strokeWidth={2} aria-hidden />
              </button>
            </div>
          ) : (
            <button onClick={locate} disabled={locating} className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-tonal px-4 text-[16px] font-semibold disabled:opacity-60">
              <LocateFixed size={20} strokeWidth={2} aria-hidden />
              {locating ? t("Търсим GPS…", "Finding GPS…") : t("Добави точните ми координати", "Add my exact location")}
            </button>
          )}
          {locErr && <p className="px-1 text-[14px] leading-snug text-ember">{locErr}</p>}
          <label className="block">
            <span className="sr-only">{t("Описание на мястото", "Describe the place")}</span>
            <input value={place} onChange={(e) => setPlace(e.target.value)} placeholder={t("Или река, село, мост", "Or a river, village, bridge")} className={`${field} min-h-12`} />
          </label>
        </div>
      </Step>

      <Step title={t("Снимки и бележка", "Photos and a note")}>
        <div className="flex flex-col gap-2 rounded-2xl bg-card p-3">
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            <label className="pressable grid size-20 shrink-0 cursor-pointer place-items-center rounded-xl bg-surface text-muted has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-accent">
              <span className="flex flex-col items-center gap-1 text-[12px] font-medium">
                <Camera size={22} strokeWidth={1.75} aria-hidden />
                {t("Снимка", "Photo")}
              </span>
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
            {photos.map((p, i) => (
              <div key={p.url} className="relative size-20 shrink-0">
                {/* eslint-disable-next-line @next/next/no-img-element -- local preview of a picked file */}
                <img src={p.url} alt={t(`Снимка ${i + 1}`, `Photo ${i + 1}`)} className="size-20 rounded-xl object-cover outline outline-1 -outline-offset-1 outline-black/10" />
                <button
                  onClick={() => {
                    URL.revokeObjectURL(p.url);
                    setPhotos((ps) => ps.filter((x) => x !== p));
                  }}
                  className="absolute right-1 top-1 grid size-7 place-items-center rounded-full bg-black/60 text-white after:absolute after:-inset-2"
                  aria-label={t(`Махни снимка ${i + 1}`, `Remove photo ${i + 1}`)}
                >
                  <X size={14} strokeWidth={2.5} aria-hidden />
                </button>
              </div>
            ))}
          </div>
          <label className="block">
            <span className="sr-only">{t("Какво се случва?", "What's happening?")}</span>
            <textarea value={desc} onChange={(e) => setDesc(e.target.value)} rows={3} placeholder={t("Какво се случва? По желание", "What's happening? Optional")} className={`${field} py-3 leading-snug`} />
          </label>
        </div>
      </Step>

      <Step title={t("До кого", "To whom")}>
        <div className="overflow-hidden rounded-2xl bg-card">
          <button onClick={() => setPicking(true)} className="hover-fill flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-left">
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-semibold leading-snug">{t(`Басейнова дирекция, ${basinName(rdg)}`, `Basin directorate, ${basinName(rdg)}`)}</span>
              <span className="block text-[13px] text-muted">{chosen ? rdg.town : t(`${rdg.town} · по най-близката река`, `${rdg.town} · by the nearest river`)}</span>
            </span>
            <span className="text-[14px] font-medium text-accent">{t("Смени", "Change")}</span>
          </button>
          <div className="border-t border-line p-3">
            <button
              onClick={share}
              disabled={!ready}
              className="pressable flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-accent px-4 text-[16px] font-semibold text-accent-content disabled:opacity-45"
            >
              {copied ? <Check size={18} strokeWidth={2.25} aria-hidden /> : <Send size={18} strokeWidth={2} aria-hidden />}
              {copied ? t("Текстът е копиран", "Text copied") : canShareFiles ? t("Изпрати със снимките", "Send with photos") : t("Изпрати", "Send")}
            </button>
            <div className="mt-2 grid grid-cols-2 gap-2">
              <button
                onClick={() => {
                  window.location.href = `mailto:${rdg.email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(compose())}`;
                }}
                disabled={!ready}
                className="pressable flex min-h-12 items-center justify-center gap-2 rounded-xl bg-line px-3 text-[15px] font-semibold disabled:opacity-45"
              >
                <Mail size={18} strokeWidth={2} aria-hidden />
                {t("Имейл", "Email")}
              </button>
              <a href={`tel:${telOf(rdg.phones[0])}`} className="pressable flex min-h-12 items-center justify-center gap-2 rounded-xl bg-line px-3 text-[15px] font-semibold">
                <Phone size={18} strokeWidth={2} aria-hidden />
                {t("Обади се", "Call")}
              </a>
            </div>
            <p className="pt-2 text-center text-[13px] text-muted">
              {!ready ? t("Добавете координати или място, за да изпратите.", "Add a location or a place to send.") : photos.length > 0 && !canShareFiles ? t("При имейл прикачете снимките сами.", "Attach the photos yourself in the email.") : null}
            </p>
          </div>
        </div>
      </Step>

      <Sheet open={picking} onClose={() => setPicking(false)} title={t("Басейнова дирекция", "River basin directorate")} description={t("Тази, в чийто басейн е реката.", "The one whose basin the river is in.")}>
        <ChoiceList
          label={t("Басейнова дирекция", "River basin directorate")}
          value={rdg.basin}
          onChange={(b) => {
            setChosen(b);
            setPicking(false);
          }}
          options={DIRECTORATES.map((d) => ({
            value: d.basin,
            title: basinName(d),
            subtitle: `${d.town}${auto.basin === d.basin ? t(" · по най-близката река", " · by the nearest river") : ""}`,
            Icon: Construction,
          }))}
        />
      </Sheet>
    </div>
  );
}
