import { test, expect } from "@playwright/test";
import { completeOnboarding, startFastBackdated, endFastNow } from "./helpers";

test.describe("History", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
  });

  test("empty state before any fast", async ({ page }) => {
    await page.getByRole("link", { name: "History" }).click();
    await expect(page.getByText("No fasts yet")).toBeVisible();
    await expect(page.getByText(/^0 fasts ·/)).toBeVisible();
  });

  test("a recorded fast shows in the list with its duration and total", async ({ page }) => {
    await startFastBackdated(page, 10);
    await endFastNow(page);

    await page.getByRole("link", { name: "History" }).click();
    await expect(page.getByText(/^1 fast ·/)).toBeVisible();
    await expect(page.getByText(/\d+h total fasted/)).toBeVisible();
    await expect(page.getByRole("listitem")).toHaveCount(1);
    // ~10h duration is rendered on the row.
    await expect(page.getByText(/(09|10)h \d{2}m/)).toBeVisible();
  });

  test("calendar view marks the fasting day", async ({ page }) => {
    await startFastBackdated(page, 16); // goal-met fast
    await endFastNow(page);

    await page.getByRole("link", { name: "History" }).click();
    await page.getByRole("tab", { name: "calendar" }).click();

    // The legend confirms the calendar rendered.
    await expect(page.getByText("Fasting day")).toBeVisible();
    // At least one day cell is labelled as having a fast (not "no fast").
    await expect(page.getByLabel(/: \d+ fast/).first()).toBeVisible();
  });

  test("list / calendar toggle switches views", async ({ page }) => {
    await page.getByRole("link", { name: "History" }).click();
    const list = page.getByRole("tab", { name: "list" });
    const calendar = page.getByRole("tab", { name: "calendar" });

    await expect(list).toHaveAttribute("aria-selected", "true");
    await calendar.click();
    await expect(calendar).toHaveAttribute("aria-selected", "true");
    await expect(list).toHaveAttribute("aria-selected", "false");
  });
});
