import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  productionBrowserSourceMaps: false,
  transpilePackages: [
    "@supabase/supabase-js",
    "@supabase/auth-js",
    "@vercel/analytics",
  ],

  experimental: {
    staticGenerationRetryCount: 1,
    staticGenerationMaxConcurrency: 1,
    staticGenerationMinPagesPerWorker: 100,
  },
};

export default nextConfig;
