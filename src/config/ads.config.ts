export type AdPlacementId =
  | "homepage-top"
  | "homepage-mid"
  | "top-sponsor-background"
  | "sideskin-left"
  | "sideskin-right";

export type AdCreativeType = "image" | "iframe" | "tag";

export type AdConfig = {
  placementId: AdPlacementId;
  desktopSize?: [number, number];
  mobileSize?: [number, number];
  creativeType: AdCreativeType;
  src?: string;
  mobileSrc?: string;
  html?: string;
  clickUrl?: string;
  enabled: boolean;
};

const testAdsEnabled = process.env.NEXT_PUBLIC_LEEDSWIRE_TEST_ADS === "true";

export const adsConfig: AdConfig[] = [
  {
    placementId: "homepage-top",
    desktopSize: [970, 250],
    mobileSize: [300, 100],
    creativeType: "image",
    src: "/ads/homepage-top.jpg",
    mobileSrc: "/ads/homepage-top-mobile.jpg",
    clickUrl: "https://example.com",
    enabled: testAdsEnabled,
  },
  {
    placementId: "homepage-mid",
    desktopSize: [970, 250],
    mobileSize: [300, 250],
    creativeType: "image",
    src: "/ads/homepage-mid.jpg",
    mobileSrc: "/ads/homepage-mid-mobile.jpg",
    clickUrl: "https://example.com",
    enabled: testAdsEnabled,
  },
  {
    placementId: "top-sponsor-background",
    creativeType: "image",
    src: "/ads/top-sponsor-bg.jpg",
    enabled: testAdsEnabled,
  },
  {
    placementId: "sideskin-left",
    desktopSize: [240, 720],
    creativeType: "image",
    src: "/ads/sideskin-left.jpg",
    enabled: testAdsEnabled,
  },
  {
    placementId: "sideskin-right",
    desktopSize: [240, 720],
    creativeType: "image",
    src: "/ads/sideskin-right.jpg",
    enabled: testAdsEnabled,
  },
];

export function getAdConfig(placementId: AdPlacementId) {
  return adsConfig.find((ad) => ad.placementId === placementId);
}
