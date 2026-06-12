"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  getActiveAdForPlacement,
  isSafeAdUrl,
  type AdPlacementId,
  type AdCampaign,
} from "@/config/ads.config";

const SIDE_SKIN_WIDTH = 160;
const SIDE_SKIN_HEIGHT = 1080;
const SIDE_SKIN_SAFE_GAP = 32;
const SIDE_SKIN_CONTENT_WIDTH = 1280;
const SIDE_SKIN_MIN_VIEWPORT =
  SIDE_SKIN_CONTENT_WIDTH + SIDE_SKIN_WIDTH * 2 + SIDE_SKIN_SAFE_GAP * 2;

type AdSlotProps = {
  placementId: AdPlacementId;
  desktopSize?: [number, number];
  mobileSize?: [number, number];
  className?: string;
  backgroundSponsorImage?: string;
  sideSkinLeft?: string;
  sideSkinRight?: string;
};

type OverrideCreative = { src: string; enabled: boolean };

function getCreativeSrc(value?: AdCampaign | OverrideCreative | null) {
  if (!value) {
    return undefined;
  }

  if ("desktopSrc" in value) {
    return value.desktopSrc;
  }

  return "src" in value ? value.src : undefined;
}

function sizeLabel(size?: [number, number]) {
  return size ? `${size[0]} x ${size[1]}` : "Advertisement";
}

function cssSize(size: [number, number]) {
  return {
    "--ad-width": `${size[0]}px`,
    "--ad-height": `${size[1]}px`,
  } as CSSProperties;
}

function trackImpression(placementId: AdPlacementId, campaign?: AdCampaign | null) {
  if (process.env.NODE_ENV === "development") {
    console.info("[LeedsWire ad impression]", {
      placementId,
      campaignId: campaign?.id,
      campaignType: campaign?.campaignType,
      creativeType: campaign?.creativeType,
    });
  }
}

function trackClick(placementId: AdPlacementId, campaign?: AdCampaign | null) {
  if (process.env.NODE_ENV === "development") {
    console.info("[LeedsWire ad click]", {
      placementId,
      campaignId: campaign?.id,
      campaignType: campaign?.campaignType,
      creativeType: campaign?.creativeType,
      clickUrl: campaign?.clickUrl,
    });
  }
}

function HouseCreative({
  campaign,
}: {
  campaign?: AdCampaign | null;
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-[0.85rem] border border-[#efbf04]/30 bg-[radial-gradient(circle_at_top,rgba(239,191,4,0.16),transparent_42%),linear-gradient(135deg,rgba(14,29,48,0.96),rgba(8,24,42,0.94))] px-5 text-center shadow-inner shadow-black/20">
      <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[#efbf04]/90">
        LeedsWire
      </p>
      <p className="mt-3 max-w-[22rem] text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {campaign?.label ?? "Advertise with LeedsWire"}
      </p>
      <p className="mt-3 max-w-[28rem] text-sm leading-6 text-zinc-400">
        Premium placements for Leeds United supporters, sponsors and partners.
      </p>
    </div>
  );
}

function ImageCreative({
  campaign,
  placementId,
  slot,
}: {
  campaign: AdCampaign;
  placementId: AdPlacementId;
  slot: "desktop" | "mobile";
}) {
  const [hasFailed, setHasFailed] = useState(false);
  const src =
    slot === "mobile" && campaign.mobileSrc
      ? campaign.mobileSrc
      : campaign.desktopSrc;

  if (!src || hasFailed) {
    return <HouseCreative campaign={campaign} />;
  }

  const image = (
    // Ad creatives can be GIF/JPG/PNG and should not be optimized or proxied.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={campaign.label ?? "Advertisement"}
      className="h-full w-full object-cover"
      loading="lazy"
      onError={() => setHasFailed(true)}
    />
  );

  if (!campaign.clickUrl || !isSafeAdUrl(campaign.clickUrl)) {
    return image;
  }

  return (
    <a
      href={campaign.clickUrl}
      target="_blank"
      rel="sponsored noopener noreferrer"
      className="block h-full w-full"
      onClick={() => trackClick(placementId, campaign)}
    >
      {image}
    </a>
  );
}

function IframeCreative({ campaign }: { campaign: AdCampaign }) {
  if (!campaign.desktopSrc || !isSafeAdUrl(campaign.desktopSrc)) {
    return <HouseCreative campaign={campaign} />;
  }

  return (
    <iframe
      src={campaign.desktopSrc}
      title={campaign.label ?? "Advertisement"}
      className="h-full w-full border-0"
      loading="lazy"
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-scripts allow-same-origin"
    />
  );
}

function Placeholder({
  desktopSize,
  mobileSize,
}: {
  desktopSize: [number, number];
  mobileSize: [number, number];
}) {
  return (
    <div className="flex h-full w-full flex-col items-center justify-center rounded-[0.85rem] border border-[#efbf04]/30 bg-[radial-gradient(circle_at_top,rgba(239,191,4,0.12),transparent_45%),linear-gradient(135deg,rgba(14,29,48,0.92),rgba(8,24,42,0.9))] text-center shadow-inner shadow-black/20">
      <p className="text-[0.66rem] font-bold uppercase tracking-[0.22em] text-[#efbf04]/90">
        Advertisement
      </p>
      <p className="mt-2 hidden text-sm font-semibold text-zinc-400 sm:block">
        {sizeLabel(desktopSize)} Billboard
      </p>
      <p className="mt-2 text-sm font-semibold text-zinc-400 sm:hidden">
        {sizeLabel(mobileSize)}
      </p>
    </div>
  );
}

function Creative({
  campaign,
  placementId,
  desktopSize,
  mobileSize,
  slot,
}: {
  campaign?: AdCampaign | null;
  placementId: AdPlacementId;
  desktopSize: [number, number];
  mobileSize: [number, number];
  slot: "desktop" | "mobile";
}) {
  if (!campaign) {
    return <Placeholder desktopSize={desktopSize} mobileSize={mobileSize} />;
  }

  if (campaign.campaignType === "house") {
    return <ImageCreative campaign={campaign} placementId={placementId} slot={slot} />;
  }

  if (campaign.creativeType === "iframe") {
    return <IframeCreative campaign={campaign} />;
  }

  if (
    campaign.creativeType === "third-party-tag" ||
    campaign.creativeType === "html"
  ) {
    return <HouseCreative campaign={campaign} />;
  }

  return <ImageCreative campaign={campaign} placementId={placementId} slot={slot} />;
}

export function AdSlot({
  placementId,
  desktopSize,
  mobileSize,
  className = "",
  backgroundSponsorImage,
}: AdSlotProps) {
  const campaign = getActiveAdForPlacement(placementId);
  const sponsor = backgroundSponsorImage
    ? { src: backgroundSponsorImage, enabled: true }
    : getActiveAdForPlacement("top-sponsor-background");
  const sponsorSrc = getCreativeSrc(sponsor);
  const resolvedDesktop = desktopSize ?? [970, 250];
  const resolvedMobile = mobileSize ?? resolvedDesktop;

  useEffect(() => {
    trackImpression(placementId, campaign);
  }, [campaign, placementId]);

  if (!campaign && process.env.NODE_ENV === "production") {
    return null;
  }

  return (
    <section
      className={`relative isolate flex justify-center overflow-hidden px-0 sm:px-4 ${className}`}
      aria-label="Advertisement"
      data-testid={`adslot-${placementId}`}
    >
      {placementId.endsWith("-top") && sponsorSrc ? (
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-45"
          style={{ backgroundImage: `url(${sponsorSrc})` }}
          data-testid="top-sponsor-background"
        />
      ) : null}
      <div
        className="hidden overflow-hidden rounded-[0.85rem] sm:block"
        style={{
          width: resolvedDesktop[0],
          height: resolvedDesktop[1],
          maxWidth: "100%",
          ...cssSize(resolvedDesktop),
        }}
      >
        <Creative
          campaign={campaign}
          placementId={placementId}
          desktopSize={resolvedDesktop}
          mobileSize={resolvedMobile}
          slot="desktop"
        />
      </div>
      <div
        className="overflow-hidden rounded-[0.85rem] sm:hidden"
        style={{
          width: resolvedMobile[0],
          height: resolvedMobile[1],
          maxWidth: "100%",
          ...cssSize(resolvedMobile),
        }}
      >
        <Creative
          campaign={campaign}
          placementId={placementId}
          desktopSize={resolvedDesktop}
          mobileSize={resolvedMobile}
          slot="mobile"
        />
      </div>
    </section>
  );
}

export function SideSkins({
  sideSkinLeft,
  sideSkinRight,
}: Pick<AdSlotProps, "sideSkinLeft" | "sideSkinRight">) {
  const left = useMemo(
    () =>
      sideSkinLeft
        ? { src: sideSkinLeft, enabled: true }
        : getActiveAdForPlacement("sideskin-left"),
    [sideSkinLeft],
  );
  const right = useMemo(
    () =>
      sideSkinRight
        ? { src: sideSkinRight, enabled: true }
        : getActiveAdForPlacement("sideskin-right"),
    [sideSkinRight],
  );

  useEffect(() => {
    if (left) {
      trackImpression("sideskin-left", "id" in left ? left : null);
    }
    if (right) {
      trackImpression("sideskin-right", "id" in right ? right : null);
    }
  }, [left, right]);

  if (!left && !right) {
    return null;
  }

  const leftSrc = getCreativeSrc(left);
  const rightSrc = getCreativeSrc(right);

  const sideSkinStyle = {
    "--side-skin-width": `${SIDE_SKIN_WIDTH}px`,
    "--side-skin-height": `${SIDE_SKIN_HEIGHT}px`,
    "--side-skin-gap": `${SIDE_SKIN_SAFE_GAP}px`,
    "--side-skin-content-width": `${SIDE_SKIN_CONTENT_WIDTH}px`,
  } as CSSProperties;

  return (
    <div
      className="pointer-events-none fixed inset-y-28 z-20 hidden w-full overflow-hidden min-[1664px]:block"
      style={sideSkinStyle}
      data-side-skin-min-viewport={SIDE_SKIN_MIN_VIEWPORT}
    >
      {leftSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={leftSrc}
          alt=""
          data-testid="sideskin-left"
          width={SIDE_SKIN_WIDTH}
          height={SIDE_SKIN_HEIGHT}
          className="pointer-events-auto fixed top-32 h-[var(--side-skin-height)] w-[var(--side-skin-width)] object-cover [left:max(0px,calc((100vw_-_var(--side-skin-content-width))_/_2_-_var(--side-skin-width)_-_var(--side-skin-gap)))]"
        />
      ) : null}
      {rightSrc ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={rightSrc}
          alt=""
          data-testid="sideskin-right"
          width={SIDE_SKIN_WIDTH}
          height={SIDE_SKIN_HEIGHT}
          className="pointer-events-auto fixed top-32 h-[var(--side-skin-height)] w-[var(--side-skin-width)] object-cover [right:max(0px,calc((100vw_-_var(--side-skin-content-width))_/_2_-_var(--side-skin-width)_-_var(--side-skin-gap)))]"
        />
      ) : null}
    </div>
  );
}
