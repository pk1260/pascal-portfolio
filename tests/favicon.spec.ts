import { expect, test } from "@playwright/test";

test("homepage references the custom favicons", async ({ page }) => {
  await page.goto("/");

  await expect(page.locator('link[rel="icon"][href="/favicon.ico"]')).toHaveCount(1);

  await expect(page.locator('link[rel="icon"][href="/favicon.svg"]')).toHaveCount(1);

  await expect(page.locator('link[rel="icon"][href="/pk-favicon.png"]')).toHaveCount(1);
});

test("favicon assets are accessible", async ({ request }) => {
  for (const path of ["/favicon.ico", "/favicon.svg", "/pk-favicon.png"]) {
    const response = await request.get(path);

    expect(response.status()).toBe(200);
  }
});
