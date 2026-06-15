"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import {
  getActiveAdForPlacement,
  getSafeClickUrl,
  isConfiguredAdAssetAvailable,
  isSafeAdUrl,
  type AdPlacementId,
  type AdCampaign,
} from "@/config/ads.config";
import { isPlacementEnabled } from "@/config/adControls";
import { appendHtml5ClickTags } from "@/lib/adHtml5";

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
  campaignOverride?: AdCampaign | null;
  mobileCampaignOverride?: AdCampaign | null;
  sponsorOverride?: AdCampaign | OverrideCreative | null;
  placementEnabledOverride?: boolean;
  sponsorEnabledOverride?: boolean;
  sideSkinsEnabledOverride?: boolean;
  sideSkinLeftOverride?: AdCampaign | OverrideCreative | null;
  sideSkinRightOverride?: AdCampaign | OverrideCreative | null;
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

function getCreativeClickUrl(
  value: AdCampaign | OverrideCreative | null | undefined,
  placementId: AdPlacementId,
) {
  if (!value || !("clickUrl" in value)) {
    return undefined;
  }

  return getSafeClickUrl(value.clickUrl, {
    placementId,
    campaignId: value.id,
  });
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

  if (!src || !isConfiguredAdAssetAvailable(src) || hasFailed) {
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

function Html5Creative({ campaign }: { campaign: AdCampaign }) {
  if (!campaign.desktopSrc || !isSafeAdUrl(campaign.desktopSrc)) {
    return <HouseCreative campaign={campaign} />;
  }

  return (
    <iframe
      src={appendHtml5ClickTags(campaign.desktopSrc, campaign.clickUrl)}
      title={campaign.label ?? "Advertisement"}
      className="h-full w-full border-0"
      loading="lazy"
      scrolling="no"
      sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
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

  if (campaign.creativeType === "html5" || campaign.creativeType === "iframe") {
    return <Html5Creative campaign={campaign} />;
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
  campaignOverride,
  mobileCampaignOverride,
  sponsorOverride,
  placementEnabledOverride,
  sponsorEnabledOverride,
}: AdSlotProps) {
  const placementEnabled =
    placementEnabledOverride ?? isPlacementEnabled(placementId);
  const sponsorEnabled =
    sponsorEnabledOverride ?? isPlacementEnabled("top-sponsor-background");
  const campaign =
    campaignOverride === undefined
      ? getActiveAdForPlacement(placementId)
      : campaignOverride;
  const mobileCampaign =
    mobileCampaignOverride === undefined ? campaign : mobileCampaignOverride ?? campaign;
  const sponsor =
    sponsorOverride !== undefined
      ? sponsorOverride
      : !sponsorEnabled
        ? null
        : backgroundSponsorImage
          ? { src: backgroundSponsorImage, enabled: true }
          : getActiveAdForPlacement("top-sponsor-background");
  const sponsorSrc = getCreativeSrc(sponsor);
  const sponsorClickUrl = getCreativeClickUrl(sponsor, "top-sponsor-background");
  const sponsorCampaign = sponsor && "desktopSrc" in sponsor ? sponsor : null;
  const sponsorIsHtml5 =
    sponsorCampaign?.creativeType === "html5" ||
    sponsorCampaign?.creativeType === "iframe";
  const safeSponsorSrc =
    sponsorSrc && isConfiguredAdAssetAvailable(sponsorSrc)
      ? sponsorSrc
      : undefined;
  const resolvedDesktop = desktopSize ?? [970, 250];
  const resolvedMobile = mobileSize ?? resolvedDesktop;

  useEffect(() => {
    trackImpression(placementId, campaign);
  }, [campaign, placementId]);

  if (!placementEnabled || (!campaign && process.env.NODE_ENV === "production")) {
    return null;
  }

  return (
    <section
      className={`relative isolate flex justify-center overflow-hidden px-0 sm:px-4 ${className}`}
      aria-label="Advertisement"
      data-testid={`adslot-${placementId}`}
    >
      {placementId.endsWith("-top") && safeSponsorSrc ? (
        sponsorIsHtml5 ? (
          <iframe
            src={appendHtml5ClickTags(safeSponsorSrc, sponsorClickUrl)}
            title={sponsorCampaign?.label ?? "Sponsor background"}
            className="absolute inset-0 z-0 h-full w-full border-0 opacity-45"
            scrolling="no"
            sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
            data-testid="top-sponsor-background"
          />
        ) : sponsorClickUrl ? (
          <a
            href={sponsorClickUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="absolute inset-0 z-0 bg-cover bg-center opacity-45"
            style={{ backgroundImage: `url(${safeSponsorSrc})` }}
            data-testid="top-sponsor-background"
            aria-label="Open sponsor background"
            onClick={() =>
              trackClick(
                "top-sponsor-background",
                sponsor && "id" in sponsor ? sponsor : null,
              )
            }
          />
        ) : (
          <div
            className="absolute inset-0 z-0 bg-cover bg-center opacity-45"
            style={{ backgroundImage: `url(${safeSponsorSrc})` }}
            data-testid="top-sponsor-background"
          />
        )
      ) : null}
      <div
        className="relative z-10 hidden overflow-hidden rounded-[0.85rem] sm:block"
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
        className="relative z-10 overflow-hidden rounded-[0.85rem] sm:hidden"
        style={{
          width: resolvedMobile[0],
          height: resolvedMobile[1],
          maxWidth: "100%",
          ...cssSize(resolvedMobile),
        }}
      >
        <Creative
          campaign={mobileCampaign}
          placementId={placementId}
          desktopSize={resolvedDesktop}
          mobileSize={resolvedMobile}
          slot="mobile"
        />
      </div>
    </section>
  );
}

function SideSkinImage({
  campaign,
  fallbackSrc,
  side,
}: {
  campaign?: AdCampaign | null;
  fallbackSrc?: string;
  side: "left" | "right";
}) {
  const [hasFailed, setHasFailed] = useState(false);
  const src = campaign?.desktopSrc ?? fallbackSrc;
  const clickUrl = getSafeClickUrl(campaign?.clickUrl, {
    placementId: side === "left" ? "sideskin-left" : "sideskin-right",
    campaignId: campaign?.id,
  });

  if (!isConfiguredAdAssetAvailable(src) || hasFailed) {
    return null;
  }

  const creative =
    campaign?.creativeType === "html5" || campaign?.creativeType === "iframe" ? (
      <iframe
        src={appendHtml5ClickTags(src ?? "", clickUrl)}
        title={`${side} side skin sponsor`}
        data-testid={`sideskin-${side}`}
        width={SIDE_SKIN_WIDTH}
        height={SIDE_SKIN_HEIGHT}
        className="h-full w-full border-0"
        scrolling="no"
        sandbox="allow-scripts allow-popups allow-popups-to-escape-sandbox"
      />
    ) : (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      data-testid={`sideskin-${side}`}
      width={SIDE_SKIN_WIDTH}
      height={SIDE_SKIN_HEIGHT}
      onError={() => setHasFailed(true)}
      className="h-full w-full object-cover"
    />
    );

  const positionClass =
    side === "left"
      ? "[left:max(0px,calc((100vw_-_var(--side-skin-content-width))_/_2_-_var(--side-skin-width)_-_var(--side-skin-gap)))]"
      : "[right:max(0px,calc((100vw_-_var(--side-skin-content-width))_/_2_-_var(--side-skin-width)_-_var(--side-skin-gap)))]";

  if (!clickUrl) {
    return (
      <div
        className={`pointer-events-auto fixed top-32 h-[var(--side-skin-height)] w-[var(--side-skin-width)] ${positionClass}`}
      >
        {creative}
      </div>
    );
  }

  if (campaign?.creativeType === "html5" || campaign?.creativeType === "iframe") {
    return (
      <div
        className={`pointer-events-auto fixed top-32 h-[var(--side-skin-height)] w-[var(--side-skin-width)] ${positionClass}`}
      >
        {creative}
      </div>
    );
  }

  return (
    <a
      href={clickUrl}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={`Open ${side} side skin sponsor`}
      className={`pointer-events-auto fixed top-32 h-[var(--side-skin-height)] w-[var(--side-skin-width)] ${positionClass}`}
      onClick={() =>
        trackClick(side === "left" ? "sideskin-left" : "sideskin-right", campaign)
      }
    >
      {creative}
    </a>
  );
}

function getSideSkinCampaign(value: AdCampaign | OverrideCreative | null) {
  return value && "desktopSrc" in value ? value : null;
}

function getSideSkinFallbackSrc(value: AdCampaign | OverrideCreative | null) {
  return value && "src" in value ? value.src : undefined;
}

export function SideSkins({
  sideSkinLeft,
  sideSkinRight,
  sideSkinsEnabledOverride,
  sideSkinLeftOverride,
  sideSkinRightOverride,
}: Pick<
  AdSlotProps,
  | "sideSkinLeft"
  | "sideSkinRight"
  | "sideSkinsEnabledOverride"
  | "sideSkinLeftOverride"
  | "sideSkinRightOverride"
>) {
  const sideSkinsEnabled =
    sideSkinsEnabledOverride ??
    (isPlacementEnabled("sideskin-left") || isPlacementEnabled("sideskin-right"));
  const left = useMemo(
    () =>
      sideSkinLeftOverride !== undefined
        ? sideSkinLeftOverride
        : !sideSkinsEnabled
          ? null
          : sideSkinLeft
            ? { src: sideSkinLeft, enabled: true }
            : getActiveAdForPlacement("sideskin-left"),
    [sideSkinLeft, sideSkinLeftOverride, sideSkinsEnabled],
  );
  const right = useMemo(
    () =>
      sideSkinRightOverride !== undefined
        ? sideSkinRightOverride
        : !sideSkinsEnabled
          ? null
          : sideSkinRight
            ? { src: sideSkinRight, enabled: true }
            : getActiveAdForPlacement("sideskin-right"),
    [sideSkinRight, sideSkinRightOverride, sideSkinsEnabled],
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
      {left ? (
        <SideSkinImage
          campaign={getSideSkinCampaign(left)}
          fallbackSrc={getSideSkinFallbackSrc(left)}
          side="left"
        />
      ) : null}
      {right ? (
        <SideSkinImage
          campaign={getSideSkinCampaign(right)}
          fallbackSrc={getSideSkinFallbackSrc(right)}
          side="right"
        />
      ) : null}
    </div>
  );
}
