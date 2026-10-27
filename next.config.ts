import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The share images read their fonts from disk at request time; make sure they ship with the functions.
  outputFileTracingIncludes: {
    "/[lang]/s/og": ["./assets/fonts/**"],
    "/[lang]/opengraph-image": ["./assets/fonts/**"],
  },
  // "За ОгнеЩит" became Settings.
  redirects: async () => [{ source: "/za", destination: "/nastroiki", permanent: true }],
  headers: async () => [
    {
      source: "/:path*",
      headers: [
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
      ],
    },
  ],
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
