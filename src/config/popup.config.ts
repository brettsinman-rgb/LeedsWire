import { getActiveAdForPlacement, type AdCampaign } from "@/config/ads.config";

export type PopupCreativeType = "image" | "gif" | "iframe" | "html" | "tag";

export type PopupConfig = {
  enabled: boolean;
  campaignId?: string;
  campaignType?: AdCampaign["campaignType"];
  campaignName?: string;
  priority?: number;
  creativeType: PopupCreativeType;
  imageUrl?: string;
  iframeUrl?: string;
  html?: string;
  clickUrl?: string;
  showOncePerSession: boolean;
  showDelaySeconds: number;
  forceView: boolean;
  forceViewSeconds: number;
  startDate?: string;
  endDate?: string;
  impressions?: number;
  clicks?: number;
};

const activePopupCampaign = getActiveAdForPlacement("popup");

export function getPopupConfigForCampaign(
  campaign: AdCampaign | null | undefined,
): PopupConfig {
  return {
    enabled: Boolean(campaign),
    campaignId: campaign?.id,
    campaignType: campaign?.campaignType,
    campaignName: campaign?.label ?? "Sponsor popup",
    priority: campaign?.priority ?? 0,
    creativeType:
      campaign?.creativeType === "third-party-tag"
        ? "tag"
        : campaign?.creativeType ?? "image",
    imageUrl:
      campaign?.creativeType === "image" || campaign?.creativeType === "gif"
        ? campaign.desktopSrc
        : undefined,
    iframeUrl:
      campaign?.creativeType === "iframe" ? campaign.desktopSrc : undefined,
    html: campaign?.html,
    clickUrl: campaign?.clickUrl,
    showOncePerSession: true,
    showDelaySeconds: 2,
    forceView: false,
    forceViewSeconds: 3,
    startDate: campaign?.startDate,
    endDate: campaign?.endDate,
    impressions: 0,
    clicks: 0,
  };
}

export const popupConfig: PopupConfig = getPopupConfigForCampaign(activePopupCampaign);
