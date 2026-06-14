import { test, expect } from "@playwright/test";
import { completeOnboarding, startFastNow, startFastBackdated, endFastNow } from "./helpers";

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

  test("backdated start: elapsed reflects the asserted earlier start", async ({ page }) => {
    await startFastBackdated(page, 5);

    // Toggle to Elapsed; ~5h should already have passed, so the counter is well
    // past 04:59 (assert the hour digits are 04 or 05 to stay timing-robust).
    await page.getByText(/^\d{2}:\d{2}:\d{2}$/).click();
    await expect(page.getByText("Elapsed")).toBeVisible();
    await expect(page.getByText(/^0[45]:\d{2}:\d{2}$/)).toBeVisible();
  });

  test("backdated past goal: ring shows overtime and goal is recorded as met", async ({ page }) => {
    // 16:8 plan = 16h target; start 17h ago → already in overtime.
    await startFastBackdated(page, 17);
    await expect(page.getByText("Overtime")).toBeVisible();

    // End it — the summary confirms the goal was reached.
    await page.getByRole("button", { name: "End fast" }).click();
    const sheet = page.getByRole("dialog");
    await expect(sheet.getByText("Goal reached", { exact: false })).toBeVisible();
    await sheet.getByRole("button", { name: "End now" }).click();

    // History row carries the goal-met check.
    await page.getByRole("link", { name: "History" }).click();
    await expect(page.getByLabel("Goal met")).toBeVisible();
  });

  test("retroactive end-time edit lands a completed fast in history", async ({ page }) => {
    await startFastBackdated(page, 3);
    await page.getByRole("button", { name: "End fast" }).click();
    const sheet = page.getByRole("dialog");
    await sheet.getByRole("button", { name: "Edit end time" }).click();
    // Default end value is "now" — valid (end > start). Save the edit.
    await sheet.getByRole("button", { name: "Save & end" }).click();
    await expect(page.getByRole("button", { name: "Start fast" })).toBeVisible();

    await page.getByRole("link", { name: "History" }).click();
    await expect(page.getByText(/^1 fast ·/)).toBeVisible();
  });
});
