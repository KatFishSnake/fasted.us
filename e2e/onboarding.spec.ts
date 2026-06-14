import { test, expect } from "@playwright/test";
import { completeOnboarding, signIn } from "./helpers";

test.describe("Onboarding", () => {
  test("a fresh account is gated into onboarding after sign-in", async ({ page }) => {
    await signIn(page);
    await expect(page).toHaveURL(/\/onboarding/, { timeout: 20_000 });
    await expect(page.getByRole("heading", { name: "Pick your plan" })).toBeVisible();
  });

  test("completing onboarding lands on an idle timer", async ({ page }) => {
    await completeOnboarding(page);
    await expect(page.getByText("Ready to fast")).toBeVisible();
    await expect(page.getByRole("button", { name: "Start fast" })).toBeVisible();
  });

  test("onboarding is not shown again after completion", async ({ page }) => {
    await completeOnboarding(page);
    // Reload — settings.hasOnboarded persisted in IndexedDB should keep us home.
    await page.reload();
    await expect(page).toHaveURL(/\/$|\/\?/);
    await expect(page.getByText("Ready to fast")).toBeVisible();
  });
});
