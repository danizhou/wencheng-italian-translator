import { defineConfig, devices } from "@playwright/test";

// BASE_URL points at a deployed site; without it, the local static export is served.
const baseURL = process.env.BASE_URL ?? "http://localhost:4173/wencheng-italian-traslator/";

export default defineConfig({
  testDir: "tests/e2e",
  reporter: process.env.CI ? [["list"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL,
    // Lets a pre-installed Chromium be used instead of `playwright install`
    launchOptions: process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {},
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.BASE_URL
    ? undefined
    : { command: "node scripts/serve-static.ts 4173", url: baseURL, reuseExistingServer: true },
});
