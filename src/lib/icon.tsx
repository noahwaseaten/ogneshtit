import { ImageResponse } from "next/og";

// App icon drawn in code (no binary assets): a pale shield with an ember flame, on fir green.
// `inset` is the share of the canvas kept clear around the artwork (maskable icons need about 20%).
export function iconResponse(size: number, inset = 0.08) {
  const art = size * (1 - inset * 2);
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "#1f5b3e" }}>
        <svg width={art} height={art} viewBox="0 0 32 32">
          <path d="M16 2.5 27 6.6v8.2c0 7-4.7 12.6-11 14.7C9.7 27.4 5 21.8 5 14.8V6.6L16 2.5Z" fill="#f3f5f1" />
          <path d="M16 9.2c.9 2.6 4.1 4.3 4.1 8.1a4.1 4.1 0 1 1-8.2 0c0-1.9 1-3 1.9-4 .3 1.4 1 2.2 1.8 2.4-.5-2.1 0-4.4.4-6.5Z" fill="#e0482c" />
        </svg>
      </div>
    ),
    { width: size, height: size, headers: { "Cache-Control": "public, max-age=604800, immutable" } },
  );
}
