import { expect, test } from "@playwright/test";

const pages = [
  { name: "home", path: "/" },
  { name: "work", path: "/projects/" },
  { name: "about", path: "/about/" },
  { name: "contact", path: "/contact/" },
  { name: "dingdong", path: "/projects/dingdong/" },
  { name: "vrcafe", path: "/projects/vrcafe/" },
  { name: "flightcompanion", path: "/projects/flightcompanion/" },
];

const viewports = [
  { name: "mobile", width: 375, height: 812 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "laptop", width: 1024, height: 768 },
  { name: "desktop", width: 1440, height: 900 },
];

async function loadImages(page: import("@playwright/test").Page) {
  await page.evaluate(async () => {
    const images = Array.from(document.querySelectorAll("img"));

    for (const image of images) {
      image.loading = "eager";
    }

    await Promise.all(
      images.map(async (image) => {
        if (!image.complete) {
          await new Promise<void>((resolve) => {
            image.addEventListener("load", () => resolve(), { once: true });
            image.addEventListener("error", () => resolve(), { once: true });
          });
        }

        if (image.naturalWidth > 0) {
          await image.decode().catch(() => {});
        }
      }),
    );
  });
}

for (const viewport of viewports) {
  test.describe(`${viewport.name} (${viewport.width}px)`, () => {
    test.use({
      viewport: {
        width: viewport.width,
        height: viewport.height,
      },
    });

    for (const route of pages) {
      test(`${route.name} layout`, async ({ page }, testInfo) => {
        const response = await page.goto(route.path);

        expect(response?.ok()).toBeTruthy();

        await expect(page.locator("body")).toBeVisible();

        await loadImages(page);

        const brokenImages = await page.locator("img").evaluateAll((images) =>
          images
            .filter((image) => {
              const img = image as HTMLImageElement;
              return !img.complete || img.naturalWidth === 0;
            })
            .map((image) => (image as HTMLImageElement).src),
        );

        expect(brokenImages, `Broken images on ${route.path} at ${viewport.width}px`).toEqual([]);

        await page.screenshot({
          path: testInfo.outputPath(`${route.name}-${viewport.name}.png`),
          fullPage: true,
          animations: "disabled",
        });

        const dimensions = await page.evaluate(() => ({
          documentWidth: document.documentElement.scrollWidth,
          viewportWidth: window.innerWidth,
        }));

        expect(
          dimensions.documentWidth,
          `Horizontal overflow on ${route.path} at ${viewport.width}px`,
        ).toBeLessThanOrEqual(dimensions.viewportWidth + 1);
      });
    }
  });
}
