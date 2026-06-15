import type { AdPlacementId, AdCampaignType } from "@/config/ads.config";

export type AdControlKey =
  | "adsEnabled"
  | "houseAdsEnabled"
  | "popupEnabled"
  | "sideSkinsEnabled"
  | "sponsorBackgroundEnabled"
  | "topAdEnabled"
  | "midAdEnabled"
  | "bottomAdEnabled";

export type AdControlSettings = Record<AdControlKey, boolean>;
export type AdSettingKey =
  | "ADS_ENABLED"
  | "HOUSE_ADS_ENABLED"
  | "POPUP_ENABLED"
  | "SIDE_SKINS_ENABLED"
  | "SPONSOR_BACKGROUND_ENABLED"
  | "TOP_AD_ENABLED"
  | "MID_AD_ENABLED"
  | "BOTTOM_AD_ENABLED";

export const adSettingKeys = [
  "ADS_ENABLED",
  "TOP_AD_ENABLED",
  "MID_AD_ENABLED",
  "BOTTOM_AD_ENABLED",
  "SIDE_SKINS_ENABLED",
  "SPONSOR_BACKGROUND_ENABLED",
  "POPUP_ENABLED",
  "HOUSE_ADS_ENABLED",
] as const satisfies readonly AdSettingKey[];

const envMap = {
  adsEnabled: "ADS_ENABLED",
  houseAdsEnabled: "HOUSE_ADS_ENABLED",
  popupEnabled: "POPUP_ENABLED",
  sideSkinsEnabled: "SIDE_SKINS_ENABLED",
  sponsorBackgroundEnabled: "SPONSOR_BACKGROUND_ENABLED",
  topAdEnabled: "TOP_AD_ENABLED",
  midAdEnabled: "MID_AD_ENABLED",
  bottomAdEnabled: "BOTTOM_AD_ENABLED",
} as const satisfies Record<AdControlKey, AdSettingKey>;

export const settingKeyToControlKey = Object.fromEntries(
  Object.entries(envMap).map(([controlKey, settingKey]) => [settingKey, controlKey]),
) as Record<AdSettingKey, AdControlKey>;

function envEnabled(name: string) {
  const value = process.env[name]?.trim().toLowerCase();

  if (value === undefined || value === "") {
    return true;
  }

  return !["0", "false", "no", "off", "disabled"].includes(value);
}

export function getAdControlSettings(): AdControlSettings {
  return {
    adsEnabled: envEnabled(envMap.adsEnabled),
    houseAdsEnabled: envEnabled(envMap.houseAdsEnabled),
    popupEnabled: envEnabled(envMap.popupEnabled),
    sideSkinsEnabled: envEnabled(envMap.sideSkinsEnabled),
    sponsorBackgroundEnabled: envEnabled(envMap.sponsorBackgroundEnabled),
    topAdEnabled: envEnabled(envMap.topAdEnabled),
    midAdEnabled: envEnabled(envMap.midAdEnabled),
    bottomAdEnabled: envEnabled(envMap.bottomAdEnabled),
  };
}

export function getAdControlSettingsFromValues(
  values: Partial<Record<AdSettingKey, boolean>>,
) {
  return {
    adsEnabled: values.ADS_ENABLED ?? true,
    houseAdsEnabled: values.HOUSE_ADS_ENABLED ?? true,
    popupEnabled: values.POPUP_ENABLED ?? true,
    sideSkinsEnabled: values.SIDE_SKINS_ENABLED ?? true,
    sponsorBackgroundEnabled: values.SPONSOR_BACKGROUND_ENABLED ?? true,
    topAdEnabled: values.TOP_AD_ENABLED ?? true,
    midAdEnabled: values.MID_AD_ENABLED ?? true,
    bottomAdEnabled: values.BOTTOM_AD_ENABLED ?? true,
  } satisfies AdControlSettings;
}

export function getAdSettingKey(key: AdControlKey) {
  return envMap[key];
}

export function getAdControlEnvName(key: AdControlKey) {
  return envMap[key];
}

export function isPlacementEnabled(
  placementId: AdPlacementId,
  settings = getAdControlSettings(),
) {
  if (!settings.adsEnabled) {
    return false;
  }

  if (placementId === "popup") {
    return settings.popupEnabled;
  }

  if (placementId === "sideskin-left" || placementId === "sideskin-right") {
    return settings.sideSkinsEnabled;
  }

  if (placementId === "top-sponsor-background") {
    return settings.sponsorBackgroundEnabled;
  }

  if (placementId.endsWith("-top")) {
    return settings.topAdEnabled;
  }

  if (placementId.endsWith("-mid")) {
    return settings.midAdEnabled;
  }

  if (placementId.endsWith("-bottom")) {
    return settings.bottomAdEnabled;
  }

  return true;
}

export function isCampaignTypeEnabled(
  campaignType: AdCampaignType,
  settings = getAdControlSettings(),
) {
  return campaignType !== "house" || settings.houseAdsEnabled;
}
