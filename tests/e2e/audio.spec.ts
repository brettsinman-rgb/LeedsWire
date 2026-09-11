import { expect, test } from "@playwright/test";

test.beforeEach(async ({ page }) => {
  await page.addInitScript(() => {
    sessionStorage.setItem("leedswire-next-fixture-seen", "true");
    sessionStorage.setItem("leedswire-popup-dismissed", "true");
    localStorage.setItem("leedswire:push:snooze-until", String(Date.now() + 86400000));
  });
});

test("real WAV playback, seek, replay, metadata and responsive layout", async ({ page }, testInfo) => {
  const errors: string[] = [];
  page.on("pageerror", (error) => errors.push(error.message));
  page.on("console", (message) => { if (message.type() === "error") errors.push(message.text()); });
  const response = await page.goto("/audio");
  expect(response?.status()).toBe(200);
  await expect(page).toHaveTitle("We Are Leeds | LeedsWire");
  const audio = page.locator("audio");
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.duration)).toBeGreaterThan(0);
  expect(await audio.evaluate((el: HTMLAudioElement) => ({ paused: el.paused, time: el.currentTime, autoplay: el.autoplay, preload: el.preload }))).toEqual({ paused: true, time: 0, autoplay: false, preload: "metadata" });
  await expect(page.getByLabel("Total duration", { exact: true })).not.toHaveText("–:––");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(0);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  expect(await audio.evaluate((el: HTMLAudioElement) => el.paused)).toBe(true);
  const pausedAt = await audio.evaluate((el: HTMLAudioElement) => el.currentTime);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(pausedAt);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  const seek = page.getByRole("slider", { name: "Playback position" });
  await seek.fill("30");
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeCloseTo(30, 0);
  await seek.focus();
  await page.keyboard.press("ArrowRight");
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(30);
  await page.getByRole("button", { name: "Restart", exact: true }).click();
  expect(await audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBe(0);
  const duration = await audio.evaluate((el: HTMLAudioElement) => el.duration);
  await seek.fill((duration - 0.5).toFixed(1));
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText("Track finished", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Replay", exact: true }).click();
  await expect.poll(() => audio.evaluate((el: HTMLAudioElement) => el.currentTime)).toBeLessThan(5);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath("audio.png"), fullPage: true });
  if (testInfo.project.name === "mobile") {
    await page.setViewportSize({ width: 320, height: 740 });
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: testInfo.outputPath("audio-320.png"), fullPage: true });
  }
  // Existing shared-layout CSP blocks Vercel's development analytics script.
  const unexpectedErrors = errors.filter((message) => !(message.includes("https://va.vercel-scripts.com/v1/script.debug.js") && message.includes("Content Security Policy")));
  expect(unexpectedErrors).toEqual([]);
});

test("share payload and unsupported fallback", async ({ page }) => {
  await page.goto("/audio");
  await page.evaluate(() => {
    Object.defineProperty(navigator, "share", { configurable: true, value: async (data: ShareData) => {
      document.documentElement.dataset.sharePayload = JSON.stringify(data);
    } });
  });
  await page.getByRole("button", { name: "SHARE", exact: true }).click();
  expect(await page.evaluate(() => JSON.parse(document.documentElement.dataset.sharePayload!))).toEqual({ title: "We Are Leeds | LeedsWire", text: "We Are Leeds. Listen on LeedsWire.", url: "https://www.leedswire.com/audio" });
  await page.evaluate(() => Object.defineProperty(navigator, "share", { configurable: true, value: undefined }));
  await page.getByRole("button", { name: "SHARE", exact: true }).click();
  await expect(page.getByRole("textbox", { name: "Share link" })).toHaveValue("https://www.leedswire.com/audio");
});

test("audio load failure is recoverable", async ({ page }) => {
  await page.route("**/We-Are-Leeds.wav", (route) => route.abort());
  await page.goto("/audio");
  await expect(page.locator("section").getByRole("alert")).toContainText("couldn’t load");
  await page.unroute("**/We-Are-Leeds.wav");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect(page.getByText("Now playing", { exact: true })).toBeVisible();
  await expect(page.locator("section").getByRole("alert")).toHaveCount(0);
});

test("analytics follows playback transitions and navigation stops audio", async ({ page }) => {
  await page.addInitScript(() => {
    const events: string[] = [];
    Object.assign(window, { audioEvents: events, gtag: (command: string, name: string) => {
      if (command === "event") events.push(name);
    } });
  });
  await page.goto("/audio");
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await expect.poll(() => page.locator("audio").evaluate((el: HTMLAudioElement) => el.currentTime)).toBeGreaterThan(1);
  await page.getByRole("button", { name: "Pause", exact: true }).click();
  await expect.poll(() => page.evaluate(() => (window as typeof window & { audioEvents: string[] }).audioEvents.filter((name) => name.startsWith("audio_")))).toEqual(["audio_page_view", "audio_play", "audio_pause"]);
  await page.getByRole("button", { name: "Play", exact: true }).click();
  await page.evaluate(() => Object.assign(window, { previousAudio: document.querySelector("audio") }));
  await page.locator('header a[href="/media"]').first().click();
  await expect(page).toHaveURL(/\/media$/);
  await expect.poll(() => page.evaluate(() => (window as typeof window & { previousAudio: HTMLAudioElement }).previousAudio.paused)).toBe(true);
});
