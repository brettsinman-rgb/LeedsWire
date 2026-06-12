import { expect, test, type Page } from "@playwright/test";

const routes = ["/", "/news", "/premier-league-news", "/media"];

function attachErrorCollectors(page: Page) {
  const consoleErrors: string[] = [];
  const pageErrors: string[] = [];
  const failedResponses: string[] = [];

  page.on("console", (message) => {
    if (message.type() === "error") {
      consoleErrors.push(message.text());
    }
  });
  page.on("pageerror", (error) => {
    pageErrors.push(error.message);
  });
  page.on("response", (response) => {
    const status = response.status();
    const url = response.url();

    if ([404, 410, 500].includes(status) && url.includes("127.0.0.1")) {
      failedResponses.push(`${status} ${url}`);
    }
  });

  return {
    assertClean() {
      expect(consoleErrors, "browser console errors").toEqual([]);
      expect(pageErrors, "uncaught page errors").toEqual([]);
      expect(failedResponses, "failed local responses").toEqual([]);
    },
  };
}

async function dismissPopupForLayoutAudit(page: Page) {
  await page.addInitScript(() => {
    window.sessionStorage.setItem("leedswire-popup-dismissed", "true");
  });
}

async function expectNoHorizontalOverflow(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );

  expect(overflow, "horizontal overflow pixels").toBeLessThanOrEqual(1);
}

async function visibleAdBox(page: Page, placementId: string) {
  return page.locator(`[data-testid="adslot-${placementId}"] > div`).evaluateAll(
    (elements) => {
      const visible = elements.find((element) => {
        if (element.getAttribute("data-testid") === "top-sponsor-background") {
          return false;
        }

        const style = window.getComputedStyle(element);
        const rect = element.getBoundingClientRect();

        return style.display !== "none" && rect.width > 0 && rect.height > 0;
      });

      if (!visible) {
        return null;
      }

      const rect = visible.getBoundingClientRect();
      return {
        width: Math.round(rect.width),
        height: Math.round(rect.height),
      };
    },
  );
}

test.describe("LeedsWire private beta QA", () => {
  for (const route of routes) {
    test(`layout and console audit ${route}`, async ({ page }) => {
      await dismissPopupForLayoutAudit(page);
      const errors = attachErrorCollectors(page);

      await page.goto(route, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(750);

      await expect(page.locator("header")).toBeVisible();
      await expect(page.getByRole("link", { name: /Premier League News/i })).toBeVisible();
      await expect(page.getByRole("link", { name: /^Media$/i })).toBeVisible();
      await expectNoHorizontalOverflow(page);

      const clippedLinks = await page.locator("a").evaluateAll((links) =>
        links.filter((link) => {
          const rect = link.getBoundingClientRect();
          return rect.width > 0 && rect.height > 0 && link.scrollWidth > rect.width + 2;
        }).length,
      );

      expect(clippedLinks, "clipped visible links").toBe(0);
      errors.assertClean();
    });
  }

  test("navigation and old redirects", async ({ page }) => {
    await dismissPopupForLayoutAudit(page);

    await page.goto("/");
    await page.locator("header a").first().click();
    await expect(page).toHaveURL("/");

    await page.getByRole("link", { name: /Premier League News/i }).click();
    await expect(page).toHaveURL(/\/premier-league-news$/);

    await page.getByRole("link", { name: /^Media$/i }).click();
    await expect(page).toHaveURL(/\/media$/);

    for (const oldRoute of ["/latest", "/official", "/transfers"]) {
      const response = await page.goto(oldRoute);
      expect(response?.status(), oldRoute).toBe(200);
      await expect(page).toHaveURL("/");
    }
  });

  test("ad placements render at expected responsive sizes", async ({ page }, testInfo) => {
    await dismissPopupForLayoutAudit(page);
    await page.goto("/");

    const top = await visibleAdBox(page, "homepage-top");
    const mid = await visibleAdBox(page, "homepage-mid");

    expect(top).not.toBeNull();
    expect(mid).not.toBeNull();

    if (testInfo.project.name === "mobile") {
      expect(top).toMatchObject({ width: 300, height: 100 });
      expect(mid).toMatchObject({ width: 300, height: 250 });
      await expect(page.getByTestId("sideskin-left")).toBeHidden();
      await expect(page.getByTestId("sideskin-right")).toBeHidden();
    } else if (testInfo.project.name === "desktop") {
      expect(top).toMatchObject({ width: 970, height: 250 });
      expect(mid).toMatchObject({ width: 970, height: 250 });
      await expect(page.getByTestId("top-sponsor-background")).toBeVisible();
      await expect(page.getByTestId("sideskin-left")).toBeVisible();
      await expect(page.getByTestId("sideskin-right")).toBeVisible();
    } else {
      expect(top!.height).toBe(250);
      expect(mid!.height).toBe(250);
      await expect(page.getByTestId("sideskin-left")).toBeHidden();
      await expect(page.getByTestId("sideskin-right")).toBeHidden();
    }

    await expectNoHorizontalOverflow(page);
  });

  test("media modal opens and exposes YouTube CTA", async ({ page }) => {
    await dismissPopupForLayoutAudit(page);
    await page.goto("/media");

    await expect(page.getByText("Leeds United Official").first()).toBeVisible();
    await expect(page.getByText("The Square Ball").first()).toBeVisible();
    await expect(page.getByText("One Leeds").first()).toBeVisible();
    await expect(page.getByText("The Leeds View").first()).toBeVisible();

    await page.getByTestId("video-card").first().click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByRole("link", { name: /Watch on YouTube/i })).toBeVisible();
  });

  test("popup force view, click-through, close, and session dismissal", async ({ page }) => {
    await page.goto("/");

    await expect(page.getByTestId("promo-popup")).toBeVisible();
    await expect(page.getByTestId("promo-popup-countdown")).toContainText(
      /You can close this in [123]/,
    );
    await expect(page.getByTestId("promo-popup-close")).toBeHidden();

    await page.keyboard.press("Escape");
    await expect(page.getByTestId("promo-popup")).toBeVisible();

    await expect(page.getByTestId("promo-popup-close")).toBeVisible({
      timeout: 5_000,
    });

    const popupPromise = page.waitForEvent("popup");
    await page.getByTestId("promo-popup-creative").click();
    const popup = await popupPromise;
    await popup.waitForLoadState("domcontentloaded");
    await expect(popup).toHaveURL(/\/news$/);
    await popup.close();

    await page.getByTestId("promo-popup-close").click();
    await expect(page.getByTestId("promo-popup")).toBeHidden();

    await page.reload();
    await page.waitForTimeout(500);
    await expect(page.getByTestId("promo-popup")).toBeHidden();
  });
});
