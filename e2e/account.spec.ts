import { test, expect } from "@playwright/test";
import { completeOnboarding } from "./helpers";

test.describe("Account", () => {
  test("the account card shows a signed-in identity with a sign-out action", async ({ page }) => {
    await completeOnboarding(page);
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("button", { name: "Sign out" })).toBeVisible();
  });

  test("signing out returns to the sign-in screen", async ({ page }) => {
    await completeOnboarding(page);
    await page.getByRole("link", { name: "Settings" }).click();
    await page.getByRole("button", { name: "Sign out" }).click();

    // Back behind the auth gate.
    await expect(page.getByRole("button", { name: "Continue without an account" })).toBeVisible({
      timeout: 20_000,
    });
  });
});
