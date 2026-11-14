import { expect, test } from "@playwright/test";

const routes = ["/", "/projects/", "/about/", "/contact/", "/projects/dingdong/", "/projects/vrcafe/", "/projects/flightcompanion/"];
const widths = [375, 768, 1024, 1440];

for (const width of widths) {
  test.describe(`${width}px`, () => {
    test.use({ viewport: { width, height: 900 } });

    for (const path of routes) {
      test(`visible image bounds: ${path}`, async ({ page }) => {
        await page.goto(path);
        const outliers = await page.locator("img").evaluateAll((images) => {
          return images.flatMap((image) => {
            const img = image as HTMLImageElement;
            const rect = img.getBoundingClientRect();
            if (!rect.width || !rect.height) return [];
            if (rect.left >= -1 && rect.right <= window.innerWidth + 1) return [];

            // A cropping container may deliberately clip a larger image.
            let parent = img.parentElement;
            while (parent) {
              const overflow = getComputedStyle(parent).overflowX;
              if (["hidden", "clip", "scroll", "auto"].includes(overflow)) return [];
              parent = parent.parentElement;
            }
            return [{ src: img.currentSrc || img.src, left: rect.left, right: rect.right }];
          });
        });
        expect(outliers, `Images outside viewport at ${width}px on ${path}`).toEqual([]);
      });
    }
  });
}
