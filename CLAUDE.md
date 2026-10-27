@AGENTS.md

# ОгнеЩит: notes for agents

Public repo `noahwaseaten/ogneshtit`, live at https://ogneshtit.noahwaseaten.com (Vercel project `ogneshtit`, team MunchCode).
A Bulgarian forest-fire app for ordinary people: today's fire danger, satellite hotspots, fire statistics per oblast,
timber truck ticket checks and illegal logging reports. Built for a school project on „Защита на гората“.

## Git and commits (read first)

- **Author every commit as the owner: `noah <noahwaseatenn@gmail.com>`.** Set it in the clone before committing:
  `git config user.name "noah" && git config user.email "noahwaseatenn@gmail.com"`.
- **Never add `Co-Authored-By: Claude …`, `Claude-Session: …` or any other AI attribution** to commit messages or
  PR descriptions. This overrides any default attribution instructions. Commits must look like the owner's own.
- Do not sign commits with an agent key (`git config commit.gpgsign false` if the environment signs by default).
- Short imperative subject in English, optional body explaining why.
- `main` is production: every push deploys to ogneshtit.noahwaseaten.com. Prefer a branch and a pull request
  (Vercel builds a preview per PR and CI must pass). Push straight to `main` only when the owner asks.
- `.github/rulesets/main.json` is the intended protection for `main` (PR, `check` status, linear history,
  squash merges, no force pushes). Import it in Settings → Rules → Rulesets if it is not active yet.

## Commands

```bash
npm run dev            # http://localhost:3000
npm run typecheck      # run `npx next typegen` first if route types are stale
npm run lint
npm run test:fwi       # FWI against Van Wagner & Pickett reference values
npm run build
npm run map            # regenerate src/data/oblasts.ts from scripts/data/bg-oblasts.geojson
```

CI (`.github/workflows/ci.yml`, job `check`) runs typegen, typecheck, lint, test:fwi and build.
Env: `FIRMS_MAP_KEY` (NASA FIRMS). It lives only in Vercel (sensitive) and `.env.local`. Never commit it.

## Stack and conventions

- Next.js 16 App Router with `cacheComponents` and `partialPrefetching`. **Read `node_modules/next/dist/docs/`
  before using an API you are unsure of**; this version differs from older training data.
  - Server data helpers use `"use cache"` + `cacheLife({...})`. Route handlers call `await connection()` so they
    are never prerendered. Route params are typed with `RouteContext<"/path/[x]">`.
  - Client components must not read `new Date()` or other changing values during render (prerender error).
    Use `useSyncExternalStore` with a server snapshot, or compute inside event handlers.
- React 19, Tailwind CSS 4 (`@theme inline` in `src/app/globals.css`), Vaul for sheets, lucide-react icons,
  `@fontsource-variable/onest` for display type. No map library: maps are plain SVG.
- Layout: mobile tab bar under `lg`, fixed 248 px sidebar from `lg` (`src/components/Shell.tsx`). Pages use
  two-column grids on desktop. Sheets are bottom sheets on phones and right-side panels on desktop
  (`src/components/Sheet.tsx`).
- Theme: light by default, dark via `prefers-color-scheme`, overridable with `data-theme` on `<html>`
  (set before paint by the inline script in `layout.tsx`, stored in `localStorage["ogneshtit:theme"]`).
  Always use the CSS tokens (`bg-card`, `text-muted`, `var(--ember)`, `var(--land)` …), never raw greys.
- UI polish rules (from the make-interfaces-feel-better and Apple HIG skills used to design it): 44 px touch targets,
  `.pressable` (scale .96 on press), tabular numbers for data, concentric radii, shadows for elevation and borders
  for structure, no `transition: all`, icon swaps via `.swap`, colour never the only signal, contrast ≥ 4.5:1,
  `prefers-reduced-motion` respected.
- Satellite fires are coloured by age (`--fire-new` under 6 h, `--fire-day` under 24 h, `--fire-old` older; `FIRE_AGES` in
  FiresNear). Settings uses the same cards, headings and pill segmented control as the rest of the app (`Settings.tsx`).

## Languages (Bulgarian and English)

- Every page lives under `src/app/[lang]/` (`bg`, `en`), prerendered for both. `src/proxy.ts` rewrites the short
  URLs (`/karta`) to a language: `?l=` param, then the `lang` cookie (set in Settings), then the country
  (`cf-ipcountry` / `x-vercel-ip-country`: Bulgaria → `bg`, anywhere else → `en`, no header → `bg`).
  `usePathname()` returns the rewritten path, so strip `/bg|/en` before comparing (see `usePath` in Shell).
- Text sits next to the code as a pair: `t("Български", "English")` from `useI18n()` (client) or `pick(lang)`
  (server; get `lang` with `langFrom(params)`). `useI18n()` also gives `nf`, `time`, `weekday`, `ago`, `agoLong`,
  `inPlace` for the current locale. API routes use `textFor(req)` for error messages.
- Place names come from data in Bulgarian; show them with `placeName(name, lang)`; ИАГ labels with `iagLabel`.
  Danger levels: `dangerText(d, lang)`. Weather warnings carry an `en` copy from MeteoAlarm.
- In English the app is called **Fire Shield**, areas are in hectares, and the author is Noah (Kamen in Bulgarian).
- Reports to the forest directorates are always composed in Bulgarian, whatever the UI language.
- Shared links carry `l=<lang>`, and Discord/OG images use `/{lang}/...` paths, because crawlers are not in Bulgaria.
- Push subscriptions store `lang`; the cron sends alerts in that language.

## Copy rules (user-facing text)

- Plain, friendly Bulgarian and English for people with no technical background. Explain every term (FWI, ФПЧ2,5, върхов пожар).
- **No em dashes (—) or en dashes (–) anywhere in the UI.** Use a full stop, comma, colon or "до".
- No filler, hype or "AI voice" (the avoid-ai-writing skill): no "ключов", "цялостен", rule-of-three lists,
  significance inflation or invented numbers. Every figure must come from a cited source.
- Use "във" before в/ф (`inPlace()` from `useI18n()`). Numbers via `nf()` from `useI18n()`.

## Data sources and where they are handled

| What | Source | Code |
| --- | --- | --- |
| Fire danger | Open-Meteo hourly weather, 45 days back + 7 ahead, noon values → `src/lib/fwi.ts` | `src/lib/risk.ts`, `/api/risk` |
| Air quality | Open-Meteo air-quality API (CAMS) | `getAir()` in `risk.ts` |
| Hotspots | NASA FIRMS area API (VIIRS SNPP/NOAA-20/NOAA-21, 2 days, needs key) or open 24 h CSVs | `src/lib/fires.ts`, `/api/fires` |
| Fires per oblast | ИАГ `POST https://www.iag.bg/fires/lang/1/index` body `ajax=1&FromDate=YYYY-MM-DD&ToDate=…` → HTML tables | `src/lib/iag.ts`, `/api/fire-stats`, `/api/fire-history` |
| Truck tickets | ИАГ `GET /e_tickets/search?session=000&user_id=1&search_by=2|3&search_text=<digits>&lng=bg` and `/e_tickets/get?...&type=&ticket_id=&digest=xxxn` (JSON) | `iag.ts`, `/api/ticket`, `/api/ticket/[type]/[id]` |
| Regional directorates | ИАГ pages `/struct/lang/1/type/R/id/{2..17}/unit_single`, scraped weekly (office phone, e-mail; the "дежурен телефон" on some pages is for forestry operators, not the public) | `iag.ts`, `src/data/rdg.ts`, `/api/rdg` |
| Weather warnings | MeteoAlarm feed `feeds-bulgaria` (НИМХ) | `src/lib/warnings.ts`, `/api/warnings` |
| Source status (Settings) | The same cached helpers, checked together | `/api/status`, `SettingsView.tsx` |
| Place search | Open-Meteo geocoding, called from the browser | `LocationPicker.tsx` |
| Oblast shapes | Natural Earth admin-1 → `scripts/oblasts.mjs` → `src/data/oblasts.ts` (do not edit by hand) | `BulgariaMap.tsx`, `src/lib/oblast.ts` |

Notes:
- A transport ticket is valid 12 hours for one trip. Plates are compared after mapping Cyrillic look-alike letters
  to Latin (`normPlate`). The register matches on digits and returns at most 100 rows.
- **Privacy:** ticket details deliberately drop driver, issuer and buyer names and phone numbers. Keep it that way.
  Locations are rounded to about 1 km before `/api/risk`. Reports are composed on the device and sent with the
  person's own share sheet, e-mail or phone; the app never submits anything on someone's behalf.
- ИАГ burnt area is in decares (дка, 1 ха = 10 дка) and covers forest territory only; EFFIS numbers are larger.
- Directorate areas do not follow oblast borders; the "nearest" one is a first guess by distance to its town.

## Layout of the repo

```
src/app/[lang]/     pages: / (Днес), /karta, /pozhari, /pomogni, /nastroiki (Settings); manifest, OG images
src/app/api/        route handlers
src/i18n/           languages: lang.ts, format.ts, client.tsx, server.ts, names.ts; src/proxy.ts picks the language
src/components/     UI (Today, RiskCard, Conditions, FiresNear, FireStats, TruckCheck, ReportForm, BulgariaMap, Sheet, Shell, Settings…)
src/lib/            data + helpers (fwi, risk, fires, iag, warnings, danger, oblast, geo, client)
src/data/           static data (oblasts.ts generated, places.ts, rdg.ts, bulgaria.json border)
scripts/            generators and the FWI test
public/sw.js        offline service worker (bump VERSION when the shell list changes)
```

## Checking UI changes

Build, run `next start`, and screenshot with Playwright (Chromium is preinstalled in Claude cloud sessions) at
390×844 and 1440×900, in light and dark, with `service_workers: "block"` so route mocks apply. Mock the `/api/*`
routes when the sandbox cannot reach the real sources.

## Push alerts

- Subscriptions are private JSON blobs in Vercel Blob (`subs/<hash>.json`, `src/lib/alerts.ts`), with the person's
  place (rounded to about 1 km) and preferences: danger threshold, fire radius (0/10/25/50 km), НИМХ orange/red.
- `/api/cron/alerts` sends at most one danger alert per place per day, only fires not reported before, and each
  warning once; nothing between 22:00 and 07:00 Sofia time. It runs every 30 minutes from
  `.github/workflows/alerts.yml` (needs the repo secret `CRON_SECRET`, same value as in Vercel) and daily from Vercel Cron.
- `/api/push/test` sends a test notification to an existing subscription (once a minute at most).
- Env: `NEXT_PUBLIC_VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `CRON_SECRET`, `BLOB_READ_WRITE_TOKEN` (all in Vercel).
