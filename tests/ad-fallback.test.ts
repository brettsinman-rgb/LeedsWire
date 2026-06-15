import assert from "node:assert/strict";
import {
  getSafeClickUrl,
  getMissingAdAssetDiagnostics,
  isSafeClickUrl,
  selectActiveAdForPlacement,
  validateConfiguredAdAssets,
  type AdCampaign,
} from "../src/config/ads.config";

const placementId = "homepage-top";
const now = Date.parse("2026-06-12T12:00:00.000Z");

function campaign(overrides: Partial<AdCampaign>): AdCampaign {
  return {
    id: "test-campaign",
    placementId,
    campaignType: "house",
    priority: 1,
    enabled: true,
    creativeType: "image",
    desktopSrc: "/ads/homepage-top.jpg",
    ...overrides,
  };
}

function select(campaigns: AdCampaign[], development = false) {
  return selectActiveAdForPlacement(campaigns, placementId, {
    now,
    development,
  });
}

function withEnv(name: string, value: string | undefined, assertion: () => void) {
  const previous = process.env[name];

  if (value === undefined) {
    delete process.env[name];
  } else {
    process.env[name] = value;
  }

  try {
    assertion();
  } finally {
    if (previous === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = previous;
    }
  }
}

assert.equal(
  select([
    campaign({ id: "house", campaignType: "house" }),
    campaign({ id: "affiliate", campaignType: "affiliate" }),
    campaign({ id: "paid", campaignType: "paid" }),
  ])?.id,
  "paid",
  "paid campaign beats affiliate and house campaigns",
);

assert.equal(
  select([
    campaign({ id: "paid-disabled", campaignType: "paid", enabled: false }),
    campaign({ id: "affiliate", campaignType: "affiliate" }),
    campaign({ id: "house", campaignType: "house" }),
  ])?.id,
  "affiliate",
  "affiliate campaign shows when no paid campaign is active",
);

assert.equal(
  select([
    campaign({ id: "paid-disabled", campaignType: "paid", enabled: false }),
    campaign({ id: "affiliate-disabled", campaignType: "affiliate", enabled: false }),
    campaign({ id: "house", campaignType: "house", desktopSrc: undefined }),
  ])?.id,
  "house",
  "house campaign shows when paid and affiliate campaigns are inactive",
);

assert.equal(
  select([
    campaign({
      id: "paid-expired",
      campaignType: "paid",
      endDate: "2026-06-01",
    }),
    campaign({ id: "affiliate", campaignType: "affiliate" }),
  ])?.id,
  "affiliate",
  "expired paid campaign falls back to affiliate",
);

assert.equal(
  select([
    campaign({
      id: "paid-future",
      campaignType: "paid",
      startDate: "2026-07-01",
    }),
    campaign({ id: "house", campaignType: "house" }),
  ])?.id,
  "house",
  "future paid campaign does not show before the start date",
);

assert.equal(
  select([
    campaign({ id: "affiliate-low", campaignType: "affiliate", priority: 1 }),
    campaign({ id: "affiliate-high", campaignType: "affiliate", priority: 20 }),
    campaign({ id: "house", campaignType: "house", priority: 100 }),
  ])?.id,
  "affiliate-high",
  "numeric priority only sorts within the same campaign type",
);

assert.equal(
  select([
    campaign({ id: "unsafe-html", campaignType: "paid", creativeType: "html" }),
    campaign({ id: "house", campaignType: "house" }),
  ])?.id,
  "house",
  "HTML/tag creatives remain inactive until sandbox rendering exists",
);

assert.equal(
  select([
    campaign({
      id: "paid-missing-asset",
      campaignType: "paid",
      desktopSrc: "/ads/missing-paid.jpg",
    }),
    campaign({ id: "house", campaignType: "house", desktopSrc: undefined }),
  ])?.id,
  "house",
  "missing paid local image falls back before rendering a broken image",
);

assert.equal(
  select([], true)?.campaignType,
  "placeholder",
  "placeholder only appears in development when no fallback exists",
);

assert.equal(
  select([], false),
  null,
  "production collapses when no ad or fallback exists",
);

withEnv("ADS_ENABLED", "false", () => {
  assert.equal(
    select([campaign({ id: "paid", campaignType: "paid" })]),
    null,
    "master advertising toggle disables all ad selection",
  );
});

withEnv("HOUSE_ADS_ENABLED", "false", () => {
  assert.equal(
    select([campaign({ id: "house", campaignType: "house", desktopSrc: undefined })]),
    null,
    "house ad toggle skips house fallback campaigns",
  );
});

withEnv("TOP_AD_ENABLED", "false", () => {
  assert.equal(
    select([campaign({ id: "paid", campaignType: "paid" })]),
    null,
    "top placement toggle disables top billboards",
  );
});

withEnv("POPUP_ENABLED", "false", () => {
  assert.equal(
    selectActiveAdForPlacement(
      [
        campaign({
          id: "popup-paid",
          placementId: "popup",
          campaignType: "paid",
          desktopSrc: "/ads/popup-sponsor.jpg",
        }),
      ],
      "popup",
      { now, development: false },
    ),
    null,
    "popup toggle disables popup campaign selection",
  );
});

assert.equal(
  isSafeClickUrl("https://www.leedswire.com/advertise"),
  true,
  "https click URLs are accepted",
);

assert.equal(
  isSafeClickUrl("http://www.leedswire.com/advertise"),
  true,
  "http click URLs are accepted",
);

assert.equal(
  isSafeClickUrl("javascript:alert(1)"),
  false,
  "javascript click URLs are rejected",
);

assert.equal(
  isSafeClickUrl("/ad-preview"),
  false,
  "relative click URLs are rejected for sponsor-style click-throughs",
);

assert.equal(
  getSafeClickUrl("javascript:alert(1)", {
    placementId: "popup",
    campaignId: "bad-popup",
  }),
  undefined,
  "invalid click URL is ignored",
);

assert.equal(
  selectActiveAdForPlacement(
    [
      campaign({
        id: "sideskin-left",
        placementId: "sideskin-left",
        campaignType: "paid",
        desktopSrc: "/ads/side-skin-left.jpg",
        clickUrl: "https://www.leedswire.com/advertise",
      }),
    ],
    "sideskin-left",
    { now, development: false },
  )?.clickUrl,
  "https://www.leedswire.com/advertise",
  "side skin click URL is retained on active campaigns",
);

assert.equal(
  selectActiveAdForPlacement(
    [
      campaign({
        id: "sponsor-background",
        placementId: "top-sponsor-background",
        campaignType: "paid",
        desktopSrc: "/ads/top-sponsor-bg.jpg",
        clickUrl: "https://www.leedswire.com/advertise",
      }),
    ],
    "top-sponsor-background",
    { now, development: false },
  )?.clickUrl,
  "https://www.leedswire.com/advertise",
  "sponsor background click URL is retained on active campaigns",
);

assert.equal(
  selectActiveAdForPlacement(
    [
      campaign({
        id: "popup-paid",
        placementId: "popup",
        campaignType: "paid",
        desktopSrc: "/ads/popup-sponsor.jpg",
        clickUrl: "https://www.leedswire.com/advertise",
      }),
    ],
    "popup",
    { now, development: false },
  )?.clickUrl,
  "https://www.leedswire.com/advertise",
  "popup click URL is retained on active campaigns",
);

assert.equal(
  getMissingAdAssetDiagnostics().length,
  0,
  "default ad configuration only references known local ad assets",
);

assert.deepEqual(
  validateConfiguredAdAssets([
    campaign({
      id: "broken-campaign",
      campaignType: "paid",
      desktopSrc: "/ads/broken.jpg",
    }),
  ]).map((item) => ({
    campaignId: item.campaignId,
    path: item.path,
    found: item.found,
  })),
  [{ campaignId: "broken-campaign", path: "/ads/broken.jpg", found: false }],
  "asset validation reports missing local creative paths",
);

console.info("ad-fallback priority tests passed");
