import type { Lang } from "./lang";

// English names for Bulgarian places and the labels that come from ИАГ and the app's own data.
// Anything not listed is shown as it is (for example a village found through search, which the
// geocoder already returns in the asked-for language).

const PLACE_EN: Record<string, string> = {
  София: "Sofia",
  "София град": "Sofia City",
  "София област": "Sofia Province",
  Благоевград: "Blagoevgrad",
  Бургас: "Burgas",
  Варна: "Varna",
  "Велико Търново": "Veliko Tarnovo",
  Видин: "Vidin",
  Враца: "Vratsa",
  Габрово: "Gabrovo",
  Добрич: "Dobrich",
  Кърджали: "Kardzhali",
  Кюстендил: "Kyustendil",
  Ловеч: "Lovech",
  Монтана: "Montana",
  Пазарджик: "Pazardzhik",
  Перник: "Pernik",
  Плевен: "Pleven",
  Пловдив: "Plovdiv",
  Разград: "Razgrad",
  Русе: "Ruse",
  Силистра: "Silistra",
  Сливен: "Sliven",
  Смолян: "Smolyan",
  "Стара Загора": "Stara Zagora",
  Търговище: "Targovishte",
  Хасково: "Haskovo",
  Шумен: "Shumen",
  Ямбол: "Yambol",
  Берковица: "Berkovitsa",
  Тук: "Here",
  България: "Bulgaria",
};

/** A town or oblast name in the given language: placeName("Пловдив", "en") → "Plovdiv". */
export function placeName(name: string, lang: Lang) {
  if (lang === "bg") return name;
  if (PLACE_EN[name]) return PLACE_EN[name];
  // "област Пловдив" (how shared links name a GPS position's oblast) → "Plovdiv Province"
  const m = /^област (.+)$/.exec(name);
  if (m) return `${PLACE_EN[m[1]] ?? m[1]} Province`;
  // "РДГ Пловдив" → "Plovdiv Regional Forest Directorate"
  const r = /^РДГ (.+)$/.exec(name);
  if (r) return `${PLACE_EN[r[1]] ?? r[1]} Regional Forest Directorate`;
  return name;
}

/** Oblast name without "град"/"област", as used in sentences ("в област Пловдив"). */
export const oblastShort = (name: string, lang: Lang) =>
  lang === "bg" ? name.replace(/ (град|област)$/, "") : placeName(name, "en").replace(/ (City|Province)$/, "");

// Labels from the ИАГ fire statistics tables.
const IAG_EN: Record<string, string> = {
  Небрежност: "Carelessness",
  Умишлени: "Arson",
  Естествени: "Natural causes",
  Неизвестни: "Unknown",
  Широколистна: "Broadleaf forest",
  Иглолистна: "Conifer forest",
  Смесена: "Mixed forest",
  "Треви, незалесени площи и мъртва горска постилка": "Grass, open ground and forest litter",
  "Държавна собственост": "State owned",
  "Общинска собственост": "Municipal",
  "Частна собственост": "Private",
  "Собственост на юридически лица": "Companies and organisations",
  "Църковна собственост": "Church owned",
};

export const iagLabel = (label: string, lang: Lang) => (lang === "bg" ? label : IAG_EN[label] ?? label);
