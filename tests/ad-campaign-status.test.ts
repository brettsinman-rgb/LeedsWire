import assert from "node:assert/strict";
import { getCampaignStatusRows } from "../src/config/adCampaignStatus";
import type { AdControlSettings } from "../src/config/adControls";

const enabledSettings: AdControlSettings = {
  adsEnabled: true,
  houseAdsEnabled: true,
  popupEnabled: true,
  sideSkinsEnabled: true,
  sponsorBackgroundEnabled: true,
  topAdEnabled: true,
  midAdEnabled: true,
  bottomAdEnabled: true,
};

const rows = getCampaignStatusRows(enabledSettings, [
  {
    label: "Top Billboard",
    key: "topAdEnabled",
    ids: ["homepage-top", "premier-league-news-top", "media-top"],
  },
  {
    label: "Mid Billboard",
    key: "midAdEnabled",
    ids: ["homepage-mid", "premier-league-news-mid", "media-mid"],
  },
  {
    label: "Bottom Billboard",
    key: "bottomAdEnabled",
    ids: ["homepage-bottom", "premier-league-news-bottom", "media-bottom"],
  },
  {
    label: "Side Skins",
    key: "sideSkinsEnabled",
    ids: ["sideskin-left", "sideskin-right"],
  },
  {
    label: "Sponsor Background",
    key: "sponsorBackgroundEnabled",
    ids: ["top-sponsor-background"],
  },
  {
    label: "Popup",
    key: "popupEnabled",
    ids: ["popup"],
  },
]);

const expectedPreviews = new Map([
  ["Top Billboard", "/ads/homepage-top.jpg"],
  ["Mid Billboard", "/ads/homepage-mid.jpg"],
  ["Bottom Billboard", "/ads/homepage-bottom.jpg"],
]);

for (const [label, previewSrc] of expectedPreviews) {
  const row = rows.find((item) => item.label === label);

  assert.equal(row?.statusEnabled, true, `${label} is enabled when toggle is on`);
  assert.equal(row?.previewSrc, previewSrc, `${label} shows a configured image preview`);
  assert.equal(
    row?.statusDetail === "Active creative" || row?.statusDetail === "House fallback",
    true,
    `${label} reports active creative or house fallback`,
  );
  assert.equal(
    row?.renderReason === "Rendering paid image" ||
      row?.renderReason === "Rendering house image",
    true,
    `${label} reports the live render reason`,
  );
}

for (const label of ["Side Skins", "Sponsor Background", "Popup"]) {
  const row = rows.find((item) => item.label === label);

  assert.equal(row?.statusEnabled, true, `${label} is enabled when toggle is on`);
  assert.equal(
    row?.statusDetail === "Expired campaign" ||
      row?.statusDetail === "Active creative" ||
      row?.statusDetail === "No active creative",
    true,
    `${label} distinguishes configured creative from disabled placement`,
  );
  assert.equal(Boolean(row?.previewSrc), true, `${label} shows a configured preview`);
  assert.equal(
    Boolean(row?.configuredPrimary),
    true,
    `${label} has a configured creative available for admin display`,
  );
}

const disabledRows = getCampaignStatusRows(
  {
    ...enabledSettings,
    sideSkinsEnabled: false,
    sponsorBackgroundEnabled: false,
    popupEnabled: false,
  },
  [
    {
      label: "Side Skins",
      key: "sideSkinsEnabled",
      ids: ["sideskin-left", "sideskin-right"],
    },
    {
      label: "Sponsor Background",
      key: "sponsorBackgroundEnabled",
      ids: ["top-sponsor-background"],
    },
    {
      label: "Popup",
      key: "popupEnabled",
      ids: ["popup"],
    },
  ],
);

for (const row of disabledRows) {
  assert.equal(row.statusEnabled, false, `${row.label} is disabled when toggle is off`);
  assert.equal(row.statusDetail, "Disabled by toggle");
  assert.equal(row.renderReason, "Hidden by toggle");
}

console.log("ad campaign status tests passed");
