import { expect, test } from "@playwright/test";

test.describe("404 page", () => {
  test("returns HTTP 404 for unknown routes", async ({ page }) => {
    const response = await page.goto("/this-page-does-not-exist/");

    expect(response?.status()).toBe(404);
  });

  test("displays the custom error page", async ({ page }) => {
    await page.goto("/this-page-does-not-exist/");

    await expect(page.getByRole("heading", { name: "Page not found." })).toBeVisible();

    await expect(
      page.getByText("The page you're looking for doesn't exist or may have moved."),
    ).toBeVisible();
  });

  test("provides navigation back to the portfolio", async ({ page }) => {
    await page.goto("/this-page-does-not-exist/");

    await expect(page.getByRole("link", { name: "Back to home" })).toHaveAttribute("href", "/");

    await expect(page.getByRole("link", { name: "Explore projects" })).toHaveAttribute(
      "href",
      "/projects",
    );
  });

  test("navigates back to the homepage", async ({ page }) => {
    await page.goto("/this-page-does-not-exist/");

    await page.getByRole("link", { name: "Back to home" }).click();

    await expect(page).toHaveURL(/\/$/);
    await expect(page).not.toHaveURL(/this-page-does-not-exist/);
  });
});
