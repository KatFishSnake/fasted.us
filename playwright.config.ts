import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for the Fasted PWA.
 *
 * Scope: the local-first flows that run entirely against IndexedDB in a real
 * browser (onboarding, start/end a fast, ring + stages, history, settings,
 * export/import). Auth (Google), Web Push, and Convex sync are deployment- and
 * hardware-gated and are intentionally NOT covered here — they can't run from
 * a headless CI box without live secrets / a real device.
 *
 * Boots `next dev` itself. Each test gets a fresh browser context, so
 * IndexedDB starts empty and the app drops the user into onboarding.
 */
export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL: "http://localhost:3100",
    trace: "on-first-retry",
    // Auto-grant notification permission so onboarding's requestPermission()
    // resolves without a blocking native prompt.
    permissions: ["notifications"],
  },
  projects: [
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
  ],
  webServer: {
    // Pinned port avoids colliding with other dev servers (Next falls back to a
    // random port otherwise, which the url check below would never see).
    command: "next dev -p 3100",
    url: "http://localhost:3100",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
