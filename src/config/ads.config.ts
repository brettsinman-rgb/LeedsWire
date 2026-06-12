export type AdPlacementId =
  | "homepage-top"
  | "homepage-mid"
  | "homepage-bottom"
  | "premier-league-news-top"
  | "premier-league-news-mid"
  | "premier-league-news-bottom"
  | "media-top"
  | "media-mid"
  | "media-bottom"
  | "top-sponsor-background"
  | "sideskin-left"
  | "sideskin-right"
  | "popup";

export type DisplayAdPlacementId = Exclude<AdPlacementId, "popup">;
export type AdCampaignType = "paid" | "affiliate" | "house" | "placeholder";
export type AdCreativeType =
  | "image"
  | "gif"
  | "iframe"
  | "third-party-tag"
  | "html";

export type AdCampaign = {
  id: string;
  placementId: AdPlacementId;
  campaignType: AdCampaignType;
  priority: number;
  enabled: boolean;
  creativeType: AdCreativeType;
  desktopSrc?: string;
  mobileSrc?: string;
  html?: string;
  clickUrl?: string;
  startDate?: string;
  endDate?: string;
  label?: string;
};

export type AdFallbackStatus = {
  campaignType: AdCampaignType;
  label: string;
  status: "active" | "available" | "none" | "dev-only";
  campaign?: AdCampaign;
};

type AdSelectionOptions = {
  now?: number;
  development?: boolean;
};

export const adSpecs = {
  topBillboard: "970x250 desktop / 300x100 mobile",
  midBillboard: "970x250 desktop / 300x600 mobile",
  bottomBillboard: "970x250 desktop / 300x250 mobile",
  sideSkins: "160x1080",
  sponsorBackground: "1920x1080",
  popup: "1200x1200",
} as const;

const testAdsEnabled = process.env.NEXT_PUBLIC_LEEDSWIRE_TEST_ADS === "true";
const testPopupEnabled =
  process.env.NEXT_PUBLIC_LEEDSWIRE_TEST_POPUP === "true";
const isDevelopment = process.env.NODE_ENV !== "production";

const pagePrefixes = [
  "homepage",
  "premier-league-news",
  "media",
] as const;

const campaignTypeRank: Record<AdCampaignType, number> = {
  paid: 0,
  affiliate: 1,
  house: 2,
  placeholder: 3,
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

    if (now > endOfDay) {
      return false;
    }
  }

  return true;
}

function createPageCampaigns(): AdCampaign[] {
  return pagePrefixes.flatMap((prefix) => [
    {
      id: `${prefix}-top-paid-preview`,
      placementId: `${prefix}-top`,
      campaignType: "paid",
      priority: 100,
      enabled: testAdsEnabled,
      creativeType: "image",
      desktopSrc: "/ads/homepage-top.jpg",
      mobileSrc: "/ads/homepage-top-mobile.jpg",
      clickUrl: "https://example.com",
      label: "Paid preview top billboard",
    },
    {
      id: `${prefix}-top-house`,
      placementId: `${prefix}-top`,
      campaignType: "house",
      priority: 10,
      enabled: true,
      creativeType: "image",
      desktopSrc: "/ads/house/house-top.jpg",
      mobileSrc: "/ads/house/house-mobile-300x100.jpg",
      clickUrl: "/ad-preview",
      label: "Advertise with LeedsWire",
    },
    {
      id: `${prefix}-mid-paid-preview`,
      placementId: `${prefix}-mid`,
      campaignType: "paid",
      priority: 100,
      enabled: testAdsEnabled,
      creativeType: "image",
      desktopSrc: "/ads/homepage-mid.jpg",
      mobileSrc: "/ads/homepage-mid-mobile.jpg",
      clickUrl: "https://example.com",
      label: "Paid preview mid-page billboard",
    },
    {
      id: `${prefix}-mid-house`,
      placementId: `${prefix}-mid`,
      campaignType: "house",
      priority: 10,
      enabled: true,
      creativeType: "image",
      desktopSrc: "/ads/house/house-mid.jpg",
      mobileSrc: "/ads/house/house-mobile-300x600.jpg",
      clickUrl: "/ad-preview",
      label: "Sponsor this LeedsWire placement",
    },
    {
      id: `${prefix}-bottom-paid-preview`,
      placementId: `${prefix}-bottom`,
      campaignType: "paid",
      priority: 100,
      enabled: testAdsEnabled,
      creativeType: "image",
      desktopSrc: "/ads/homepage-bottom.jpg",
      mobileSrc: "/ads/homepage-bottom-mobile.jpg",
      clickUrl: "https://example.com",
      label: "Paid preview bottom billboard",
    },
    {
      id: `${prefix}-bottom-house`,
      placementId: `${prefix}-bottom`,
      campaignType: "house",
      priority: 10,
      enabled: true,
      creativeType: "image",
      desktopSrc: "/ads/house/house-bottom.jpg",
      mobileSrc: "/ads/house/house-mobile-300x250.jpg",
      clickUrl: "/ad-preview",
      label: "Follow LeedsWire",
    },
  ] satisfies AdCampaign[]);
}

export const adCampaigns: AdCampaign[] = [
  ...createPageCampaigns(),
  {
    id: "sponsor-background-paid-preview",
    placementId: "top-sponsor-background",
    campaignType: "paid",
    priority: 100,
    enabled: testAdsEnabled,
    creativeType: "image",
    desktopSrc: "/ads/top-sponsor-bg.jpg",
    label: "Paid preview sponsor background",
  },
  {
    id: "sideskin-left-paid-preview",
    placementId: "sideskin-left",
    campaignType: "paid",
    priority: 100,
    enabled: testAdsEnabled,
    creativeType: "image",
    desktopSrc: "/ads/side-skin-left.jpg",
    label: "Paid preview left side skin",
  },
  {
    id: "sideskin-right-paid-preview",
    placementId: "sideskin-right",
    campaignType: "paid",
    priority: 100,
    enabled: testAdsEnabled,
    creativeType: "image",
    desktopSrc: "/ads/side-skin-right.jpg",
    label: "Paid preview right side skin",
  },
  {
    id: "popup-paid-preview",
    placementId: "popup",
    campaignType: "paid",
    priority: 100,
    enabled: testPopupEnabled,
    creativeType: "image",
    desktopSrc: "/ads/popup-sponsor.jpg",
    clickUrl: "/news",
    label: "Sponsor popup",
    startDate: "2026-06-01",
    endDate: "2026-06-30",
  },
];

export function isSafeAdUrl(value?: string) {
  if (!value) {
    return false;
  }

  if (value.startsWith("/")) {
    return !value.startsWith("//");
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function isRenderableCreative(campaign: AdCampaign) {
  if (campaign.creativeType === "third-party-tag" || campaign.creativeType === "html") {
    return false;
  }

  if (
    campaign.campaignType === "house" &&
    (campaign.creativeType === "image" || campaign.creativeType === "gif")
  ) {
    return true;
  }

  if (campaign.creativeType === "iframe") {
    return Boolean(campaign.desktopSrc && isSafeAdUrl(campaign.desktopSrc));
  }

  return Boolean(campaign.desktopSrc);
}

export function getCampaignsForPlacement(placementId: AdPlacementId) {
  return adCampaigns.filter((campaign) => campaign.placementId === placementId);
}

export function selectActiveAdForPlacement(
  campaigns: AdCampaign[],
  placementId: AdPlacementId,
  options: AdSelectionOptions = {},
) {
  const now = options.now ?? Date.now();
  const development = options.development ?? isDevelopment;
  const placementCampaigns = campaigns.filter(
    (campaign) => campaign.placementId === placementId,
  );

  const active = placementCampaigns
    .filter((campaign) => campaign.enabled)
    .filter((campaign) => isInDateWindow(campaign, now))
    .filter((campaign) => isRenderableCreative(campaign))
    .sort((a, b) => {
      const typeDifference =
        campaignTypeRank[a.campaignType] - campaignTypeRank[b.campaignType];

      if (typeDifference !== 0) {
        return typeDifference;
      }

      if (b.priority !== a.priority) {
        return b.priority - a.priority;
      }

      return (
        Date.parse(b.startDate ?? "1970-01-01") -
        Date.parse(a.startDate ?? "1970-01-01")
      );
    })[0];

  if (active) {
    return active;
  }

  const houseFallback = placementCampaigns
    .filter((campaign) => campaign.campaignType === "house")
    .filter((campaign) => campaign.enabled)
    .filter((campaign) => isInDateWindow(campaign, now))
    .filter((campaign) => isRenderableCreative(campaign))
    .sort((a, b) => b.priority - a.priority)[0];

  if (houseFallback) {
    return houseFallback;
  }

  if (development) {
    return {
      id: `${placementId}-placeholder`,
      placementId,
      campaignType: "placeholder",
      priority: 0,
      enabled: true,
      creativeType: "image",
      label: "Development placeholder",
    } satisfies AdCampaign;
  }

  return null;
}

export function getActiveAdForPlacement(placementId: AdPlacementId) {
  return selectActiveAdForPlacement(adCampaigns, placementId);
}

export function getFallbackChainForPlacement(
  placementId: AdPlacementId,
): AdFallbackStatus[] {
  const campaigns = getCampaignsForPlacement(placementId);
  const active = getActiveAdForPlacement(placementId);

  const fallbackTypes: Array<{ campaignType: AdCampaignType; label: string }> = [
    { campaignType: "paid", label: "Paid" },
    { campaignType: "affiliate", label: "Affiliate" },
    { campaignType: "house", label: "House" },
    { campaignType: "placeholder", label: "Placeholder" },
  ];

  return fallbackTypes.map(({ campaignType, label }) => {
    if (campaignType === "placeholder") {
      return {
        campaignType,
        label,
        status: isDevelopment ? "dev-only" : "none",
      };
    }

    const campaign = campaigns
      .filter((item) => item.campaignType === campaignType)
      .find((item) => item.enabled && isInDateWindow(item));

    return {
      campaignType,
      label,
      status: campaign?.id === active?.id ? "active" : campaign ? "available" : "none",
      campaign,
    };
  });
}
