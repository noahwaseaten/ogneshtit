import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Гората днес",
    short_name: "Гората",
    description: "Опасност от горски пожар, възможни пожари наблизо и какво да направите.",
    lang: "bg",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f5f1",
    theme_color: "#1f5b3e",
    icons: [
      { src: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
