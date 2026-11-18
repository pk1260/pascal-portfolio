import { expect, test } from "@playwright/test";

test.describe("Project video", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/projects/dingdong/");
  });

  test("renders valid poster images for both videos", async ({ page }) => {
    const posters = page.locator(".project-video-poster");

    await expect(posters).toHaveCount(2);

    for (const poster of await posters.all()) {
      await poster.scrollIntoViewIfNeeded();

      await expect(poster).toHaveAttribute("src", /.+/);

      await expect
        .poll(() =>
          poster.evaluate(
            (element: HTMLImageElement) => element.complete && element.naturalWidth > 0,
          ),
        )
        .toBe(true);
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

  test("maintains stable dimensions during video loading", async ({ page }) => {
    const video = page.locator(".project-video").first();
    const container = page.locator(".project-video-container").first();

    const initialBox = await container.boundingBox();

    expect(initialBox).not.toBeNull();
    expect(initialBox!.height).toBeGreaterThan(0);

    await video.scrollIntoViewIfNeeded();

    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused))
      .toBe(true);

    const playingBox = await container.boundingBox();

    expect(playingBox).not.toBeNull();
    expect(Math.abs(playingBox!.height - initialBox!.height)).toBeLessThan(1);
    expect(Math.abs(playingBox!.width - initialBox!.width)).toBeLessThan(1);
  });

  test("fades the poster when video playback begins", async ({ page }) => {
    const container = page.locator(".project-video-container").first();
    const video = container.locator(".project-video");
    const poster = container.locator(".project-video-poster");

    await expect(poster).toBeAttached();

    await video.scrollIntoViewIfNeeded();

    await expect(container).toHaveAttribute("data-playing", "true");

    await expect
      .poll(() => poster.evaluate((element) => Number(window.getComputedStyle(element).opacity)))
      .toBe(0);
  });

  test("does not autoplay when reduced motion is enabled", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.reload();

    const video = page.locator(".project-video").first();
    const container = page.locator(".project-video-container").first();

    await video.scrollIntoViewIfNeeded();

    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => element.paused))
      .toBe(true);

    await expect(container).not.toHaveAttribute("data-playing", "true");

    await video.click();

    await expect
      .poll(() => video.evaluate((element: HTMLVideoElement) => !element.paused))
      .toBe(true);
  });
});
