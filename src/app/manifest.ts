import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ОгнеЩит",
    short_name: "ОгнеЩит",
    description: "Опасност от горски пожар днес, пожари наблизо и какво да направите.",
    lang: "bg",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f5f1",
    theme_color: "#1f5b3e",
    categories: ["weather", "utilities", "news"],
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/app-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Звънни на 112 и координати", url: "/pomogni" },
      { name: "Пожари по области", url: "/pozhari" },
    ],
  };
}
