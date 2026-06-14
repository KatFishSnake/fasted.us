import { defineConfig, devices } from "@playwright/test";

/**
 * E2E config for the Fasted PWA.
 *
 * Scope: the in-app flows that run in a real browser against the Convex dev
 * deployment using the Anonymous auth provider (onboarding, plans, start/end +
 * backdate + overtime + edit, history list/calendar, settings, export, sign
 * out). Google OAuth and Web Push delivery are deployment-/hardware-gated and
 * are intentionally NOT covered here — they need live secrets / a real device.
 *
 * Requires NEXT_PUBLIC_CONVEX_URL (the client connects to Convex). Boots
 * `next dev` itself. Each test gets a fresh browser context with no session,
 * so the app shows sign-in → a fresh anonymous account → onboarding.
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
