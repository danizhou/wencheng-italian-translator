import type { NextConfig } from "next";

// GitHub Pages serves the site under /<repo>; the deploy workflow passes that prefix.
// Empty locally and in CI, so `npm run dev` stays at http://localhost:3000.
const basePath = process.env.PAGES_BASE_PATH ?? "";

const nextConfig: NextConfig = {
  // Static export: no server. LLM calls go straight from the browser to the
  // provider, so the user's API key never reaches our domain.
  output: "export",
  basePath,
  images: { unoptimized: true },
};

export default nextConfig;
