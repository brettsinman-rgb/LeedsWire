import {
  adCampaigns,
  getActiveAdForPlacement,
  isConfiguredAdAssetAvailable,
  type AdCampaign,
  type AdCampaignType,
  type AdPlacementId,
} from "./ads.config";
import {
  isCampaignTypeEnabled,
  type AdControlKey,
  type AdControlSettings,
} from "./adControls";

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
  previewSrc?: string;
  statusEnabled: boolean;
  statusDetail: string;
  renderReason: string;
};

const campaignTypeLabel: Record<AdCampaignType, string> = {
  paid: "paid",
  affiliate: "affiliate",
  house: "house",
  placeholder: "placeholder",
};

function isInDateWindow(campaign: AdCampaign, now = Date.now()) {
  const startsAt = campaign.startDate
    ? Date.parse(campaign.startDate)
    : Number.NaN;
  const endsAt = campaign.endDate ? Date.parse(campaign.endDate) : Number.NaN;

  if (!Number.isNaN(startsAt) && now < startsAt) {
    return false;
  }

  if (!Number.isNaN(endsAt)) {
    const endOfDay = endsAt + 24 * 60 * 60 * 1000 - 1;

    return now <= endOfDay;
  }

  return true;
}

function getImagePreviewSrc(campaign?: AdCampaign) {
  if (!campaign || (campaign.creativeType !== "image" && campaign.creativeType !== "gif")) {
    return undefined;
  }

  const src = campaign.desktopSrc ?? campaign.mobileSrc;

  return isConfiguredAdAssetAvailable(src) ? src : undefined;
}

function getConfiguredImageCampaign(campaigns: AdCampaign[]) {
  return campaigns.find((campaign) => Boolean(getImagePreviewSrc(campaign)));
}

function getCampaignBlockReason(campaign: AdCampaign, settings: AdControlSettings) {
  const now = Date.now();

  if (!campaign.enabled) {
    return "No active creative";
  }

  if (!isCampaignTypeEnabled(campaign.campaignType, settings)) {
    return campaign.campaignType === "house"
      ? "House fallback disabled"
      : "Campaign type disabled";
  }

  if (campaign.startDate && now < Date.parse(campaign.startDate)) {
    return "Future campaign";
  }

  if (campaign.endDate) {
    const endsAt = Date.parse(campaign.endDate);

    if (!Number.isNaN(endsAt) && now > endsAt + 24 * 60 * 60 * 1000 - 1) {
      return "Expired campaign";
    }
  }

  if (
    (campaign.creativeType === "image" || campaign.creativeType === "gif") &&
    campaign.campaignType !== "house" &&
    !isConfiguredAdAssetAvailable(campaign.desktopSrc ?? campaign.mobileSrc)
  ) {
    return "Missing creative file";
  }

  if (
    campaign.creativeType === "third-party-tag" ||
    campaign.creativeType === "html"
  ) {
    return "No active creative";
  }

  return isInDateWindow(campaign, now) ? "No active creative" : "No active creative";
}

function getGroupBlockReason(
  campaigns: AdCampaign[],
  settings: AdControlSettings,
) {
  const paidOrAffiliate = campaigns.find(
    (campaign) =>
      campaign.campaignType === "paid" || campaign.campaignType === "affiliate",
  );
  const house = campaigns.find((campaign) => campaign.campaignType === "house");

  if (paidOrAffiliate) {
    return getCampaignBlockReason(paidOrAffiliate, settings);
  }

  if (house) {
    return getCampaignBlockReason(house, settings);
  }

  return "No creative configured";
}

function getRenderReason({
  active,
  group,
}: {
  active?: AdCampaign;
  group: CampaignStatusGroup;
}) {
  if (!active) {
    return undefined;
  }

  if (active.campaignType === "house") {
    return "Rendering house image";
  }

  const base =
    active.creativeType === "image" || active.creativeType === "gif"
      ? `Rendering ${campaignTypeLabel[active.campaignType]} image`
      : `Rendering ${campaignTypeLabel[active.campaignType]} creative`;

  return group.key === "sideSkinsEnabled"
    ? `${base} (desktop only; hidden on mobile/tablet)`
    : base;
}

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
    const configuredImage = getConfiguredImageCampaign(configuredCampaigns);
    const configuredPrimary =
      primary?.campaign ??
      configuredImage ??
      configuredCampaigns.find(
        (campaign) =>
          campaign.creativeType === "image" || campaign.creativeType === "gif",
      ) ??
      configuredCampaigns[0];
    const previewSrc =
      getImagePreviewSrc(primary?.campaign) ?? getImagePreviewSrc(configuredImage);
    const statusEnabled = settings.adsEnabled && settings[group.key];
    const inactiveReason = getGroupBlockReason(configuredCampaigns, settings);
    const active = primary?.campaign;
    const statusDetail = !settings.adsEnabled
      ? "Disabled by master ads"
      : !settings[group.key]
        ? configuredCampaigns.length > 0
          ? "Disabled by toggle"
          : "No creative configured"
        : active
          ? active.campaignType === "house"
            ? "House fallback"
            : "Active creative"
          : configuredCampaigns.length > 0
            ? inactiveReason
            : "No creative configured";
    const renderReason = !settings.adsEnabled
      ? "Hidden by master ads"
      : !settings[group.key]
        ? "Hidden by toggle"
        : active
          ? (getRenderReason({ active, group }) ?? "Rendering creative")
          : inactiveReason;

    return {
      ...group,
      activeCount: activeCampaigns.length,
      configuredCount: configuredCampaigns.length,
      configuredClickUrl: configuredCampaigns.find((campaign) => campaign.clickUrl)
        ?.clickUrl,
      primaryPlacementId: primary?.placementId,
      active,
      configuredPrimary,
      previewSrc,
      statusEnabled,
      statusDetail,
      renderReason,
    };
  });
}
