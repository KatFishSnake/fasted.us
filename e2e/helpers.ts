import { type Page, expect } from "@playwright/test";

/**
 * Pass the auth gate. Everything is behind Convex Auth now; a fresh context has
 * no session, so the app shows the sign-in screen. We use the Anonymous provider
 * ("Continue without an account") so e2e can run without Google OAuth secrets —
 * each test gets its own fresh, isolated account.
 */
export async function signIn(page: Page) {
  await page.goto("/");
  const anon = page.getByRole("button", { name: "Continue without an account" });
  await expect(anon).toBeVisible({ timeout: 20_000 });
  await anon.click();
}

/**
 * Sign in, then walk the 3-step first-run onboarding and land back on the timer
 * home. A fresh account => no settings => the app gates into /onboarding.
 */
export async function completeOnboarding(page: Page, plan = /16:8/) {
  await signIn(page);
  // Onboarding gate redirects here once the account's defaults are seeded.
  await expect(page).toHaveURL(/\/onboarding/, { timeout: 20_000 });

  // Step 0 — pick a plan.
  await page.getByRole("button", { name: plan }).click();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 1 — usual start time (default value is fine).
  await expect(page.getByRole("heading", { name: /When do you usually start/ })).toBeVisible();
  await page.getByRole("button", { name: "Continue" }).click();

  // Step 2 — reminders (checked by default).
  await page.getByRole("button", { name: "Start fasting" }).click();

  // Back on the timer home, idle.
  await expect(page).toHaveURL(/\/$|\/\?/);
  await expect(page.getByText("Ready to fast")).toBeVisible();
}

/** Start a fast "now" via the Start sheet. */
export async function startFastNow(page: Page) {
  await page.getByRole("button", { name: "Start fast" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("Start your fast now", { exact: false })).toBeVisible();
  await sheet.getByRole("button", { name: "Start now" }).click();
  // CTA flips to End fast once a fast is active.
  await expect(page.getByRole("button", { name: "End fast" })).toBeVisible();
}

/** datetime-local input value (browser-local zone) for `hoursAgo` before now. */
function datetimeLocalHoursAgo(hoursAgo: number): string {
  const d = new Date(Date.now() - hoursAgo * 3_600_000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/**
 * Start a fast the user asserts began `hoursAgo` ago (manual backdate). Drives
 * the StartSheet's "I started earlier…" branch + native datetime-local input.
 */
export async function startFastBackdated(page: Page, hoursAgo: number) {
  await page.getByRole("button", { name: "Start fast" }).click();
  const sheet = page.getByRole("dialog");
  await sheet.getByRole("button", { name: "I started earlier" }).click();
  await sheet.locator("#start-time").fill(datetimeLocalHoursAgo(hoursAgo));
  await sheet.getByRole("button", { name: "Start fast" }).click();
  await expect(page.getByRole("button", { name: "End fast" })).toBeVisible();
}

/** Open the plans sheet from the plan pill and switch to the plan matching `name`. */
export async function choosePlan(page: Page, name: RegExp) {
  await page.getByRole("button", { name: "Edit plan" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByRole("heading", { name: "Choose your plan" })).toBeVisible();
  await sheet.getByRole("button", { name }).click();
  await expect(sheet).toBeHidden();
}

/** End the active fast "now" via the End sheet. */
export async function endFastNow(page: Page) {
  await page.getByRole("button", { name: "End fast" }).click();
  const sheet = page.getByRole("dialog");
  await expect(sheet.getByText("You fasted")).toBeVisible();
  await sheet.getByRole("button", { name: "End now" }).click();
  await expect(page.getByRole("button", { name: "Start fast" })).toBeVisible();
}
