import { expect, test } from "@playwright/test";

// Adjust this selector to match your actual theme toggle if necessary.
const themeToggle = 'button[aria-label*="theme" i], button[title*="theme" i], [data-theme-toggle]';

async function pageBackground(page: import("@playwright/test").Page) {
  return page.evaluate(() => getComputedStyle(document.body).backgroundColor);
}

test("theme remains selected across Astro navigation", async ({ page }) => {
  await page.goto("/");

  const toggle = page.locator(themeToggle).first();
  await expect(toggle, "Update themeToggle to match your actual theme control").toBeVisible();

  const before = await pageBackground(page);
  await toggle.click();
  await expect.poll(() => pageBackground(page)).not.toBe(before);
  const selected = await pageBackground(page);

  await page.getByRole("navigation").getByRole("link", { name: "Work", exact: true }).first().click();
  await expect(page).toHaveURL(/\/projects\/?$/);
  await expect.poll(() => pageBackground(page)).toBe(selected);

  await page.getByRole("navigation").getByRole("link", { name: "About", exact: true }).first().click();
  await expect(page).toHaveURL(/\/about\/?$/);
  await expect.poll(() => pageBackground(page)).toBe(selected);
});
