export type PopupCreativeType = "image" | "iframe" | "html" | "tag";

export type PopupConfig = {
  enabled: boolean;
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

export const popupConfig: PopupConfig = {
  enabled: testPopupEnabled,
  campaignName: "Sponsor popup",
  priority: 1,
  creativeType: "image",
  imageUrl: "/ads/popup-sponsor.jpg",
  clickUrl: testPopupEnabled ? "/news" : "https://example.com",
  showOncePerSession: true,
  showDelaySeconds: testPopupEnabled ? 0.1 : 2,
  forceView: testPopupForceView,
  forceViewSeconds: 3,
  startDate: "2026-06-01",
  endDate: "2026-06-30",
  impressions: 0,
  clicks: 0,
};
