# Contributing

Thanks for helping. The apps are for ordinary people in Bulgaria, so clarity matters more than features.

1. Fork, then `npm install` at the repository root.
2. Run the app you are changing: `npm run dev:fire`, `npm run dev:flood` or `npm run dev:hub`.
3. Make one focused change on a branch and open a pull request against `main`.
4. CI must pass: typecheck, lint and tests for every workspace, and a production build of every app.

Guidelines:

- **Shared or not?** Anything two apps need (shell, sheets, map, language, theme, alerts flow) belongs in
  `packages/core`. Anything about one danger stays in its app.
- **Copy** is plain Bulgarian and English. No em or en dashes, no jargon without a short explanation, no filler.
- **Data** must come from a public, citable source. Add it to the app's Settings sources list and to the README.
- **Phones first.** Check about 360 px wide, then a desktop width. Touch targets are at least 44 px.
- **Both themes.** Use the colour tokens in each app's `src/app/globals.css`, never raw greys.
- **Privacy.** Nothing about a person leaves their device unless they press a button that says so.
