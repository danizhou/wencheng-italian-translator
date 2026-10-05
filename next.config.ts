import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Static export: no server. LLM calls go straight from the browser to the
  // provider, so the user's API key never reaches our domain.
  output: "export",
  images: { unoptimized: true },
};

export default nextConfig;
