import { expect, test, type Page } from "@playwright/test";

const fixtureResponse = {
  fixture: {
    homeTeam: "Leeds United",
    awayTeam: "Nottingham Forest",
    opponent: "Nottingham Forest",
    competition: "Premier League",
    kickoffAt: "2030-08-22T14:00:00.000Z",
    venue: "Elland Road, Leeds",
    isHome: true,
    leedsCrestUrl: null,
    opponentCrestUrl: null,
    matchCentreUrl: null,
    sourceUrl: "https://www.leedsunited.com/en/matches/mens/fixtures",
    lastFetchedAt: "2030-08-01T00:00:00.000Z",
  },
};

type Frame = {
  time: number;
  left: number;
  top: number;
  right: number;
  opacity: number;
  transform: string;
  translate: string;
};

type FixtureQa = {
  loadAt: number;
  frames: Frame[];
};

async function prepareFixtureQa(page: Page) {
  await page.route("**/api/fixtures/next", async (route) => {
    await route.fulfill({
      contentType: "application/json",
      body: JSON.stringify(fixtureResponse),
    });
  });

  await page.addInitScript(() => {
    window.sessionStorage.removeItem("leedswire-next-fixture-seen");

    const qa: FixtureQa = {
      loadAt: 0,
      frames: [],
    };
    (
      window as typeof window & {
        __fixtureQa: FixtureQa;
      }
    ).__fixtureQa = qa;

    window.addEventListener("load", () => {
      qa.loadAt = performance.now();
    });

    const beginObserving = () => {
      let isSampling = false;
      const sample = () => {
        const popup = document.querySelector<HTMLElement>(
          '[data-testid="next-fixture-popup"]',
        );

        if (!popup) {
          isSampling = false;
          return;
        }

        const rect = popup.getBoundingClientRect();
        const style = getComputedStyle(popup);
        qa.frames.push({
          time: performance.now(),
          left: rect.left,
          top: rect.top,
          right: rect.right,
          opacity: Number.parseFloat(style.opacity),
          transform: style.transform,
          translate: style.translate,
        });
        requestAnimationFrame(sample);
      };

      const observer = new MutationObserver(() => {
        if (
          !isSampling &&
          document.querySelector('[data-testid="next-fixture-popup"]')
        ) {
          isSampling = true;
          sample();
        }
      });

      observer.observe(document.documentElement, {
        childList: true,
        subtree: true,
      });
    };

    if (document.documentElement) {
      beginObserving();
    } else {
      document.addEventListener("DOMContentLoaded", beginObserving, {
        once: true,
      });
    }
  });
}

async function readFixtureQa(page: Page) {
  return page.evaluate(
    () =>
      (
        window as typeof window & {
          __fixtureQa: FixtureQa;
        }
      ).__fixtureQa,
  );
}

test("desktop popup enters fully from the right and exits to the right", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await prepareFixtureQa(page);
  await page.goto("/", { waitUntil: "load" });

  await page.waitForTimeout(450);
  await expect(page.getByTestId("next-fixture-popup")).toHaveCount(0);

  const popup = page.getByTestId("next-fixture-popup");
  await expect(popup).toBeVisible();
  await page.waitForFunction(() => {
    const element = document.querySelector<HTMLElement>(
      '[data-testid="next-fixture-popup"]',
    );
    return element && Number.parseFloat(getComputedStyle(element).opacity) >= 0.999;
  });

  const qa = await readFixtureQa(page);
  const first = qa.frames[0];
  const final = qa.frames.at(-1)!;

  expect(first.time - qa.loadAt).toBeGreaterThanOrEqual(550);
  expect(first.left).toBeGreaterThanOrEqual(1920);
  expect(first.opacity).toBe(0);
  expect(first.translate).not.toBe("none");
  expect(final.left).toBeLessThan(1920);
  expect(final.opacity).toBeGreaterThanOrEqual(0.999);
  expect(Math.abs(final.top - first.top)).toBeLessThan(1);
  expect(
    qa.frames.some(
      (frame) => frame.left < first.left && frame.left > final.left,
    ),
  ).toBe(true);
  expect(qa.frames.some((frame) => frame.opacity > first.opacity)).toBe(true);

  const settledBox = await popup.boundingBox();
  expect(settledBox?.width).toBe(400);
  expect(
    Math.abs(1920 - (settledBox!.x + settledBox!.width) - 24),
  ).toBeLessThan(0.5);
  const expectedDesktopTop = await page.evaluate(() => {
    const headerOffset = Number.parseFloat(
      getComputedStyle(document.documentElement).getPropertyValue(
        "--lw-header-offset",
      ),
    );
    return headerOffset + 24;
  });
  expect(Math.abs(settledBox!.y - expectedDesktopTop)).toBeLessThan(1);
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth === window.innerWidth,
    ),
  ).toBe(true);

  const framesBeforeExit = qa.frames.length;
  await popup
    .getByRole("button", { name: "Close next fixture" })
    .click({ force: true });
  await page.waitForFunction((settledLeft) => {
    const element = document.querySelector<HTMLElement>(
      '[data-testid="next-fixture-popup"]',
    );
    return (
      element &&
      element.getBoundingClientRect().left > Number(settledLeft) + 1
    );
  }, settledBox!.x);

  const exitingBox = await popup.boundingBox();
  expect(exitingBox).not.toBeNull();
  expect(exitingBox!.x).toBeGreaterThan(settledBox!.x);
  expect(Math.abs(exitingBox!.y - settledBox!.y)).toBeLessThan(1);

  await expect(popup).toHaveCount(0);
  const afterExit = await readFixtureQa(page);
  const exitFrames = afterExit.frames.slice(framesBeforeExit);
  const lastExitFrame = exitFrames.at(-1);

  expect(lastExitFrame?.left).toBeGreaterThanOrEqual(1920);
  expect(lastExitFrame?.opacity).toBeLessThanOrEqual(0.02);
});

test("mobile popup retains its bottom-up animation", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "mobile");
  await prepareFixtureQa(page);
  await page.goto("/", { waitUntil: "load" });

  const popup = page.getByTestId("next-fixture-popup");
  await expect(popup).toBeVisible();
  await page.waitForTimeout(250);

  const qa = await readFixtureQa(page);
  const first = qa.frames[0];
  const final = qa.frames.at(-1)!;

  expect(first.left).toBeLessThan(390);
  expect(first.top).toBeGreaterThan(final.top);
  expect(Math.abs(first.left - final.left)).toBeLessThan(1);
  expect(final.opacity).toBe(1);
});

test("reduced motion uses opacity without directional movement", async ({
  page,
}, testInfo) => {
  test.skip(testInfo.project.name !== "desktop");
  await page.emulateMedia({ reducedMotion: "reduce" });
  await prepareFixtureQa(page);
  await page.goto("/", { waitUntil: "load" });

  const popup = page.getByTestId("next-fixture-popup");
  await expect(popup).toBeVisible();
  await page.waitForTimeout(180);

  const qa = await readFixtureQa(page);
  const first = qa.frames[0];
  const final = qa.frames.at(-1)!;

  expect(Math.abs(first.left - final.left)).toBeLessThan(1);
  expect(Math.abs(first.top - final.top)).toBeLessThan(1);
  expect(["none", "0px"]).toContain(first.translate);
  expect(first.opacity).toBe(0);
  expect(final.opacity).toBeGreaterThanOrEqual(0.999);
});
