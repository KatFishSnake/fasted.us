import { test, expect } from "@playwright/test";
import { completeOnboarding, choosePlan } from "./helpers";

test.describe("Plans", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page); // lands on 16:8
  });

  test("switching to a preset plan updates the plan pill", async ({ page }) => {
    // Pill starts on the onboarding choice.
    await expect(page.getByRole("button", { name: "Edit plan" })).toContainText("16:8");

    await choosePlan(page, /18:6/);
    await expect(page.getByRole("button", { name: "Edit plan" })).toContainText("18:6");

    // Persists across reload (it's stored in the account, not just UI state).
    await page.reload();
    await expect(page.getByRole("button", { name: "Edit plan" })).toContainText("18:6");
  });

  test("the active plan is checkmarked in the plans sheet", async ({ page }) => {
    await choosePlan(page, /20:4/);
    await page.getByRole("button", { name: "Edit plan" }).click();
    const sheet = page.getByRole("dialog");
    // The selected row exposes a "Selected" check.
    await expect(sheet.getByLabel("Selected")).toBeVisible();
    await expect(sheet.getByRole("button", { name: /20:4/ })).toContainText("20:4");
  });

  test("creating a custom plan activates it", async ({ page }) => {
    await page.getByRole("button", { name: "Edit plan" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Custom fasting hours").fill("20");
    await sheet.getByRole("button", { name: "Use" }).click();
    await expect(sheet).toBeHidden();

    // label = `${hours}:${24-hours}` → 20:4
    await expect(page.getByRole("button", { name: "Edit plan" })).toContainText("20:4");
  });

  test("custom plan rejects an out-of-range window", async ({ page }) => {
    await page.getByRole("button", { name: "Edit plan" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByLabel("Custom fasting hours").fill("30");
    await sheet.getByRole("button", { name: "Use" }).click();
    await expect(sheet.getByText("Enter 1–23 hours")).toBeVisible();
    await expect(sheet).toBeVisible(); // sheet stays open on invalid input
  });
});
