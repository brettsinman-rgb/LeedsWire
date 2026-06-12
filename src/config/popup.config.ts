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

const testPopupEnabled =
  process.env.NEXT_PUBLIC_LEEDSWIRE_TEST_POPUP === "true";
const testPopupForceView =
  process.env.NEXT_PUBLIC_LEEDSWIRE_TEST_POPUP_FORCE_VIEW === "true";
const activePopupCampaign = getActiveAdForPlacement("popup");

export const popupConfig: PopupConfig = {
  enabled: Boolean(activePopupCampaign),
  campaignId: activePopupCampaign?.id,
  campaignType: activePopupCampaign?.campaignType,
  campaignName: activePopupCampaign?.label ?? "Sponsor popup",
  priority: activePopupCampaign?.priority ?? 0,
  creativeType:
    activePopupCampaign?.creativeType === "third-party-tag"
      ? "tag"
      : activePopupCampaign?.creativeType ?? "image",
  imageUrl:
    activePopupCampaign?.creativeType === "image" ||
    activePopupCampaign?.creativeType === "gif"
      ? activePopupCampaign.desktopSrc
      : undefined,
  iframeUrl:
    activePopupCampaign?.creativeType === "iframe"
      ? activePopupCampaign.desktopSrc
      : undefined,
  html: activePopupCampaign?.html,
  clickUrl: activePopupCampaign?.clickUrl,
  showOncePerSession: true,
  showDelaySeconds: testPopupEnabled ? 0.1 : 2,
  forceView: testPopupForceView,
  forceViewSeconds: 3,
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  impressions: 0,
  clicks: 0,
};
