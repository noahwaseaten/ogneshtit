<p align="center">
  <img src="https://ogneshtit.noahwaseaten.com/app-icon/192" width="88" height="88" alt="" />
</p>

<h1 align="center">ОгнеЩит</h1>

<p align="center">
  Опасност от горски пожар днес, огнища от спътник, пожарите по области,<br />
  проверка на камиони с дървесина и сигнали за незаконна сеч. За всеки в България.
</p>

<p align="center">
  <a href="https://ogneshtit.noahwaseaten.com"><strong>ogneshtit.noahwaseaten.com</strong></a>
  ·
  <a href="https://github.com/noahwaseaten/ogneshtit/actions/workflows/ci.yml"><img src="https://github.com/noahwaseaten/ogneshtit/actions/workflows/ci.yml/badge.svg" alt="CI" /></a>
  ·
  <a href="LICENSE">MIT</a>
</p>

---

## Какво прави

| Екран | Какво има |
| --- | --- |
| **Днес** | Опасност от пожар за мястото ви по канадския индекс FWI (същите 6 нива като EFFIS), прогноза за 5 дни, качество на въздуха, предупреждения на НИМХ и огнищата, засечени от спътниците на NASA през последните 48 часа, на карта и в списък. |
| **Пожари** | Горските пожари по области за всяка година от 2007 г. насам по данни на ИАГ: брой, изгоряла площ, причини, вид гора, собственост и сравнение по години. |
| **Помогни** | 112 с точните ви координати, проверка на превозния билет на камион с дървесина директно в регистъра на ИАГ и подготвен сигнал за незаконна сеч до най-близката регионална дирекция по горите. |
| **Още** | Светла, тъмна или автоматична тема, източници на данните и какво (не) пазим. |

Работи на всеки телефон като уеб приложение (може да се добави на началния екран) и без интернет показва последните данни и екрана с 112.

## Данни

| Данни | Източник | Ключ |
| --- | --- | --- |
| Време, въздух, търсене на места | [Open-Meteo](https://open-meteo.com) | не |
| Огнища от спътник | [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov), VIIRS | `FIRMS_MAP_KEY` (без него: отворените 24-часови файлове) |
| Пожари по области, превозни билети, РДГ | [Изпълнителна агенция по горите](https://www.iag.bg) | не |
| Предупреждения за времето | НИМХ чрез [MeteoAlarm](https://meteoalarm.org) | не |
| Нива на опасност | [EFFIS](https://forest-fire.emergency.copernicus.eu) | не |
| Граници на областите | [Natural Earth](https://www.naturalearthdata.com) | не |

## Как се смята опасността

`src/lib/fwi.ts` следва Van Wagner (1987). Подаваме му времето по обяд за последните 45 дни от Open-Meteo, за да се установят влажностите на горивата, и класираме днешния FWI по шестте нива на EFFIS. `npm run test:fwi` проверява кода срещу публикуваните контролни стойности на Van Wagner и Pickett.

---

## English

ОгнеЩит ("fire shield") is a mobile-first web app about forest fires in Bulgaria, built for a school project on forest protection. It computes today's Canadian Fire Weather Index for any place in Bulgaria, shows NASA FIRMS hotspots, charts official forest fire statistics per oblast from the Executive Forest Agency (ИАГ), checks timber transport tickets against ИАГ's public register, and prepares illegal logging reports for the nearest regional forest directorate. Nothing personal is stored on the server.

### Run it

```bash
npm install
cp .env.example .env.local   # optional: add a free NASA FIRMS map key
npm run dev
```

| Script | What it does |
| --- | --- |
| `npm run dev` / `build` / `start` | Next.js |
| `npm run typecheck` / `lint` | TypeScript and ESLint |
| `npm run test:fwi` | FWI against published reference values |
| `npm run map` | Regenerates `src/data/oblasts.ts` from `scripts/data/bg-oblasts.geojson` |

Stack: Next.js 16 (App Router, Cache Components), React 19, Tailwind CSS 4, Vaul sheets, Lucide icons, Onest for display type. Deployed on Vercel; every push to `main` goes to production.

### Contributing

See [CONTRIBUTING.md](CONTRIBUTING.md). Security reports: [SECURITY.md](SECURITY.md).

ОгнеЩит is not an official source. In an emergency, call 112.
