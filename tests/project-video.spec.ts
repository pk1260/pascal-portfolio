import { expect, test } from "@playwright/test";

test.describe("Project video", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects/dingdong/");
  });

  test("renders both videos with custom progress bars", async ({ page }) => {
    const videos = page.locator(".project-video");
    const progressBars = page.locator(".project-video-progress");

    await expect(videos).toHaveCount(2);
    await expect(progressBars).toHaveCount(2);

    for (const video of await videos.all()) {
      await video.scrollIntoViewIfNeeded();

      await expect(video).toBeVisible();
      await expect(video).toHaveAttribute("muted", "");
      await expect(video).toHaveAttribute("loop", "");
      await expect(video).toHaveAttribute("playsinline", "");
      await expect(video).not.toHaveAttribute("controls");
    }
  });

  test("loads valid video metadata", async ({ page }) => {
    const video = page.locator(".project-video").first();

    await video.scrollIntoViewIfNeeded();

    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.readyState))
      .toBeGreaterThanOrEqual(1);

    const duration = await video.evaluate((element: HTMLVideoElement) => element.duration);

    expect(duration).toBeGreaterThan(0);
  });

  test("updates progress during playback", async ({ page }) => {
    const video = page.locator(".project-video").first();
    const progress = page.locator(".project-video-progress").first();

    await video.scrollIntoViewIfNeeded();

    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused))
      .toBe(true);

    await expect
      .poll(() =>
        progress.evaluate((element) => {
          const transform = element.style.transform;
          const match = transform.match(/scaleX\(([\d.]+)\)/);

          return match ? Number(match[1]) : 0;
        }),
      )
      .toBeGreaterThan(0);
  });

  test("clicking the video pauses and resumes playback", async ({ page }) => {
    const video = page.locator(".project-video").first();

    await video.scrollIntoViewIfNeeded();

    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused))
      .toBe(true);

    await video.click();

    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
      .toBe(true);

    await video.click();

    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused))
      .toBe(true);
  });
});
