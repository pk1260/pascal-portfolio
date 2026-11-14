import { expect, test } from "@playwright/test";

const navigation = [
  { label: "Home", path: "/" },
  { label: "Work", path: "/projects/" },
  { label: "About", path: "/about/" },
  { label: "Contact", path: "/contact/" },
];

const projects = ["dingdong", "vrcafe", "flightcompanion"];

test.describe("Portfolio navigation", () => {
  test("all main navigation links are visible", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", {
      name: "Main navigation",
    });

    for (const item of navigation) {
      await expect(nav.getByRole("link", { name: item.label, exact: true })).toBeVisible();
    }
  });

  test("main navigation links navigate to the correct pages", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", {
      name: "Main navigation",
    });

    for (const item of navigation) {
      await nav
        .getByRole("link", {
          name: item.label,
          exact: true,
        })
        .click();

      await expect(page).toHaveURL(
        new RegExp(`${item.path.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\/$/, "")}/?$`),
      );
    }
  });

  test("active navigation updates after Astro page transitions", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", {
      name: "Main navigation",
    });

    for (const item of navigation) {
      const link = nav.getByRole("link", {
        name: item.label,
        exact: true,
      });

      await link.click();

      await expect(link).toHaveAttribute("aria-current", "page");

      for (const other of navigation.filter((entry) => entry.label !== item.label)) {
        await expect(
          nav.getByRole("link", {
            name: other.label,
            exact: true,
          }),
        ).not.toHaveAttribute("aria-current", "page");
      }
    }
  });

  test("logo navigates back to the homepage", async ({ page }) => {
    await page.goto("/about/");

    await page.getByRole("link", { name: /PK.*Pascal Kuiper.*Home/i }).click();

    await expect(page).toHaveURL(/\/$/);

    await expect(
      page
        .getByRole("navigation", {
          name: "Main navigation",
        })
        .getByRole("link", { name: "Home", exact: true }),
    ).toHaveAttribute("aria-current", "page");
  });

  test("homepage hero buttons navigate correctly", async ({ page }) => {
    await page.goto("/");

    await page.getByRole("link", { name: /VIEW MY WORK/i }).click();

    await expect(page).toHaveURL(/\/projects\/?$/);

    await page.goto("/");

    await page.getByRole("link", { name: "ABOUT ME" }).click();

    await expect(page).toHaveURL(/\/about\/?$/);
  });

  test("project detail pages can be reached from Work", async ({ page }) => {
    for (const slug of projects) {
      await page.goto("/projects/");

      const projectLink = page
        .locator(`a[href="/projects/${slug}"], a[href="/projects/${slug}/"]`)
        .first();

      await expect(projectLink).toBeVisible();

      await projectLink.click();

      await expect(page).toHaveURL(new RegExp(`/projects/${slug}/?$`));

      await expect(page.locator("#main-content")).toBeVisible();
    }
  });

  test("browser back and forward navigation works", async ({ page }) => {
    await page.goto("/");

    const nav = page.getByRole("navigation", {
      name: "Main navigation",
    });

    await nav.getByRole("link", { name: "Work" }).click();

    await expect(page).toHaveURL(/\/projects\/?$/);

    await nav.getByRole("link", { name: "About" }).click();

    await expect(page).toHaveURL(/\/about\/?$/);

    await page.goBack();

    await expect(page).toHaveURL(/\/projects\/?$/);

    await expect(nav.getByRole("link", { name: "Work" })).toHaveAttribute("aria-current", "page");

    await page.goForward();

    await expect(page).toHaveURL(/\/about\/?$/);

    await expect(nav.getByRole("link", { name: "About" })).toHaveAttribute("aria-current", "page");
  });

  test("main navigation works at mobile width", async ({ page }) => {
    await page.setViewportSize({
      width: 375,
      height: 812,
    });

    await page.goto("/");

    const nav = page.getByRole("navigation", {
      name: "Main navigation",
    });

    for (const item of navigation) {
      const link = nav.getByRole("link", {
        name: item.label,
        exact: true,
      });

      await expect(link).toBeVisible();

      await link.click();

      await expect(link).toHaveAttribute("aria-current", "page");
    }
  });

  test.describe("Project detail navigation", () => {
    for (const slug of projects) {
      test(`${slug} loads directly`, async ({ page }) => {
        const response = await page.goto(`/projects/${slug}/`);

        expect(response?.ok()).toBeTruthy();

        await expect(page.locator("#main-content")).toBeVisible();

        await expect(page.locator("#main-content h1")).toBeVisible();
        await expect(page.locator("#main-content h1")).not.toBeEmpty();
      });

      test(`${slug} keeps Work navigation active`, async ({ page }) => {
        await page.goto(`/projects/${slug}/`);

        const workLink = page
          .getByRole("navigation", { name: "Main navigation" })
          .getByRole("link", { name: "Work", exact: true });

        await expect(workLink).toHaveAttribute("aria-current", "page");
      });

      test(`${slug} can return to Work`, async ({ page }) => {
        await page.goto("/projects/");

        await page
          .locator(`a[href="/projects/${slug}"], a[href="/projects/${slug}/"]`)
          .first()
          .click();

        await expect(page).toHaveURL(new RegExp(`/projects/${slug}/?$`));

        // Use the project's existing back navigation.
        const backLink = page
          .locator('main a[href="/projects"], main a[href="/projects/"]')
          .first();

        await expect(backLink).toBeVisible();

        await backLink.click();

        await expect(page).toHaveURL(/\/projects\/?$/);
      });
    }

    test("unknown project slug returns 404", async ({ page }) => {
      const response = await page.goto("/projects/nonexistent-project-12345/");

      expect(response?.status()).toBe(404);
    });
  });
});
