// Weather warning types and the oblast matcher, safe to use in the browser (no server imports).

export type Warning = {
  level: 1 | 2 | 3 | 4; // green, yellow, orange, red
  type: string; // e.g. "wind", "high-temperature", "forest-fire"
  event: string;
  headline: string;
  description: string;
  areas: string[];
  onset: string;
  expires: string;
  /** The same warning in English, when MeteoAlarm has it. */
  en?: { event: string; headline: string; description: string };
};

export type WarningsResponse = { warnings: Warning[]; updated: string; backupFrom?: string };

// MeteoAlarm area names may come in Bulgarian or in Latin script.
const LATIN: Record<string, string> = {
  Благоевград: "blagoevgrad", Бургас: "burgas", Варна: "varna", "Велико Търново": "veliko", Видин: "vidin",
  Враца: "vratsa", Габрово: "gabrovo", Добрич: "dobrich", Кърджали: "kardzhali", Кюстендил: "kyustendil",
  Ловеч: "lovech", Монтана: "montana", Пазарджик: "pazardzhik", Перник: "pernik", Плевен: "pleven",
  Пловдив: "plovdiv", Разград: "razgrad", Русе: "ruse", Силистра: "silistra", Сливен: "sliven",
  Смолян: "smolyan", "София град": "sofia", "София област": "sofia", "Стара Загора": "stara zagora",
  Търговище: "targovishte", Хасково: "haskovo", Шумен: "shumen", Ямбол: "yambol",
};

/** Whether a warning covers an oblast (by its Bulgarian name from oblasts.ts). */
export function warningIn(w: Warning, oblast?: string | null) {
  if (!oblast) return false;
  const stem = oblast.replace(/ (град|област)$/, "").toLowerCase();
  const latin = LATIN[oblast] ?? "";
  return w.areas.some((a) => {
    const x = a.toLowerCase();
    return x.includes(stem) || (!!latin && x.includes(latin));
  });
}
