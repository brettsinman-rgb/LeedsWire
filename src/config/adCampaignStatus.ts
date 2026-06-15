import {
  adCampaigns,
  getActiveAdForPlacement,
  type AdCampaign,
  type AdPlacementId,
} from "./ads.config";
import type { AdControlKey, AdControlSettings } from "./adControls";

export type CampaignStatusGroup = {
  label: string;
  key: AdControlKey;
  ids: AdPlacementId[];
};

export type CampaignStatusRow = CampaignStatusGroup & {
  activeCount: number;
  configuredCount: number;
  configuredClickUrl?: string;
  primaryPlacementId?: AdPlacementId;
  active?: AdCampaign;
  configuredPrimary?: AdCampaign;
  statusEnabled: boolean;
  statusDetail: string;
};

export function getCampaignStatusRows(
  settings: AdControlSettings,
  groups: CampaignStatusGroup[],
): CampaignStatusRow[] {
  return groups.map((group) => {
    const configuredCampaigns = adCampaigns.filter((campaign) =>
      group.ids.includes(campaign.placementId),
    );
    const activeCampaigns = group.ids
      .map((placementId) => ({
        placementId,
        campaign: getActiveAdForPlacement(placementId, settings),
      }))
      .filter(
        (item): item is { placementId: AdPlacementId; campaign: AdCampaign } =>
          Boolean(item.campaign),
      );
    const primary = activeCampaigns[0];
    const configuredPrimary =
      primary?.campaign ??
      configuredCampaigns.find(
        (campaign) =>
          campaign.creativeType === "image" || campaign.creativeType === "gif",
      ) ??
      configuredCampaigns[0];
    const statusEnabled = settings.adsEnabled && settings[group.key];
    const statusDetail = !settings.adsEnabled
      ? "Master advertising off"
      : !settings[group.key]
        ? configuredCampaigns.length > 0
          ? "Configured but disabled"
          : "No creative configured"
        : activeCampaigns.length > 0
          ? `${activeCampaigns.length} active`
          : configuredCampaigns.length > 0
            ? "No active creative"
            : "No creative configured";

    return {
      ...group,
      activeCount: activeCampaigns.length,
      configuredCount: configuredCampaigns.length,
      configuredClickUrl: configuredCampaigns.find((campaign) => campaign.clickUrl)
        ?.clickUrl,
      primaryPlacementId: primary?.placementId,
      active: primary?.campaign,
      configuredPrimary,
      statusEnabled,
      statusDetail,
    };
  });
}
