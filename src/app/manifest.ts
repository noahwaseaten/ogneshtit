import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ОгнеЩит",
    short_name: "ОгнеЩит",
    description: "Опасност от горски пожар днес, пожари наблизо и какво да направите.",
    id: "/",
    lang: "bg",
    dir: "ltr",
    start_url: "/",
    scope: "/",
    display: "standalone",
    display_override: ["standalone", "minimal-ui"],
    orientation: "portrait",
    background_color: "#f3f5f1",
    theme_color: "#1f5b3e",
    categories: ["weather", "utilities", "news"],
    icons: [
      { src: "/app-icon/192", sizes: "192x192", type: "image/png" },
      { src: "/app-icon/512", sizes: "512x512", type: "image/png" },
      { src: "/app-icon/maskable", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
    shortcuts: [
      { name: "Карта на огъня", url: "/karta", icons: [{ src: "/app-icon/192", sizes: "192x192" }] },
      { name: "112 и координати", url: "/pomogni", icons: [{ src: "/app-icon/192", sizes: "192x192" }] },
      { name: "Провери камион", url: "/pomogni/kamion", icons: [{ src: "/app-icon/192", sizes: "192x192" }] },
      { name: "Подай сигнал", url: "/pomogni/signal", icons: [{ src: "/app-icon/192", sizes: "192x192" }] },
    ],
    // Photos shared from the gallery land in the report form (Android and desktop Chrome).
    share_target: {
      action: "/share-target",
      method: "POST",
      enctype: "multipart/form-data",
      params: { title: "title", text: "text", files: [{ name: "photos", accept: ["image/*"] }] },
    },
  };
}
