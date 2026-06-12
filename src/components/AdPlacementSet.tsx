import { AdSlot } from "@/components/AdSlot";
import type { AdPlacementId } from "@/config/ads.config";

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

export function AdPlacementSet({
  page,
  placement,
  className = "",
}: AdPlacementSetProps) {
  const placementId = `${page}-${placement}` as AdPlacementId;
  const resolvedSizes = sizes[placement];

  return (
    <AdSlot
      placementId={placementId}
      desktopSize={resolvedSizes.desktop}
      mobileSize={resolvedSizes.mobile}
      className={className}
    />
  );
}
