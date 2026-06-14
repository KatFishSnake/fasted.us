import { test, expect } from "@playwright/test";
import { completeOnboarding, startFastNow, endFastNow } from "./helpers";

test.describe("Settings & data", () => {
  test.beforeEach(async ({ page }) => {
    await completeOnboarding(page);
    await page.getByRole("link", { name: "Settings" }).click();
    await expect(page.getByRole("heading", { name: "Settings" })).toBeVisible();
  });

  test("reminder preference persists across reload", async ({ page }) => {
    const reminders = page.getByRole("switch").first(); // "Reminders enabled"
    await expect(reminders).toHaveAttribute("aria-checked", "true");
    await reminders.click();
    await expect(reminders).toHaveAttribute("aria-checked", "false");

    await page.reload();
    await expect(page.getByRole("switch").first()).toHaveAttribute("aria-checked", "false");
  });

  test("export produces a JSON backup download", async ({ page }) => {
    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export" }).click();
    const download = await downloadPromise;
    expect(download.suggestedFilename()).toMatch(/^fasted-backup-\d{4}-\d{2}-\d{2}\.json$/);
  });

  test("a completed fast is included in the export payload", async ({ page }) => {
    // Record a fast first, then export and inspect the backup contents.
    await page.getByRole("link", { name: "Timer" }).click();
    await startFastNow(page);
    await endFastNow(page);
    await page.getByRole("link", { name: "Settings" }).click();

    const downloadPromise = page.waitForEvent("download");
    await page.getByRole("button", { name: "Export" }).click();
    const download = await downloadPromise;
    const stream = await download.createReadStream();
    const chunks: Buffer[] = [];
    for await (const c of stream) chunks.push(Buffer.from(c));
    const env = JSON.parse(Buffer.concat(chunks).toString("utf8"));

    const fasts = env.fasts ?? env.data?.fasts ?? [];
    expect(Array.isArray(fasts)).toBe(true);
    expect(fasts.length).toBeGreaterThanOrEqual(1);
  });
});
