import { ImageResponse } from "next/og";

// App icon drawn in code (no binary assets): a fir tree with an ember at its base, on fir green.
// `inset` is the share of the canvas kept clear around the artwork (maskable icons need ~20%).
export function iconResponse(size: number, inset = 0.08) {
  const art = size * (1 - inset * 2);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f5b3e" }}>
        <svg width={art} height={art} viewBox="0 0 512 512">
          <polygon points="256,92 356,232 310,232 388,340 124,340 202,232 156,232" fill="#f3f5f1" />
          <rect x="238" y="340" width="36" height="44" fill="#f3f5f1" />
          <circle cx="256" cy="418" r="20" fill="#ff7a5c" />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
