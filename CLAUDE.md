@AGENTS.md

# Щит (ВъздухоЩит, ВодоЩит, ОгнеЩит and the hub): notes for agents

Public repo `noahwaseaten/ogneshtit`, a monorepo with four Next.js apps for ordinary people in Bulgaria (team MunchCode):

| App | Folder | Vercel project | Address |
| --- | --- | --- | --- |
| ВъздухоЩит / Air Shield: the air now and by the hour, winter smog, sensors, cities | `apps/air` | `vazduhoshtit` | https://air.noahwaseaten.com |
| ОгнеЩит / Fire Shield: fire danger, satellite hotspots, fire statistics, truck checks, logging reports | `apps/fire` | `ogneshtit` | https://fire.noahwaseaten.com (was ogneshtit.noahwaseaten.com) |
| ВодоЩит / Flood Shield: river flood danger (GloFAS), rain and snow, warnings, Danube levels, river reports | `apps/flood` | `vodoshtit` | https://flood.noahwaseaten.com |
| Щит / Shield hub: every app's answer for one place, the season's app first | `apps/hub` | `shtit` | https://shield.noahwaseaten.com |

Shared code is `packages/core` (`@shtit/core`, TypeScript source imported as `@shtit/core/<path>`). Started as a school
project on „Защита на гората“.

## Git and commits (read first)

- **Author every commit as the owner: `noah <noahwaseatenn@gmail.com>`.** Set it in the clone before committing:
  `git config user.name "noah" && git config user.email "noahwaseatenn@gmail.com"`.
- **Never add `Co-Authored-By: Claude …`, `Claude-Session: …` or any other AI attribution** to commit messages or
  PR descriptions. This overrides any default attribution instructions. Commits must look like the owner's own.
- Do not sign commits with an agent key (`git config commit.gpgsign false` if the environment signs by default).
- Short imperative subject in English, optional body explaining why.
- `main` is production: every push deploys all three apps. Prefer a branch and a pull request
  (Vercel builds a preview per app per PR and CI must pass). Push straight to `main` only when the owner asks.
- `.github/rulesets/main.json` is the intended protection for `main` (PR, `check` status, linear history,
  squash merges, no force pushes). Import it in Settings → Rules → Rulesets if it is not active yet.

## Commands

```bash
npm install                        # at the root (npm workspaces)
npm run dev:fire | dev:flood | dev:hub | dev:air   # ports 3000, 3002, 3003, 3004
npm run typegen && npm run typecheck     # every workspace
npm run lint
npm test                           # fire: FWI, fires, passes; flood: stats, 30% rule, АППД parsers, river points
npm run build
npm run test:fwi -w @shtit/fire    # one app's scripts with -w
npm run gauges -w @shtit/flood     # rebuild src/data/gauges.ts (slow, see below)
npm run rivers -w @shtit/flood     # rebuild src/data/rivers.ts from Natural Earth
npm run map -w @shtit/core         # rebuild packages/core/src/data/oblasts.ts
npm run orbits -w @shtit/fire
```

CI (`.github/workflows/ci.yml`, job `check`) runs typegen, typecheck, lint, test and build for every workspace.
Env: `FIRMS_MAP_KEY` (fire only), `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN`
(fire, flood and air, each project its own Blob store and VAPID keys). Never commit them.

## Monorepo rules

- Anything two apps need lives in `packages/core`: shell (`ui/Shell.tsx`, `AppShell` takes the app's nav), sheets,
  settings blocks, map (`ui/BulgariaMap.tsx`, the app passes `markers` and optional `layers`), location picker,
  alerts card (`ui/AlertsCard.tsx`, the app passes its `controls`), push store (`alerts.ts`), backups, warnings,
  i18n, document/metadata/manifest helpers (`document.tsx`), proxy, emblem and brand config (`brand.ts`).
- Files in `packages/core` import each other with relative paths (no `@/`). Apps import `@shtit/core/<path>` (tsconfig
  `paths`) and their own code with `@/`.
- Client components must not import server modules (`next/cache`, `@vercel/blob`, `web-push`). Client-safe halves
  exist for that: `warning-types.ts` (not `warnings.ts`), `alert-prefs.ts` (not `alerts.ts`), `flood-types.ts`.
- Satori (share images, icons) allows only plain elements inside `<svg>`: no components or fragments.
- Brand: `BRANDS` in `packages/core/src/brand.ts` (names, URLs, colours). URLs can be overridden at build time with
  `NEXT_PUBLIC_URL_FIRE|FLOOD|HUB`. Each app has its own colour tokens in `src/app/globals.css` plus `--mark` (the
  emblem centre); the shared rules are in `packages/core/src/styles/base.css`.
- Device storage keys start with `shtit:` (`STORE` in `client.ts`); the old `ogneshtit:` keys are still read.
- Each tool app serves `/api/summary?lat=&lon=&l=` (`AppSummary` in `summary.ts`) for the hub, with `Access-Control-Allow-Origin: *`.

## Domains and the move from ogneshtit.noahwaseaten.com

DNS for noahwaseaten.com is on Cloudflare (not Vercel), so each subdomain needs a CNAME there to `cname.vercel-dns.com`.
`MOVED_FROM=ogneshtit.noahwaseaten.com` in the fire project turns on a 308 redirect from the old address
(`movedRedirect` in `packages/core/src/proxy.ts`); `/sw.js`, `/api/*` and `/app-icon/*` stay on the old host so
installed apps keep their alerts. Set it only once fire.noahwaseaten.com answers.

## Stack and conventions

- Next.js 16 App Router with `cacheComponents` and `partialPrefetching`. **Read `node_modules/next/dist/docs/`
  before using an API you are unsure of**; this version differs from older training data.
  - Server data helpers use `"use cache"` + `cacheLife({...})`. Route handlers call `await connection()` so they
    are never prerendered. Route params are typed with `RouteContext<"/path/[x]">`.
  - Client components must not read `new Date()` or other changing values during render (prerender error).
    Use `useSyncExternalStore` with a server snapshot, or compute inside event handlers.
- React 19, Tailwind CSS 4 (`@theme inline` in `src/app/globals.css`), Vaul for sheets, lucide-react icons,
  `@fontsource-variable/onest` for display type. No map library: maps are plain SVG.
- Layout: mobile tab bar under `lg`, fixed 248 px sidebar from `lg` (`packages/core/src/ui/Shell.tsx`). Pages use
  two-column grids on desktop. Sheets are bottom sheets on phones and right-side panels on desktop
  (`packages/core/src/ui/Sheet.tsx`). The sidebar and the top bar's grid button link to the other Щит apps.
- Theme: light by default, dark via `prefers-color-scheme`, overridable with `data-theme` on `<html>`
  (set before paint by `THEME_SCRIPT` in `packages/core/src/client.ts`, stored in `localStorage["shtit:theme"]`).
  Always use the CSS tokens (`bg-card`, `text-muted`, `var(--ember)`, `var(--land)` …), never raw greys.
- UI polish rules (from the make-interfaces-feel-better and Apple HIG skills used to design it): 44 px touch targets,
  `.pressable` (scale .96 on press), tabular numbers for data, concentric radii, shadows for elevation and borders
  for structure, no `transition: all`, icon swaps via `.swap`, colour never the only signal, contrast ≥ 4.5:1,
  `prefers-reduced-motion` respected.
- Hover and press: always the `hover-fill` class (globals.css), never ad-hoc `hover:bg-*`. Rows in a grouped card are
  edge to edge (`px-4`, no radius) and the card has `overflow-hidden`; rows in a sheet use `-mx-3 px-3 rounded-xl`.
- Satellite fires are drawn by `FireMark.tsx` everywhere, with two rules only: bigger and redder = more heat (FRP,
  `--heat-1..4`, `HEAT` in FiresNear); pale = not current (`isCurrent` false). Groups are a pill with the count. Strong
  current fires flicker; motion is decoration only (transform/opacity, off with reduced motion). Settings uses the same cards, headings and pill segmented control as the rest of the app (`Settings.tsx`).

## Languages (Bulgarian and English)

- Every page lives under `src/app/[lang]/` (`bg`, `en`), prerendered for both. Each app's `src/proxy.ts` calls
  `langRewrite` from core, which rewrites the short
  URLs (`/karta`) to a language: `?l=` param, then the `lang` cookie (set in Settings), then the country
  (`cf-ipcountry` / `x-vercel-ip-country`: Bulgaria → `bg`, anywhere else → `en`, no header → `bg`).
  `usePathname()` returns the rewritten path, so strip `/bg|/en` before comparing (see `usePath` in Shell).
- Text sits next to the code as a pair: `t("Български", "English")` from `useI18n()` (client) or `pick(lang)`
  (server; get `lang` with `langFrom(params)`). `useI18n()` also gives `nf`, `time`, `weekday`, `ago`, `agoLong`,
  `inPlace` for the current locale. API routes use `textFor(req)` for error messages.
- Place names come from data in Bulgarian; show them with `placeName(name, lang)`; ИАГ labels with `iagLabel`.
  Danger levels: `dangerText(d, lang)`. Weather warnings carry an `en` copy from MeteoAlarm.
- In English the apps are **Fire Shield**, **Flood Shield** and **Shield**, areas are in hectares, and the author is
  Noah (Kamen in Bulgarian).
- Reports to the forest and river basin directorates are always composed in Bulgarian, whatever the UI language.
- Shared links carry `l=<lang>`, and Discord/OG images use `/{lang}/...` paths, because crawlers are not in Bulgaria.
- Push subscriptions store `lang`; the cron sends alerts in that language.

## Copy rules (user-facing text)

- Plain, friendly Bulgarian and English for people with no technical background. Explain every term (FWI, ФПЧ2,5, върхов пожар).
- **No em dashes (—) or en dashes (–) anywhere in the UI.** Use a full stop, comma, colon or "до".
- No filler, hype or "AI voice" (the avoid-ai-writing skill): no "ключов", "цялостен", rule-of-three lists,
  significance inflation or invented numbers. Every figure must come from a cited source.
- Use "във" before в/ф (`inPlace()` from `useI18n()`). Numbers via `nf()` from `useI18n()`.

## Data sources and where they are handled (ОгнеЩит, `apps/fire`)

| What | Source | Code |
| --- | --- | --- |
| Fire danger | Open-Meteo hourly weather, 45 days back + 7 ahead, noon values → `src/lib/fwi.ts`. Fallback: MET Norway forecast carried forward from the saved FWI codes of the nearest oblast (`approx: "met-no"`) | `src/lib/risk.ts`, `/api/risk`, `/api/danger-map` |
| Air quality | Open-Meteo air-quality API (CAMS) | `getAir()` in `risk.ts` |
| Satellite fires | NASA FIRMS area API, 5 feeds (VIIRS SNPP/NOAA-20/NOAA-21 + MODIS), 2 days over the Balkans; days 3 to 12 for permanent sources. Fallback: FIRMS public 24 h files, then the Blob copy. Pixels → fires in `buildFires` (see the comment at the top of fires.ts) | `src/lib/fires.ts`, `src/lib/fire-types.ts`, `/api/fires` |
| Satellite passes | Orbit elements from CelesTrak (`gp.php?CATNR=…&FORMAT=json`, 5 NORAD ids), SGP4 via `satellite.js`: when Bulgaria is inside each satellite's scan (VIIRS 56.3°, MODIS 55°). Elements: CelesTrak → Blob copy → `src/data/orbits.ts`; satellites with elements older than 21 days are left out. Passes over 45° to the side are not "sharp"; FIRMS data arrives up to ~3 h after a pass | `src/lib/passes.ts`, `src/lib/pass-types.ts`, `/api/passes`, `Satellites.tsx` |
| Fires per oblast | ИАГ `POST https://www.iag.bg/fires/lang/1/index` body `ajax=1&FromDate=YYYY-MM-DD&ToDate=…` → HTML tables | `src/lib/iag.ts`, `/api/fire-stats`, `/api/fire-history` |
| Truck tickets | ИАГ `GET /e_tickets/search?session=000&user_id=1&search_by=2|3&search_text=<digits>&lng=bg` and `/e_tickets/get?...&type=&ticket_id=&digest=xxxn` (JSON) | `iag.ts`, `/api/ticket`, `/api/ticket/[type]/[id]` |
| Regional directorates | ИАГ pages `/struct/lang/1/type/R/id/{2..17}/unit_single`, scraped weekly (office phone, e-mail; the "дежурен телефон" on some pages is for forestry operators, not the public) | `iag.ts`, `src/data/rdg.ts`, `/api/rdg` |
| Weather warnings | MeteoAlarm feed `feeds-bulgaria` (НИМХ) | `src/lib/warnings.ts`, `/api/warnings` |
| Source status (Settings) | The same cached helpers, checked together | `/api/status`, `SettingsView.tsx` |
| Place search | Open-Meteo geocoding from the browser; fallback Photon (OSM), then the built-in oblast capitals | `LocationPicker.tsx` |
| Saved copies | Every source above, saved to Vercel Blob (`backups/*.json`) at most every 6 h by `/api/cron/backup`; read only when the live source fails, and always shown with its date | `src/lib/backup.ts` |
| Oblast shapes | Natural Earth admin-1 → `scripts/oblasts.mjs` → `src/data/oblasts.ts` (do not edit by hand) | `BulgariaMap.tsx`, `src/lib/oblast.ts` |

Notes:
- Never show raw FIRMS pixels. One fire seen by three satellites is one fire; weak single pixels and permanent heat
  (smelters, power plants, e.g. Pirdop) are hidden by default and never trigger alerts. EFFIS's WFS hotspot layers
  stopped updating in 2021, so they are not a fallback; Overpass is not reachable from Vercel.
- A transport ticket is valid 12 hours for one trip. Plates are compared after mapping Cyrillic look-alike letters
  to Latin (`normPlate`). The register matches on digits and returns at most 100 rows.
- **Privacy:** ticket details deliberately drop driver, issuer and buyer names and phone numbers. Keep it that way.
  Locations are rounded to about 1 km before `/api/risk`. Reports are composed on the device and sent with the
  person's own share sheet, e-mail or phone; the app never submits anything on someone's behalf.
- ИАГ burnt area is in decares (дка, 1 ха = 10 дка) and covers forest territory only; EFFIS numbers are larger.
- Directorate areas do not follow oblast borders; the "nearest" one is a first guess by distance to its town.

## ВодоЩит (`apps/flood`)

| What | Source | Code |
| --- | --- | --- |
| River points and thresholds | GloFAS v4 daily discharge 1984 to last year (Open-Meteo Flood API). 47 points; for each, the cell with the most water among the 5 × 5 (or 3 × 3) around the town; Gumbel fit of yearly peaks → q2/q5/q20; monthly median and p90 | `scripts/gauges.ts` → `src/data/gauges.ts`, `src/lib/stats.ts` |
| River forecast | GloFAS ensemble (51 runs, 15 days, `ensemble=true`) + past 30 days, all points in one batched request, every 6 h | `src/lib/floods.ts`, `src/lib/summarize.ts`, `/api/gauges`, `/api/gauges/[id]` |
| Danger rule | A day reaches a level when more than 30% of runs pass its threshold (ECMWF's GloFAS reporting-point rule); "moderate" = over the month's p90 | `src/lib/flood-types.ts` |
| A place | The riskiest river point within 25 km + Open-Meteo rain, snow and snow depth | `getPlace` in `floods.ts`, `/api/place` |
| Danube measured | АППД `https://www.appd-bg.org/hidrology` and `/forecasts` (HTML tables; levels in cm from each station's zero) | `src/lib/danube.ts`, `/api/danube` |
| Warnings | MeteoAlarm (core), flood-related types first: flooding, rain-flood, rain, snow-ice, coastalevent, thunderstorm | `Conditions.tsx`, `MapView.tsx` |
| Basin directorates | Contacts from their own sites (checked 30 Oct 2026) | `src/data/basins.ts` |
| Flood advice | ГДПБЗН page, paraphrased and linked | `src/app/[lang]/pomogni/page.tsx` |
| River lines | Natural Earth 10m rivers | `scripts/rivers.mjs` → `src/data/rivers.ts` |

Notes:
- Open-Meteo's free API counts 40 years for one place as about 1,000 calls (5,000/hour, 10,000/day). That is why
  thresholds exist only for the fixed points and are generated once; `scripts/.cache` keeps the answers (not committed).
  Never add a live long-history lookup.
- GloFAS values are a model, not gauge readings; the UI says so. Do not invent rain thresholds: amounts are shown as
  they are and НИМХ warnings carry the judgement.
- Alerts (`/api/cron/alerts`): river level within 3 days, once per rise (`sent.river` = highest level announced);
  orange/red flood-related warnings once each; quiet 22:00 to 07:00.

## ВъздухоЩит (`apps/air`)

Why it exists: winter smog is Bulgaria's deadliest winter danger (highest PM2.5 death rate in the EU, mostly from home
heating, per the EEA) and something people check daily. Answers: how is the air now, is it OK for my child or my asthma,
when should I go out or air the room.

| What | Source | Code |
| --- | --- | --- |
| Scale and advice | EEA European Air Quality Index, current hourly bands for PM2.5 and PM10; the place takes the worse band; EEA advice for everyone and for sensitive people | `src/lib/air-types.ts` |
| Forecast | CAMS Europe via Open-Meteo (`domains=cams_europe`), hourly PM2.5/PM10, 1 day back and 3 ahead; one batched request for the 27 oblast centres | `src/lib/air.ts`, `/api/place`, `/api/cities` |
| Measured | sensor.community `airrohr/v1/filter/country=BG` (5-minute values, UTC), outdoor only, last 30 min, sane values; a place uses the median within 3 km (≥3 sensors) else 8 km | `getLiveSensors`, `sensorsNear`, `/api/sensors` |
| Planner | Cleanest and dirtiest 3 daytime hours (07 to 22) ahead, tomorrow if today is over | `windows()` in `air-types.ts` |
| Reports | Waste burning: municipality ecology department or РИОСВ via МОСВ's green phone page (linked, no invented fines) | `src/app/[lang]/pomogni/page.tsx` |

Notes: ИАОС's own site has a broken TLS chain and OpenAQ needs a key, so official stations come in only through CAMS.
Low-cost sensors read high in fog; the UI says so and shows the forecast next to them. Forecast hours are local Sofia
strings: read HH:MM from them (`hhmm`), never add a fixed offset. Alerts: one per morning (07:00 to 10:00) at most.

## Layout of the repo

```
apps/fire/      ОгнеЩит: src/app/[lang]/ (/, /karta, /pozhari, /pomogni, /nastroiki), src/app/api, src/lib, src/components
apps/flood/     ВодоЩит: src/app/[lang]/ (/, /karta, /reki, /pomogni, /pomogni/signal, /nastroiki, /s), src/lib, scripts
apps/air/       ВъздухоЩит: src/app/[lang]/ (/, /karta, /gradove, /pomogni, /nastroiki, /s), src/lib, scripts
apps/hub/       Щит: one page (src/components/Hub.tsx), no API, no service worker
packages/core/  shared code (src/ui, src/i18n, src/data, src/styles), oblast generators in scripts/, fonts in assets/
apps/*/public/sw.js   offline service worker per app (bump VERSION when its shell list changes)
```

## Checking UI changes

Build the app, run `next start` in its folder, and screenshot with Playwright (Chromium is preinstalled in Claude cloud sessions) at
390×844 and 1440×900, in light and dark, with `service_workers: "block"` so route mocks apply. Mock the `/api/*`
routes when the sandbox cannot reach the real sources.

## Push alerts

- Subscriptions are private JSON blobs in Vercel Blob (`subs/<hash>.json`, `src/lib/alerts.ts`), with the person's
  place (rounded to about 1 km) and preferences: danger threshold, fire radius (0/10/25/50 km), НИМХ orange/red.
- `/api/cron/alerts` sends at most one danger alert per place per day, only fires not reported before, and each
  warning once; nothing between 22:00 and 07:00 Sofia time. It runs every 30 minutes from
  `.github/workflows/alerts.yml` (one repo secret `CRON_SECRET`, the same value as `CRON_SECRET` in all three Vercel
  projects; a missing or wrong secret shows as a warning, never a failed run) and daily from Vercel Cron.
- `/api/push/test` sends a test notification to an existing subscription (once a minute at most).
- Env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN` (all in Vercel).
