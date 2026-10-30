import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["127.0.0.1"],
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  // Protected pages render after client session lookup, so validate instant
  // navigation only on routes that explicitly opt into that guarantee.
  experimental: { instantInsights: { validationLevel: "manual-warning" } },
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
