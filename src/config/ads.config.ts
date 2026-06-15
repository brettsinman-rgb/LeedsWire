import {
  type AdControlSettings,
  getAdControlSettings,
  isCampaignTypeEnabled,
  isPlacementEnabled,
} from "./adControls";

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
  | "html5"
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

export type AdCreativeAssetDiagnostic = {
  campaignId: string;
  campaignLabel?: string;
  placementId: AdPlacementId;
  campaignType: AdCampaignType;
  slot: "desktop" | "mobile";
  path: string;
  found: boolean;
};

type AdSelectionOptions = {
  now?: number;
  development?: boolean;
  settings?: AdControlSettings;
};

export const adSpecs = {
  topBillboard: "970x250 desktop / 300x100 mobile",
  midBillboard: "970x250 desktop / 300x600 mobile",
  bottomBillboard: "970x250 desktop / 300x250 mobile",
  sideSkins: "160x1080",
  sponsorBackground: "1920x1080",
  popup: "1200x1200",
} as const;

const isDevelopment = process.env.NODE_ENV !== "production";

const pagePrefixes = [
  "homepage",
  "premier-league-news",
  "media",
] as const;

export const knownAdAssetPaths = [
  "/ads/homepage-top.jpg",
  "/ads/homepage-top-mobile.jpg",
  "/ads/homepage-mid.jpg",
  "/ads/homepage-mid-mobile.jpg",
  "/ads/homepage-bottom.jpg",
  "/ads/homepage-bottom-mobile.jpg",
  "/ads/side-skin-left.jpg",
  "/ads/side-skin-right.jpg",
  "/ads/popup-sponsor.jpg",
  "/ads/top-sponsor-bg.jpg",
] as const;

const knownAdAssetPathSet = new Set<string>(knownAdAssetPaths);

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
      enabled: true,
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
      clickUrl: "/ad-preview",
      label: "Advertise with LeedsWire",
    },
    {
      id: `${prefix}-mid-paid-preview`,
      placementId: `${prefix}-mid`,
      campaignType: "paid",
      priority: 100,
      enabled: true,
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
      clickUrl: "/ad-preview",
      label: "Sponsor this LeedsWire placement",
    },
    {
      id: `${prefix}-bottom-paid-preview`,
      placementId: `${prefix}-bottom`,
      campaignType: "paid",
      priority: 100,
      enabled: true,
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
    enabled: true,
    creativeType: "image",
    desktopSrc: "/ads/top-sponsor-bg.jpg",
    clickUrl: "https://www.leedswire.com/advertise",
    label: "Paid preview sponsor background",
  },
  {
    id: "sideskin-left-paid-preview",
    placementId: "sideskin-left",
    campaignType: "paid",
    priority: 100,
    enabled: true,
    creativeType: "image",
    desktopSrc: "/ads/side-skin-left.jpg",
    clickUrl: "https://www.leedswire.com/advertise",
    label: "Paid preview left side skin",
  },
  {
    id: "sideskin-right-paid-preview",
    placementId: "sideskin-right",
    campaignType: "paid",
    priority: 100,
    enabled: true,
    creativeType: "image",
    desktopSrc: "/ads/side-skin-right.jpg",
    clickUrl: "https://www.leedswire.com/advertise",
    label: "Paid preview right side skin",
  },
  {
    id: "popup-paid-preview",
    placementId: "popup",
    campaignType: "paid",
    priority: 100,
    enabled: true,
    creativeType: "image",
    desktopSrc: "/ads/popup-sponsor.jpg",
    clickUrl: "https://www.leedswire.com/advertise",
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

export function isSafeClickUrl(value?: string) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);

    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function getSafeClickUrl(
  value: string | undefined,
  context: { placementId: AdPlacementId; campaignId?: string },
) {
  if (!value) {
    return undefined;
  }

  if (isSafeClickUrl(value)) {
    return value;
  }

  if (process.env.NODE_ENV === "development") {
    console.warn("[LeedsWire ad] invalid click URL ignored", {
      placementId: context.placementId,
      campaignId: context.campaignId,
      clickUrl: value,
    });
  }

  return undefined;
}

export function isLocalAdAssetPath(value?: string) {
  return Boolean(value?.startsWith("/ads/"));
}

export function isConfiguredAdAssetAvailable(value?: string) {
  if (!value) {
    return false;
  }

  if (isLocalAdAssetPath(value)) {
    return knownAdAssetPathSet.has(value);
  }

  return isSafeAdUrl(value);
}

export function isRenderableCreative(campaign: AdCampaign) {
  if (campaign.creativeType === "third-party-tag" || campaign.creativeType === "html") {
    return false;
  }

  if (
    campaign.campaignType === "house" &&
    (campaign.creativeType === "image" || campaign.creativeType === "gif")
  ) {
    return !campaign.desktopSrc || isConfiguredAdAssetAvailable(campaign.desktopSrc);
  }

  if (campaign.creativeType === "iframe") {
    return Boolean(campaign.desktopSrc && isSafeAdUrl(campaign.desktopSrc));
  }

  return Boolean(
    campaign.desktopSrc && isConfiguredAdAssetAvailable(campaign.desktopSrc),
  );
}

export function getCampaignsForPlacement(placementId: AdPlacementId) {
  return adCampaigns.filter((campaign) => campaign.placementId === placementId);
}

export function selectActiveAdForPlacement(
  campaigns: AdCampaign[],
  placementId: AdPlacementId,
  options: AdSelectionOptions = {},
) {
  const settings = options.settings ?? getAdControlSettings();

  if (!isPlacementEnabled(placementId, settings)) {
    return null;
  }

  const now = options.now ?? Date.now();
  const development = options.development ?? isDevelopment;
  const placementCampaigns = campaigns.filter(
    (campaign) => campaign.placementId === placementId,
  );

  const active = placementCampaigns
    .filter((campaign) => campaign.enabled)
    .filter((campaign) => isCampaignTypeEnabled(campaign.campaignType, settings))
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
    .filter((campaign) => isCampaignTypeEnabled(campaign.campaignType, settings))
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

export function getActiveAdForPlacement(
  placementId: AdPlacementId,
  settings?: AdControlSettings,
) {
  return selectActiveAdForPlacement(adCampaigns, placementId, { settings });
}

export function getFallbackChainForPlacement(
  placementId: AdPlacementId,
  settings = getAdControlSettings(),
): AdFallbackStatus[] {
  const campaigns = getCampaignsForPlacement(placementId);
  const active = getActiveAdForPlacement(placementId, settings);

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
        status:
          isDevelopment && isPlacementEnabled(placementId, settings)
            ? "dev-only"
            : "none",
      };
    }

    const campaign = campaigns
      .filter((item) => item.campaignType === campaignType)
      .filter((item) => isCampaignTypeEnabled(item.campaignType, settings))
      .find((item) => item.enabled && isInDateWindow(item));

    return {
      campaignType,
      label,
      status:
        campaign?.id === active?.id && isPlacementEnabled(placementId, settings)
          ? "active"
          : campaign && isPlacementEnabled(placementId, settings)
            ? "available"
            : "none",
      campaign,
    };
  });
}

export function getAdCreativeDiagnostics(
  campaigns: AdCampaign[] = adCampaigns,
): AdCreativeAssetDiagnostic[] {
  return campaigns.flatMap((campaign) => {
    if (campaign.creativeType !== "image" && campaign.creativeType !== "gif") {
      return [];
    }

    return [
      { slot: "desktop" as const, path: campaign.desktopSrc },
      { slot: "mobile" as const, path: campaign.mobileSrc },
    ]
      .filter(
        (creative): creative is { slot: "desktop" | "mobile"; path: string } =>
          Boolean(creative.path && isLocalAdAssetPath(creative.path)),
      )
      .map((creative) => ({
        campaignId: campaign.id,
        campaignLabel: campaign.label,
        placementId: campaign.placementId,
        campaignType: campaign.campaignType,
        slot: creative.slot,
        path: creative.path,
        found: knownAdAssetPathSet.has(creative.path),
      }));
  });
}

export function getMissingAdAssetDiagnostics(
  campaigns: AdCampaign[] = adCampaigns,
) {
  return getAdCreativeDiagnostics(campaigns).filter((item) => !item.found);
}

export function validateConfiguredAdAssets(
  campaigns: AdCampaign[] = adCampaigns,
) {
  const missingAssets = getMissingAdAssetDiagnostics(campaigns);

  for (const asset of missingAssets) {
    console.warn("Missing ad asset:", asset.path, {
      campaign: asset.campaignId,
      placement: asset.placementId,
      slot: asset.slot,
    });
  }

  return missingAssets;
}

validateConfiguredAdAssets();
