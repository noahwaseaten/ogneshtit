import { cacheLife } from "next/cache";
import { RDG_SEATS } from "@/data/rdg";

// Public registers of the Executive Forest Agency (Изпълнителна агенция по горите, iag.bg).
// The site's own pages call these endpoints; we call them server-side and cache the answers.
const IAG = "https://www.iag.bg";
const UA = { "user-agent": "OgneShtit/1.0 (+https://github.com/noahwaseaten/ogneshtit)" };

const strip = (html: string) =>
  html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&ndash;|&mdash;/g, "-")
    .replace(/&amp;/g, "&")
    .replace(/\s+/g, " ")
    .trim();
const num = (s: string) => Number(strip(s).replace(/\s/g, "").replace(",", ".")) || 0;

// ---------------------------------------------------------------------------------------------
// Forest fires by oblast (iag.bg/fires): count, burnt area in decares, causes, vegetation, owner.

export type Share = { label: string; value: number };
export type RegionFires = { name: string; fires: number; dka: number; crownDka: number };
export type FireStats = {
  year: number;
  from: string;
  to: string;
  total: { fires: number; dka: number; crownDka: number };
  regions: RegionFires[];
  causes: Share[]; // number of fires
  vegetation: Share[]; // decares
  ownership: Share[]; // decares
  updated: string;
};

function rows(html: string) {
  return [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/g)].map((m) =>
    [...m[1].matchAll(/<td[^>]*>([\s\S]*?)<\/td>/g)].map((c) => c[1]),
  );
}

function parseFires(html: string) {
  const blocks = html.split('<div class="fires-wrap">').slice(1);
  if (blocks.length === 0) throw new Error("ИАГ: неочакван формат");
  const regions: RegionFires[] = [];
  let total = { fires: 0, dka: 0, crownDka: 0 };
  for (const r of rows(blocks[0])) {
    if (r.length < 6) continue;
    const row = { name: strip(r[1]), fires: num(r[2]), dka: num(r[3]), crownDka: num(r[5]) };
    if (/всичко/i.test(row.name)) total = { fires: row.fires, dka: row.dka, crownDka: row.crownDka };
    else regions.push(row);
  }
  const shares: Record<string, Share[]> = {};
  for (const b of blocks.slice(1)) {
    const title = strip(b.match(/<th[^>]*fires-hdr[^>]*>([\s\S]*?)<\/th>/)?.[1] ?? "").toLowerCase();
    shares[title] = rows(b)
      .filter((r) => r.length >= 3 && !/всичко/i.test(strip(r[1])))
      .map((r) => ({ label: strip(r[1]), value: num(r[2]) }));
  }
  const pick = (word: string) => Object.entries(shares).find(([k]) => k.includes(word))?.[1] ?? [];
  return { regions, total, causes: pick("причини"), vegetation: pick("растителност"), ownership: pick("собственост") };
}

const sofiaToday = () => new Intl.DateTimeFormat("en-CA", { timeZone: "Europe/Sofia" }).format(new Date());

async function fetchFires(from: string, to: string) {
  const res = await fetch(`${IAG}/fires/lang/1/index`, {
    method: "POST",
    headers: { ...UA, "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ ajax: "1", FromDate: from, ToDate: to }).toString(),
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(`ИАГ ${res.status}`);
  return parseFires(await res.text());
}

/** Stats for one year up to `to`. Past years are final, so they are cached for weeks. */
async function getFireRange(year: number, to: string, current: boolean): Promise<FireStats> {
  "use cache";
  cacheLife(current ? { stale: 1800, revalidate: 21600, expire: 172800 } : { stale: 86400, revalidate: 2592000, expire: 31536000 });
  const from = `${year}-01-01`;
  const s = await fetchFires(from, to);
  return { year, from, to, ...s, updated: new Date().toISOString() };
}

/** One calendar year; the current one runs up to today. */
export function getFireYear(year: number, today: string) {
  const current = today.startsWith(String(year));
  return getFireRange(year, current ? today : `${year}-12-31`, current);
}

export const FIRST_YEAR = 2007;

export async function getFireStats(year: number) {
  return getFireYear(year, sofiaToday());
}

export type FireHistory = {
  years: { year: number; fires: number; dka: number; partial: boolean }[];
  /** Burnt decares per oblast, aligned with `years`. */
  regions: Record<string, number[]>;
  updated: string;
};

export async function getFireHistory(): Promise<FireHistory> {
  const today = sofiaToday();
  const last = Number(today.slice(0, 4));
  const years = Array.from({ length: last - FIRST_YEAR + 1 }, (_, i) => FIRST_YEAR + i);
  const all = (await Promise.all(years.map((y) => getFireYear(y, today).catch(() => null)))).filter((s): s is FireStats => !!s);
  if (all.length === 0) throw new Error("ИАГ: няма данни");
  const regions: Record<string, number[]> = {};
  all.forEach((s, i) => {
    for (const r of s.regions) (regions[r.name] ??= Array(all.length).fill(0))[i] = r.dka;
  });
  return {
    years: all.map((s) => ({ year: s.year, fires: s.total.fires, dka: s.total.dka, partial: s.year === last })),
    regions,
    updated: new Date().toISOString(),
  };
}

// ---------------------------------------------------------------------------------------------
// Timber transport tickets (iag.bg/tickets). A ticket is valid for 12 hours and one trip.

const LOOKALIKE: Record<string, string> = {
  А: "A", В: "B", Е: "E", К: "K", М: "M", Н: "H", О: "O", Р: "P", С: "C", Т: "T", У: "Y", Х: "X",
};
/** Bulgarian plates use only letters that look the same in Cyrillic and Latin, so compare in Latin. */
export const normPlate = (s: string) =>
  s
    .toUpperCase()
    .replace(/[АВЕКМНОРСТУХ]/g, (c) => LOOKALIKE[c] ?? c)
    .replace(/[^A-Z0-9]/g, "");

const VALID_MS = 12 * 3600 * 1000;

/** "2026-10-25 11:08:57" in Sofia local time → epoch ms. */
function sofiaMs(local: string) {
  const guess = Date.parse(local.replace(" ", "T") + "Z");
  const at = new Date(guess);
  const asSofia = Date.parse(at.toLocaleString("en-US", { timeZone: "Europe/Sofia" }) + " UTC");
  const asUtc = Date.parse(at.toLocaleString("en-US", { timeZone: "UTC" }) + " UTC");
  return guess - (asSofia - asUtc);
}

type RawTicket = {
  id: number;
  type: string;
  offline_code: string;
  device_code: string;
  podelenie: string;
  sql_date: string;
  vehicle_plates_number: string;
  trailer_plates_number: string;
  cubage: string;
};

export type TicketSummary = {
  id: number;
  type: string;
  number: string;
  issued: string; // ISO UTC
  unit: string; // forestry unit that issued it
  m3: number;
  vehicle: string;
  trailer: string;
  validNow: boolean;
};
export type PlateResult = { plate: string; tickets: TicketSummary[] };
export type TicketSearch = { query: string; plates: PlateResult[]; capped: boolean; checked: string };

async function searchBy(by: 2 | 3, text: string): Promise<{ records: RawTicket[]; count: number }> {
  "use cache";
  cacheLife({ stale: 60, revalidate: 120, expire: 600 });
  const url = new URL(`${IAG}/e_tickets/search`);
  url.search = new URLSearchParams({ session: "000", user_id: "1", search_by: String(by), search_text: text, lng: "bg" }).toString();
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(25000) });
  if (!res.ok) throw new Error(`ИАГ ${res.status}`);
  const data = (await res.json()) as { records?: RawTicket[]; records_count?: number };
  return { records: data.records ?? [], count: data.records_count ?? 0 };
}

export async function searchTickets(input: string): Promise<TicketSearch> {
  const q = normPlate(input);
  // The register matches on digits ("for a plate, the digits are enough"), so we send those and
  // filter by the full plate ourselves, ignoring Cyrillic/Latin differences.
  const digits = q.replace(/\D/g, "");
  const text = digits.length >= 2 ? digits : q;
  // Trailer search is a bonus: if it fails, the vehicle search alone still answers.
  const [vehR, trlR] = await Promise.allSettled([searchBy(2, text), searchBy(3, text)]);
  if (vehR.status === "rejected") throw vehR.reason;
  if (trlR.status === "rejected") console.error("ИАГ trailer search failed", trlR.reason);
  const veh = vehR.value;
  const trl = trlR.status === "fulfilled" ? trlR.value : { records: [], count: 0 };
  const now = Date.now();
  const byPlate = new Map<string, Map<number, TicketSummary>>();
  const add = (plate: string, r: RawTicket) => {
    const p = normPlate(plate);
    if (!p || !p.includes(q)) return;
    const issued = sofiaMs(r.sql_date);
    const t: TicketSummary = {
      id: r.id,
      type: r.type,
      number: `${r.offline_code}-${r.device_code}`,
      issued: new Date(issued).toISOString(),
      unit: r.podelenie,
      m3: Number(r.cubage) || 0,
      vehicle: normPlate(r.vehicle_plates_number),
      trailer: normPlate(r.trailer_plates_number),
      validNow: now - issued >= -600000 && now - issued <= VALID_MS,
    };
    if (!byPlate.has(p)) byPlate.set(p, new Map());
    byPlate.get(p)!.set(r.id, t);
  };
  for (const r of veh.records) add(r.vehicle_plates_number, r);
  for (const r of trl.records) add(r.trailer_plates_number, r);
  const plates = [...byPlate.entries()]
    .map(([plate, m]) => ({ plate, tickets: [...m.values()].sort((a, b) => b.issued.localeCompare(a.issued)) }))
    .sort((a, b) => Number(b.plate === q) - Number(a.plate === q) || b.tickets[0].issued.localeCompare(a.tickets[0].issued));
  return {
    query: q,
    plates,
    capped: veh.records.length >= 100 || trl.records.length >= 100,
    checked: new Date().toISOString(),
  };
}

export type TicketDetail = {
  number: string;
  issued: string;
  unit: string;
  document: string;
  from: string;
  to: string;
  export: string;
  issuedAt: { lat: number; lon: number } | null;
  wood: { species: string; kind: string; count: number; m3: number }[];
  totalM3: number;
  photos: string[];
};

type RawDetail = {
  status_code?: number;
  offline_code: string;
  device_code: string;
  date: string;
  time: string;
  podelenie: string;
  document_type: string;
  harvested_from: string;
  wood_warehouse: string;
  woodplot: string;
  destination: string;
  country: string;
  gps_lat: string | null;
  gps_lon: string | null;
  records: { category: string; assortiment: string; wood_specie: string; count: number; cubage: number }[];
  images: { image: string }[];
};

/** Ticket details without people's names or phone numbers: only what helps compare with the load. */
export async function getTicket(type: string, id: string): Promise<TicketDetail> {
  "use cache";
  cacheLife({ stale: 600, revalidate: 3600, expire: 86400 });
  const url = new URL(`${IAG}/e_tickets/get`);
  url.search = new URLSearchParams({ session: "000", user_id: "0", type, ticket_id: id, lng: "bg", digest: "xxxn" }).toString();
  const res = await fetch(url, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`ИАГ ${res.status}`);
  const d = (await res.json()) as RawDetail;
  if (!d.offline_code) throw new Error("Няма такъв билет");
  const [dd, mm, yyyy] = d.date.split(".");
  const wood = (d.records ?? []).map((r) => {
    // Sawn timber ("Фасонирана") lists the total volume; logs and firewood list it per piece.
    const m3 = r.category === "Фасонирана" ? r.cubage : r.cubage * (r.count || 1);
    return { species: r.wood_specie, kind: [r.category, r.assortiment].filter(Boolean).join(", "), count: r.count, m3: Math.round(m3 * 1000) / 1000 };
  });
  const lat = Number(d.gps_lat);
  const lon = Number(d.gps_lon);
  return {
    number: `${d.offline_code}-${d.device_code}`,
    issued: new Date(sofiaMs(`${yyyy}-${mm}-${dd} ${d.time}`)).toISOString(),
    unit: d.podelenie,
    document: (d.document_type ?? "").trim(),
    from: [d.harvested_from, d.woodplot, d.wood_warehouse].map((s) => (s ?? "").trim()).filter(Boolean).join(" · "),
    to: (d.destination ?? "").trim(),
    export: (d.country ?? "").trim().length > 1 ? d.country.trim() : "",
    issuedAt: lat && lon ? { lat, lon } : null,
    wood,
    totalM3: Math.round(wood.reduce((s, w) => s + w.m3, 0) * 1000) / 1000,
    photos: (d.images ?? []).map((i) => i.image).filter((u) => /^https:\/\/[a-z0-9.-]+\.iag\.bg\//.test(u)),
  };
}

// ---------------------------------------------------------------------------------------------
// Regional forest directorates (РДГ): who takes reports about illegal logging in each area.

export type Rdg = (typeof RDG_SEATS)[number] & { phone: string; email: string; site: string };

async function getRdgContact(id: number) {
  "use cache";
  cacheLife({ stale: 86400, revalidate: 604800, expire: 2592000 });
  const res = await fetch(`${IAG}/struct/lang/1/type/R/id/${id}/unit_single`, { headers: UA, signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`ИАГ ${res.status}`);
  const html = await res.text();
  const contact = html.slice(html.indexOf("Контакт със звеното"));
  const phone = strip(contact.match(/Телефон<\/strong>:\s*([^<]+)/)?.[1] ?? "");
  const email = contact.match(/mailto:([^"]+)"/)?.[1] ?? "";
  const site = contact.match(/Интернет страница<\/strong>:\s*<a href="([^"]+)"/)?.[1] ?? "";
  return { phone, email, site };
}

export async function getRdgs(): Promise<Rdg[]> {
  return Promise.all(
    RDG_SEATS.map(async (s) => {
      const c = await getRdgContact(s.id).catch(() => ({ phone: "", email: "", site: "" }));
      return { ...s, ...c };
    }),
  );
}
