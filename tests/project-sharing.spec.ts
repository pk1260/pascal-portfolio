import { expect, test } from "@playwright/test";

const projects = ["dingdong", "vrcafe", "flightcompanion"];

async function mockClipboard(page: import("@playwright/test").Page) {
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });

    Object.defineProperty(navigator, "clipboard", {
      configurable: true,
      value: {
        writeText: async (text: string) => {
          (window as Window & { __copiedUrl?: string }).__copiedUrl = text;
        },
      },
    });
  });
}

test.describe("Project sharing", () => {
  for (const slug of projects) {
    test(`${slug} displays a share button`, async ({ page }) => {
      await page.goto(`/projects/${slug}/`);

      await expect(page.getByRole("button", { name: "Share project" })).toBeVisible();
    });

    test(`${slug} copies the correct project URL`, async ({ page }) => {
      await mockClipboard(page);

      await page.goto(`/projects/${slug}/`);

      await page.getByRole("button", { name: "Share project" }).click();

      await expect(page.getByRole("status")).toHaveText("Link copied");

      const copiedUrl = await page.evaluate(
        () => (window as Window & { __copiedUrl?: string }).__copiedUrl,
      );

      expect(new URL(copiedUrl!).pathname.replace(/\/$/, "")).toBe(`/projects/${slug}`);
    });
  }

  test("sharing works after Astro page transitions", async ({ page }) => {
    await mockClipboard(page);

    await page.goto("/projects/");

    for (const slug of projects) {
      await page
        .locator(`a[href="/projects/${slug}"], a[href="/projects/${slug}/"]`)
        .first()
        .click();

      await expect(page).toHaveURL(new RegExp(`/projects/${slug}/?$`));

      const shareButton = page.getByRole("button", { name: "Share project" });

      await expect(shareButton).toHaveAttribute("data-initialized", "true");

      await shareButton.click();

      await expect(page.getByRole("status")).toHaveText("Link copied");

      const copiedUrl = await page.evaluate(
        () => (window as Window & { __copiedUrl?: string }).__copiedUrl,
      );

      expect(new URL(copiedUrl!).pathname.replace(/\/$/, "")).toBe(`/projects/${slug}`);

      await page.locator("#project-back-link").click();

      await expect(page).toHaveURL(/\/projects\/?$/);
    }
  });

  for (const slug of projects) {
    test(`${slug} shares only the project URL through the Web Share API`, async ({ page }) => {
      await page.addInitScript(() => {
        Object.defineProperty(navigator, "share", {
          configurable: true,
          value: async (data: ShareData) => {
            (window as Window & { __sharedData?: ShareData }).__sharedData = data;
          },
        });
      });

      await page.goto(`/projects/${slug}/`);

      await page.getByRole("button", { name: "Share project" }).click();

      const sharedData = await page.evaluate(
        () => (window as Window & { __sharedData?: ShareData }).__sharedData,
      );

      expect(sharedData).toEqual({
        url: new URL(`/projects/${slug}/`, page.url()).href,
      });
    });
  }

  test("cancelling native sharing does not copy the URL", async ({ page }) => {
    await page.addInitScript(() => {
      Object.defineProperty(navigator, "share", {
        configurable: true,
        value: async () => {
          throw new DOMException("Share cancelled", "AbortError");
        },
      });

      Object.defineProperty(navigator, "clipboard", {
        configurable: true,
        value: {
          writeText: async () => {
            (window as Window & { __clipboardCalled?: boolean }).__clipboardCalled = true;
          },
        },
      });
    });

    await page.goto("/projects/dingdong/");

    await page.getByRole("button", { name: "Share project" }).click();

    await expect(page.getByRole("status")).toBeEmpty();

    const clipboardCalled = await page.evaluate(
      () => (window as Window & { __clipboardCalled?: boolean }).__clipboardCalled,
    );

    expect(clipboardCalled).toBeUndefined();
  });
});
