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

for (const label of ["Side Skins", "Sponsor Background", "Popup"]) {
  const row = rows.find((item) => item.label === label);

  assert.equal(row?.statusEnabled, true, `${label} is enabled when toggle is on`);
  assert.equal(
    row?.statusDetail === "No active creative" ||
      Boolean(row?.statusDetail.endsWith(" active")),
    true,
    `${label} distinguishes configured creative from disabled placement`,
  );
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
  assert.equal(row.statusDetail, "Configured but disabled");
}

console.log("ad campaign status tests passed");
