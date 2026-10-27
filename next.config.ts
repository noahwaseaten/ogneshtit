import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The share images read their fonts from disk at request time; make sure they ship with the functions.
  outputFileTracingIncludes: {
    "/s/og": ["./assets/fonts/**"],
    "/opengraph-image": ["./assets/fonts/**"],
  },
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
