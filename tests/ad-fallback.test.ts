import assert from "node:assert/strict";
import {
  selectActiveAdForPlacement,
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
    desktopSrc: "/ads/test.jpg",
    ...overrides,
  };
}

function select(campaigns: AdCampaign[], development = false) {
  return selectActiveAdForPlacement(campaigns, placementId, {
    now,
    development,
  });
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
  select([], true)?.campaignType,
  "placeholder",
  "placeholder only appears in development when no fallback exists",
);

assert.equal(
  select([], false),
  null,
  "production collapses when no ad or fallback exists",
);

console.info("ad-fallback priority tests passed");
