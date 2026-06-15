import { AdSlot } from "@/components/AdSlot";
import {
  getActiveAdForPlacement,
  type AdPlacementId,
} from "@/config/ads.config";
import { isPlacementEnabled } from "@/config/adControls";
import {
  getActiveCreativeCampaignForPlacement,
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
  const managedPlacementId = placementId as ManagedAdPlacement;
  const desktopCreative = await getActiveCreativeCampaignForPlacement(
    managedPlacementId,
    "desktop",
  );
  const mobileCreative = await getActiveCreativeCampaignForPlacement(
    managedPlacementId,
    "mobile",
  );
  const sponsorCreative = sponsorEnabled
    ? await getActiveCreativeCampaignForPlacement("top-sponsor-background", "default")
    : null;
  const fallbackCampaign = getActiveAdForPlacement(placementId, settings);
  const campaign = desktopCreative ?? fallbackCampaign;
  const mobileCampaign = mobileCreative ?? desktopCreative ?? fallbackCampaign;
  const sponsor = sponsorEnabled
    ? sponsorCreative ?? getActiveAdForPlacement("top-sponsor-background", settings)
    : null;

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
