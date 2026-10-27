import { ImageResponse } from "next/og";

export const alt = "ОгнеЩит: опасност от горски пожар днес";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OgImage() {
  // Onest is not bundled for the edge renderer, so the card uses the system sans with Cyrillic support.
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#1f5b3e", color: "#f3f5f1" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <svg width={96} height={96} viewBox="0 0 32 32">
            <path d="M16 2.5 27 6.6v8.2c0 7-4.7 12.6-11 14.7C9.7 27.4 5 21.8 5 14.8V6.6L16 2.5Z" fill="#f3f5f1" />
            <path d="M16 9.2c.9 2.6 4.1 4.3 4.1 8.1a4.1 4.1 0 1 1-8.2 0c0-1.9 1-3 1.9-4 .3 1.4 1 2.2 1.8 2.4-.5-2.1 0-4.4.4-6.5Z" fill="#e0482c" />
          </svg>
          <div style={{ fontSize: 72, fontWeight: 700 }}>ОгнеЩит</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ fontSize: 56, fontWeight: 700, lineHeight: 1.1 }}>Може ли да пламне гората днес?</div>
          <div style={{ fontSize: 32, opacity: 0.85 }}>Опасност от пожар, огнища от спътник и сигнали за незаконна сеч</div>
        </div>
      </div>
    ),
    size,
  );
}
