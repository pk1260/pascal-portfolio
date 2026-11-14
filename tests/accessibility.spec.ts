import AxeBuilder from "@axe-core/playwright";
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

for (const viewport of viewports) {
  test.describe(`Accessibility — ${viewport.name}`, () => {
    test.use({
      viewport: {
        width: viewport.width,
        height: viewport.height,
      },
      reducedMotion: "reduce",
    });

    for (const route of pages) {
      test(`${route.name} meets WCAG accessibility checks`, async ({ page }) => {
        const response = await page.goto(route.path);

        expect(response?.ok()).toBeTruthy();

        await expect(page.locator("body")).toBeVisible();

        await page.evaluate(async () => {
          await document.fonts.ready;
        });

        const accessibilityScan = await new AxeBuilder({ page })
          .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"])
          .analyze();

        const violations = accessibilityScan.violations.map((violation) => ({
          rule: violation.id,
          impact: violation.impact,
          description: violation.description,
          affectedElements: violation.nodes.map((node) => ({
            element: node.target.join(" "),
            issue: node.failureSummary,
          })),
        }));

        expect(
          violations,
          `Accessibility violations on ${route.path} at ${viewport.width}px:\n${JSON.stringify(
            violations,
            null,
            2,
          )}`,
        ).toEqual([]);
      });
    }
  });
}
