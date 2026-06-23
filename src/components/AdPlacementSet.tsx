import { AdSlot } from "@/components/AdSlot";
import {
  getActiveAdForPlacement,
  type AdPlacementId,
} from "@/config/ads.config";
import { isPlacementEnabled } from "@/config/adControls";
import {
  getActiveCreativeCampaignForPlacement,
  isManagedAdPlacement,
  type ManagedAdPlacement,
} from "@/lib/adCreatives";
import { getAdvertisingSettings } from "@/lib/adSettings";

type PageAdPrefix = "homepage" | "premier-league-news" | "media";
type AdPlacementKind = "top" | "mid" | "bottom";

type AdPlacementSetProps = {
  page: PageAdPrefix;
  placement: AdPlacementKind;
  className?: string;
};

const sizes = {
  top: {
    desktop: [970, 250],
    mobile: [300, 100],
  },
  mid: {
    desktop: [970, 250],
    mobile: [300, 600],
  },
  bottom: {
    desktop: [970, 250],
    mobile: [300, 250],
  },
} satisfies Record<
  AdPlacementKind,
  { desktop: [number, number]; mobile: [number, number] }
>;

function getCreativePlacementId({
  page,
  placement,
  variant,
}: {
  page: PageAdPrefix;
  placement: AdPlacementKind;
  variant: "desktop" | "mobile";
}) {
  if (variant === "desktop" && placement === "bottom") {
    return "homepage-bottom" satisfies ManagedAdPlacement;
  }

  const placementId = `${page}-${placement}`;

  return isManagedAdPlacement(placementId) ? placementId : null;
}

function logResolvedCreative({
  placementId,
  variant,
  creative,
}: {
  placementId: AdPlacementId;
  variant: "desktop" | "mobile";
  creative: Awaited<ReturnType<typeof getActiveCreativeCampaignForPlacement>>;
}) {
  if (process.env.NODE_ENV !== "development") {
    return;
  }

  console.info("[LeedsWire ad creative resolved]", {
    placementId,
    variant,
    creativeId: creative?.id ?? null,
    fileUrl: creative?.desktopSrc ?? null,
  });
}

export async function AdPlacementSet({
  page,
  placement,
  className = "",
}: AdPlacementSetProps) {
  const placementId = `${page}-${placement}` as AdPlacementId;
  const resolvedSizes = sizes[placement];
  const { settings } = await getAdvertisingSettings();
  const placementEnabled = isPlacementEnabled(placementId, settings);
  const sponsorEnabled = isPlacementEnabled("top-sponsor-background", settings);
  const desktopCreativePlacementId = getCreativePlacementId({
    page,
    placement,
    variant: "desktop",
  });
  const mobileCreativePlacementId = getCreativePlacementId({
    page,
    placement,
    variant: "mobile",
  });
  const desktopCreative = desktopCreativePlacementId
    ? await getActiveCreativeCampaignForPlacement(
        desktopCreativePlacementId,
        "desktop",
      )
    : null;
  const mobileCreative = mobileCreativePlacementId
    ? await getActiveCreativeCampaignForPlacement(
        mobileCreativePlacementId,
        "mobile",
      )
    : null;
  const sponsorCreative = sponsorEnabled
    ? await getActiveCreativeCampaignForPlacement("top-sponsor-background", "default")
    : null;
  const fallbackCampaign = getActiveAdForPlacement(placementId, settings);
  const campaign = desktopCreative ?? fallbackCampaign;
  const mobileCampaign =
    mobileCreative ?? (mobileCreativePlacementId ? desktopCreative : null) ?? fallbackCampaign;
  const sponsor = sponsorEnabled
    ? sponsorCreative ?? getActiveAdForPlacement("top-sponsor-background", settings)
    : null;

  logResolvedCreative({
    placementId,
    variant: "desktop",
    creative: desktopCreative,
  });
  logResolvedCreative({
    placementId,
    variant: "mobile",
    creative: mobileCreative,
  });

  return (
    <AdSlot
      placementId={placementId}
      desktopSize={resolvedSizes.desktop}
      mobileSize={resolvedSizes.mobile}
      className={className}
      campaignOverride={campaign}
      mobileCampaignOverride={mobileCampaign}
      sponsorOverride={sponsor}
      placementEnabledOverride={placementEnabled}
      sponsorEnabledOverride={sponsorEnabled}
    />
  );
}
