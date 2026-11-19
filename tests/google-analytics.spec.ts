import { expect, test, type Page } from "@playwright/test";

const PRODUCTION_URL = "https://pascal-kuiper.nl";
const GTM_ID = "GTM-PMCB6SFF";
const GTM_PATTERN = "**/gtm.js?id=GTM-PMCB6SFF";

async function mockProduction(page: Page, baseURL: string) {
  const localOrigin = new URL(baseURL).origin;

  await page.route(`${PRODUCTION_URL}/**`, async (route) => {
    const request = route.request();
    const url = new URL(request.url());

    if (request.resourceType() === "image" || url.pathname.startsWith("/_image")) {
      await route.abort();
      return;
    }

    const target = `${localOrigin}${url.pathname}${url.search}`;

    try {
      const response = await page.request.get(target, {
        failOnStatusCode: false,
      });

      const body = await response.body();

      await route.fulfill({
        status: response.status(),
        headers: response.headers(),
        body,
      });
    } catch (error) {
      if (route.request().isNavigationRequest()) {
        throw error;
      }

      await route.abort().catch(() => {});
    }
  });
}

async function mockGoogleTagManager(page: Page) {
  let requests = 0;

  await page.route(GTM_PATTERN, async (route) => {
    requests++;

    await route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: "",
    });
  });

  return {
    get requests() {
      return requests;
    },
  };
}

test.describe("Google Analytics consent", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
  });

  test.afterEach(async ({ page }) => {
    await page.unrouteAll({ behavior: "ignoreErrors" });
  });

  test("shows the consent banner on the first visit", async ({ page }) => {
    await expect(page.getByText("A little about privacy.")).toBeVisible();

    await expect(page.getByRole("button", { name: "Accept" })).toBeVisible();

    await expect(page.getByRole("button", { name: "Reject" })).toBeVisible();
  });

  test("persists accepted consent", async ({ page }) => {
    await page.getByRole("button", { name: "Accept" }).click();

    await expect(page.getByText("A little about privacy.")).toBeHidden();

    await page.reload();

    await expect(page.getByText("A little about privacy.")).toBeHidden();
  });

  test("persists rejected consent", async ({ page }) => {
    await page.getByRole("button", { name: "Reject" }).click();

    await expect(page.getByText("A little about privacy.")).toBeHidden();

    await page.reload();

    await expect(page.getByText("A little about privacy.")).toBeHidden();
  });

  test("allows visitors to change their preferences", async ({ page }) => {
    await page.getByRole("button", { name: "Reject" }).click();

    await page.getByRole("button", { name: "Change cookie preferences" }).click();

    await expect(page.getByText("A little about privacy.")).toBeVisible();

    await page.getByRole("button", { name: "Accept" }).click();

    await expect(page.getByText("A little about privacy.")).toBeHidden();
  });

  test("never loads GTM on localhost", async ({ page }) => {
    const requests: string[] = [];

    page.on("request", (request) => {
      if (request.url().includes("googletagmanager.com")) {
        requests.push(request.url());
      }
    });

    await page.getByRole("button", { name: "Accept" }).click();

    await page.reload();

    expect(requests).toEqual([]);

    await expect(page.locator(`script[src*="${GTM_ID}"]`)).toHaveCount(0);
  });
});

test.describe("Google Analytics production behavior", () => {
  test.beforeEach(async ({ page }, testInfo) => {
    const baseURL = testInfo.project.use.baseURL;

    if (!baseURL) {
      throw new Error("Playwright baseURL is required for analytics tests.");
    }

    await mockProduction(page, baseURL);
  });

  test("does not load GTM before consent", async ({ page }) => {
    const gtm = await mockGoogleTagManager(page);

    await page.goto(PRODUCTION_URL);

    await expect(page.getByText("A little about privacy.")).toBeVisible();

    await expect(page.locator(`script[src*="${GTM_ID}"]`)).toHaveCount(0);

    expect(gtm.requests).toBe(0);
  });

  test("does not load GTM when consent is rejected", async ({ page }) => {
    const gtm = await mockGoogleTagManager(page);

    await page.goto(PRODUCTION_URL);

    await page.getByRole("button", { name: "Reject" }).click();

    await page.reload();

    await expect(page.locator(`script[src*="${GTM_ID}"]`)).toHaveCount(0);

    expect(gtm.requests).toBe(0);
  });

  test("loads GTM after consent is accepted", async ({ page }) => {
    const gtm = await mockGoogleTagManager(page);

    await page.goto(PRODUCTION_URL);

    await page.getByRole("button", { name: "Accept" }).click();

    await expect(page.locator(`script[src*="${GTM_ID}"]`)).toHaveCount(1);

    await expect.poll(() => gtm.requests).toBe(1);
  });

  test("stops loading GTM after consent is withdrawn", async ({ page }) => {
    const gtm = await mockGoogleTagManager(page);

    await page.goto(PRODUCTION_URL);

    await page.getByRole("button", { name: "Accept" }).click();

    await expect.poll(() => gtm.requests).toBe(1);

    await page.getByRole("button", { name: "Change cookie preferences" }).click();

    await page.getByRole("button", { name: "Reject" }).click();

    await expect(page.locator(`script[src*="${GTM_ID}"]`)).toHaveCount(0);

    await page.reload();

    await expect(page.locator(`script[src*="${GTM_ID}"]`)).toHaveCount(0);

    expect(gtm.requests).toBe(1);
  });

  test("does not initialize GTM multiple times during Astro navigation", async ({ page }) => {
    const gtm = await mockGoogleTagManager(page);

    await page.goto(PRODUCTION_URL);

    await page.getByRole("button", { name: "Accept" }).click();

    await expect.poll(() => gtm.requests).toBe(1);

    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Work" })
      .click();

    await expect(page).toHaveURL(/\/projects\/?$/);

    await expect.poll(() => gtm.requests).toBe(1);
  });

  test("preserves the JavaScript environment during Astro navigation", async ({ page }) => {
    await page.goto(PRODUCTION_URL);

    await page.evaluate(() => {
      (window as Window & { __navigationTest?: string }).__navigationTest = "preserved";
    });

    await page
      .getByRole("navigation", { name: "Main navigation" })
      .getByRole("link", { name: "Work" })
      .click();

    await expect(page).toHaveURL(/\/projects\/?$/);

    const preserved = await page.evaluate(() => {
      return (window as Window & { __navigationTest?: string }).__navigationTest;
    });

    expect(preserved).toBe("preserved");
  });
});
