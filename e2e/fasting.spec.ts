import { test, expect } from "@playwright/test";
import { completeOnboarding, startFastNow, endFastNow } from "./helpers";

test.describe("Fasting lifecycle", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test("start a fast: ring goes active and counts down", async ({ page }) => {
    await startFastNow(page);

    // Active timer shows the remaining-time label and a HH:MM:SS counter.
    await expect(page.getByText("Remaining")).toBeVisible();
    await expect(page.getByText(/^\d{2}:\d{2}:\d{2}$/)).toBeVisible();
    // Stage / ends-at line is present.
    await expect(page.getByText(/ends/)).toBeVisible();
  });

  test("tap center toggles remaining / elapsed", async ({ page }) => {
    await startFastNow(page);
    await expect(page.getByText("Remaining")).toBeVisible();
    await page.getByText(/^\d{2}:\d{2}:\d{2}$/).click();
    await expect(page.getByText("Elapsed")).toBeVisible();
  });

  test("end a fast: returns to idle and records it in history", async ({ page }) => {
    await startFastNow(page);
    await endFastNow(page);

    // Idle again, with a "Last:" summary of the just-finished fast.
    await expect(page.getByText("Ready to fast")).toBeVisible();
    await expect(page.getByText(/^Last:/)).toBeVisible();

    // History tab shows exactly one completed fast.
    await page.getByRole("link", { name: "History" }).click();
    await expect(page).toHaveURL(/\/history/);
    await expect(page.getByText(/^1 fast ·/)).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(1);
  });

  test("one-open-fast invariant: no Start button while a fast is active", async ({ page }) => {
    await startFastNow(page);
    await expect(page.getByRole("button", { name: "Start fast" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "End fast" })).toBeVisible();
  });
});
