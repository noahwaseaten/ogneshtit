# Contributing

Thanks for helping. The app is for ordinary people in Bulgaria, so clarity matters more than features.

1. Fork, then `npm install` and `npm run dev`.
2. Make one focused change on a branch and open a pull request against `main`.
3. CI must pass: typecheck, lint, the FWI reference test and a production build.

Guidelines:

- **Copy** is plain Bulgarian. No em dashes, no jargon without a short explanation, no filler.
- **Data** must come from a public, citable source. Add it to the sources list on `/za` and in the README.
- **Phones first.** Check about 360 px wide, then a desktop width. Touch targets are at least 44 px.
- **Both themes.** Use the colour tokens in `src/app/globals.css`, never raw greys.
- **Privacy.** Nothing about a person leaves their device unless they press a button that says so.
