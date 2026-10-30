<p align="center">
  <img src="https://shield.noahwaseaten.com/app-icon/192" width="88" height="88" alt="" />
</p>

<h1 align="center">Щит</h1>

<p align="center">
  Безплатни приложения за опасностите в България: <strong>ВъздухоЩит</strong> за смога, <strong>ВодоЩит</strong>
  за наводненията и <strong>ОгнеЩит</strong> за горските пожари. Всяко работи самостоятелно и се инсталира отделно.
</p>

<p align="center">
  <a href="https://shield.noahwaseaten.com"><strong>shield.noahwaseaten.com</strong></a>
  ·
  <a href="https://air.noahwaseaten.com">air.noahwaseaten.com</a>
  ·
  <a href="https://fire.noahwaseaten.com">fire.noahwaseaten.com</a>
  ·
  <a href="https://flood.noahwaseaten.com">flood.noahwaseaten.com</a>
  ·
  <a href="https://github.com/noahwaseaten/ogneshtit/actions/workflows/ci.yml"><img src="https://github.com/noahwaseaten/ogneshtit/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  ·
  <a href="LICENSE">MIT</a>
</p>

---

## Приложенията

| | Адрес | Какво прави |
| --- | --- | --- |
| **Щит** | [shield.noahwaseaten.com](https://shield.noahwaseaten.com) | Начална страница: днешната оценка на двете приложения за вашето място, като първо е това, чийто сезон е сега. |
| **ВъздухоЩит** | [air.noahwaseaten.com](https://air.noahwaseaten.com) | Въздухът сега за всяко място (граждански датчици наоколо или прогнозата на CAMS), нивата и съветите на Европейския индекс за качество на въздуха за всички или за деца, възрастни и хора с астма, кога въздухът е най-чист и най-мръсен до 48 часа, карта на датчиците, градовете от най-мръсния до най-чистия и какво да направите. |
| **ОгнеЩит** | [fire.noahwaseaten.com](https://fire.noahwaseaten.com) | Опасност от горски пожар по канадския индекс FWI (шестте нива на EFFIS), огън от спътниците на NASA, пожарите по области от 2007 г. (ИАГ), проверка на камиони с дървесина и сигнали за незаконна сеч. |
| **ВодоЩит** | [flood.noahwaseaten.com](https://flood.noahwaseaten.com) | Опасност от наводнение днес и до 15 дни за всяко място по прогнозата на GloFAS, дъжд, сняг и топене, предупреждения на НИМХ, измерените нива на Дунав, какво да правите преди, по време и след наводнение и сигнали до басейновите дирекции. |

Защо въздух за зимата: България има най-високата в ЕС смъртност, свързана с фините прахови частици (158 на 100 000
души, [Euronews по данни на EEA](https://www.euronews.com/2025/01/20/which-countries-have-the-deadliest-air-pollution-in-europe)),
а главният им източник у нас е отоплението в домовете ([EEA](https://www.eea.europa.eu/en/europe-environment-2025/countries/bulgaria/health-impacts-of-air-pollution)).
Смогът се вижда всеки зимен ден и всеки има полза да знае кога да излезе и кога да проветри.

Защо и наводнения: по данните на GloFAS за 1984 до 2025 г. в 40-те точки извън Дунав реките носят най-много вода от
март до юни, когато се топи снегът, а най-високата вода на годината е идвала във всеки сезон, включително през
декември и февруари. Затова зимата е времето да се следят реките, дъждът и снегът.

Всички приложения работят на всеки телефон като уеб приложения (добавят се на началния екран), имат известия при
опасност и показват последните данни без интернет.

## Как ВодоЩит преценява опасността

1. **Реките.** `apps/flood/scripts/gauges.ts` избира 47 точки по главните реки (Дунав, Искър, Марица, Струма, Места,
   Тунджа, Арда, Янтра, Осъм, Вит, Огоста, Камчия и др.). За всяка взима дневното водно количество на GloFAS от 1984 до
   2025 г. и смята водата, която реката има средно веднъж на 2, 5 и 20 години (разпределение на Гъмбел по най-високата
   вода на всяка година), и обичайното за всеки месец.
2. **Прогнозата.** Всеки ден GloFAS (Copernicus) смята 51 варианта на следващите 15 дни. Ден стига ниво, когато повече
   от 30% от вариантите минат прага: същото правило, по което ECMWF оцветява точките на GloFAS.
3. **Мястото.** За вашето място се взима най-рисковата от точките до 25 км. Малки потоци моделът не вижда, затова до
   оценката стоят дъждът, снегът и официалните предупреждения.

`npm test -w @shtit/flood` проверява сметките (Гъмбел, правилото 30%, четенето на страниците на АППД) и всяка точка:
праговете са подредени, а надолу по реката водата расте.

## Данни

| Данни | Източник | Приложение |
| --- | --- | --- |
| Прогноза за въздуха | [CAMS](https://atmosphere.copernicus.eu) (Copernicus) чрез [Open-Meteo Air Quality API](https://open-meteo.com/en/docs/air-quality-api) | ВъздухоЩит |
| Измерен въздух | Граждански датчици на [sensor.community](https://sensor.community) | ВъздухоЩит |
| Нива и съвети за здравето | [Европейски индекс за качество на въздуха](https://airindex.eea.europa.eu/AQI/index.html) (EEA) | ВъздухоЩит |
| Прогноза и история на реките | [GloFAS v4](https://global-flood.emergency.copernicus.eu) (Copernicus) чрез [Open-Meteo Flood API](https://open-meteo.com/en/docs/flood-api) | ВодоЩит |
| Измерени нива на Дунав и прогноза | [ИА „Проучване и поддържане на река Дунав“](https://www.appd-bg.org/hidrology) | ВодоЩит |
| Време, дъжд, сняг, въздух, търсене на места | [Open-Meteo](https://open-meteo.com) | и двете |
| Предупреждения за времето | НИМХ чрез [MeteoAlarm](https://meteoalarm.org) | и двете |
| Какво да правим при наводнение | [ГДПБЗН, МВР](https://mvr.bg/gdpbzn/info-center/pravila-povedenie/pri-navodnenia) | ВодоЩит |
| Басейнови дирекции | сайтовете на [Дунавски](https://www.bd-dunav.bg), [Черноморски](https://www.bsbd.bg), [Източнобеломорски](https://earbd.bg) и [Западнобеломорски](https://wabd.bg) район | ВодоЩит |
| Огнища от спътник | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov), VIIRS и MODIS | ОгнеЩит |
| Пожари по области, превозни билети, РДГ | [Изпълнителна агенция по горите](https://www.iag.bg) | ОгнеЩит |
| Скала за пожарна опасност | [EFFIS](https://forest-fire.emergency.copernicus.eu) | ОгнеЩит |
| Граници, реки на картата | [Natural Earth](https://www.naturalearthdata.com) | и двете |

---

## English

Щит ("Shield") is a family of free web apps about dangers in Bulgaria, built for a school project.
**Air Shield** (ВъздухоЩит) shows the air now from citizen sensors nearby or the CAMS forecast, rated on the EEA's
European Air Quality Index with its health advice, plus the cleanest hours to go out and a city ranking.
**Fire Shield** (ОгнеЩит) rates today's forest fire danger with the Canadian Fire Weather Index, shows NASA FIRMS
hotspots, official fire statistics, timber truck checks and illegal logging reports. **Flood Shield** (ВодоЩит) rates
flood danger from the GloFAS ensemble against each river's own 2-, 5- and 20-year flows, adds rain, snow and melt,
official warnings and measured Danube levels, explains what to do in a flood and prepares reports to the river basin
directorates. **The hub** shows both for one place. Nothing personal is stored on the server.

### Repository

```
apps/air       ВъздухоЩит (Vercel project "vazduhoshtit", root directory apps/air)
apps/fire      ОгнеЩит   (Vercel project "ogneshtit", root directory apps/fire)
apps/flood     ВодоЩит   (Vercel project "vodoshtit", root directory apps/flood)
apps/hub       Щит hub   (Vercel project "shtit", root directory apps/hub)
packages/core  shared: shell, sheets, map, language, theme, emblem, alerts flow, backups, warnings, oblast data
```

npm workspaces; each app is a Next.js 16 app that imports `@shtit/core/...` (TypeScript source, compiled by the app).

### Run it

```bash
npm install
npm run dev:fire     # http://localhost:3000
npm run dev:flood    # http://localhost:3002
npm run dev:hub      # http://localhost:3003
npm run dev:air      # http://localhost:3004
```

| Script (root) | What it does |
| --- | --- |
| `npm run typecheck` / `lint` / `test` / `build` | Every workspace, as CI does |
| `npm run gauges -w @shtit/flood` | Rebuilds the river points and their thresholds (slow: about 1,000 Open-Meteo calls per point, cached in `scripts/.cache`) |
| `npm run rivers -w @shtit/flood` | Rebuilds the river lines for the map from Natural Earth |
| `npm run map -w @shtit/core` | Rebuilds the oblast shapes |
| `npm run orbits -w @shtit/fire` | Refreshes the saved satellite orbits |

Stack: Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Vaul sheets, Lucide icons, Onest.
Deployed on Vercel; every push to `main` goes to production.

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).

Щит is not an official source. In an emergency, call 112.
