// Forest fires in Bulgaria by year: number of fires and affected forest territory (ha).
// Source: Изпълнителна агенция по горите (ИАГ), as tabulated in WWF Bulgaria,
// "Анализ на ситуацията с горските пожари в България, 2025 г." (summary).
// Note: ИАГ counts forest territory only. EFFIS counts all burnt land from satellite
// (fires > 30 ha), so EFFIS totals are higher — e.g. ~45,000 ha for 2024.
export const HISTORY_SOURCE = "ИАГ, по данни в анализ на WWF България (2025)";

export const HISTORY: { year: number; fires: number; ha: number }[] = [
  { year: 2010, fires: 222, ha: 6526 },
  { year: 2011, fires: 635, ha: 6882.6 },
  { year: 2012, fires: 876, ha: 12729.8 },
  { year: 2013, fires: 408, ha: 3313.9 },
  { year: 2014, fires: 151, ha: 916 },
  { year: 2015, fires: 429, ha: 4312.8 },
  { year: 2016, fires: 584, ha: 6338.9 },
  { year: 2017, fires: 513, ha: 4569.4 },
  { year: 2018, fires: 222, ha: 1453 },
  { year: 2019, fires: 668, ha: 5619.6 },
  { year: 2020, fires: 499, ha: 5257.9 },
  { year: 2021, fires: 349, ha: 3143.4 },
  { year: 2022, fires: 516, ha: 8126 },
  { year: 2023, fires: 448, ha: 6388.3 },
  { year: 2024, fires: 595, ha: 17116.4 },
];
