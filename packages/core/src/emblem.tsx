import { BRANDS, type AppId } from "./brand";

// The family emblem: the same shield for every app, with the danger in the middle. Plain SVG elements only,
// so the same component draws the app icons and share images (Satori) as well as the UI.

export const SHIELD_PATH = "M16 2.5 27 6.6v8.2c0 7-4.7 12.6-11 14.7C9.7 27.4 5 21.8 5 14.8V6.6L16 2.5Z";
const FLAME = "M16 9.2c.9 2.6 4.1 4.3 4.1 8.1a4.1 4.1 0 1 1-8.2 0c0-1.9 1-3 1.9-4 .3 1.4 1 2.2 1.8 2.4-.5-2.1 0-4.4.4-6.5Z";
// A drop of meltwater with a snowflake inside: winter water.
const DROP = "M16 9c1.7 2.7 4.4 5.4 4.4 8.4a4.4 4.4 0 1 1-8.8 0c0-3 2.7-5.7 4.4-8.4Z";
const FLAKE = "M16 15.3v4.6M14 16.45l4 2.3M14 18.75l4-2.3";
// Winter air: three gusts of wind, the middle one curling back like a breath in the cold.
const GUSTS = "M10.6 13.4h7.2a2.1 2.1 0 1 0-2.1-2.1M10.6 17h10.1a2.3 2.3 0 1 1-2.3 2.3M10.6 20.6h5.4";

/** The centre as plain elements (Satori, which draws the images, allows nothing else inside <svg>). */
function centre(app: AppId, mark: string, cut: string) {
  if (app === "fire") return [<path key="f" d={FLAME} fill={mark} />];
  if (app === "flood")
    return [<path key="d" d={DROP} fill={mark} />, <path key="s" d={FLAKE} stroke={cut} strokeWidth={0.85} strokeLinecap="round" fill="none" />];
  if (app === "air") return [<path key="g" d={GUSTS} stroke={mark} strokeWidth={1.9} strokeLinecap="round" strokeLinejoin="round" fill="none" />];
  // The hub carries both, side by side (each scaled to 82% around the centre, then moved 4.4 units out).
  return [
    <path key="f" d={FLAME} fill={BRANDS.fire.mark} transform="translate(-1.52 4.66) scale(0.82)" />,
    <path key="d" d={DROP} fill={BRANDS.flood.mark} transform="translate(7.28 4.66) scale(0.82)" />,
  ];
}

/**
 * The emblem in the theme's colours (shield = accent, centre = --mark) or, with `fixed`, in the app's own colours
 * (for the app switcher and images, where another app is shown inside this one).
 */
export function Emblem({ app, size = 32, fixed = false }: { app: AppId; size?: number; fixed?: boolean }) {
  const b = BRANDS[app];
  const shield = fixed ? b.shield : "var(--accent)";
  const mark = fixed ? b.mark : "var(--mark)";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden className="shrink-0">
      <path d={SHIELD_PATH} fill={shield} />
      {centre(app, mark, shield)}
    </svg>
  );
}

/** The emblem on its coloured square: app icons and the corner of share images. */
export function EmblemTile({ app, size, inset = 0.08, radius = 0 }: { app: AppId; size: number; inset?: number; radius?: number }) {
  const b = BRANDS[app];
  const art = size * (1 - inset * 2);
  return (
    <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: b.color, borderRadius: radius }}>
      <svg width={art} height={art} viewBox="0 0 32 32">
        <path d={SHIELD_PATH} fill={b.shield} />
        {centre(app, b.mark, b.shield)}
      </svg>
    </div>
  );
}
