import type { NextConfig } from "next";
import { join } from "node:path";

const FONTS = "../../packages/core/assets/fonts/**";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  // The monorepo root, so functions can ship files from packages/core.
  outputFileTracingRoot: join(__dirname, "../.."),
  // The share images read their fonts from disk at request time; make sure they ship with the functions.
  outputFileTracingIncludes: {
    "/[lang]/s/og": [FONTS],
    "/[lang]/opengraph-image": [FONTS],
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
    root: join(__dirname, "../.."),
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
