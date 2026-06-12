"use client";

import { useEffect, type CSSProperties } from "react";
import {
  getAdConfig,
  type AdPlacementId,
  type AdConfig,
} from "@/config/ads.config";

type AdSlotProps = {
  placementId: AdPlacementId;
  desktopSize?: [number, number];
  mobileSize?: [number, number];
  className?: string;
  backgroundSponsorImage?: string;
  sideSkinLeft?: string;
  sideSkinRight?: string;
};

function sizeLabel(size?: [number, number]) {
  return size ? `${size[0]} x ${size[1]}` : "Advertisement";
}

function cssSize(size: [number, number]) {
  return {
    "--ad-width": `${size[0]}px`,
    "--ad-height": `${size[1]}px`,
  } as CSSProperties;
}

function trackImpression(placementId: AdPlacementId) {
  if (process.env.NODE_ENV === "development") {
    console.info("[LeedsWire ad impression]", { placementId });
  }
}

function trackClick(placementId: AdPlacementId, clickUrl?: string) {
  if (process.env.NODE_ENV === "development") {
    console.info("[LeedsWire ad click]", { placementId, clickUrl });
  }
}

function ImageCreative({
  ad,
  placementId,
  slot,
}: {
  ad: AdConfig;
  placementId: AdPlacementId;
  slot: "desktop" | "mobile";
}) {
  const src = slot === "mobile" && ad.mobileSrc ? ad.mobileSrc : ad.src;

  if (!src) {
    return null;
  }

  const image = (
    // Ad creatives can be GIF/JPG/PNG and should not be optimized or proxied.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt="Advertisement"
      className="h-full w-full object-cover"
      loading="lazy"
    />
  );

  if (!ad.clickUrl) {
    return image;
  }

  return (
    <a
      href={ad.clickUrl}
      target="_blank"
      rel="noreferrer sponsored"
      className="block h-full w-full"
      onClick={() => trackClick(placementId, ad.clickUrl)}
    >
      {image}
    </a>
  );
}

function IframeCreative({ ad }: { ad: AdConfig }) {
  if (!ad.src) {
    return null;
  }

  return (
    <iframe
      src={ad.src}
      title="Advertisement"
      className="h-full w-full border-0"
      loading="lazy"
      sandbox="allow-popups allow-popups-to-escape-sandbox allow-scripts allow-same-origin"
    />
  );
}

function TagCreative({ ad }: { ad: AdConfig }) {
  return (
    <div
      className="h-full w-full"
      // Placeholder-ready for third-party tags from trusted ad providers.
      dangerouslySetInnerHTML={{ __html: ad.html ?? "" }}
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
  ad,
  placementId,
  desktopSize,
  mobileSize,
  slot,
}: {
  ad?: AdConfig;
  placementId: AdPlacementId;
  desktopSize: [number, number];
  mobileSize: [number, number];
  slot: "desktop" | "mobile";
}) {
  if (!ad?.enabled) {
    return <Placeholder desktopSize={desktopSize} mobileSize={mobileSize} />;
  }

  if ((ad.creativeType === "image" || ad.creativeType === "iframe") && !ad.src) {
    return <Placeholder desktopSize={desktopSize} mobileSize={mobileSize} />;
  }

  if (ad.creativeType === "iframe") {
    return <IframeCreative ad={ad} />;
  }

  if (ad.creativeType === "tag") {
    return <TagCreative ad={ad} />;
  }

  return <ImageCreative ad={ad} placementId={placementId} slot={slot} />;
}

export function AdSlot({
  placementId,
  desktopSize,
  mobileSize,
  className = "",
  backgroundSponsorImage,
}: AdSlotProps) {
  const ad = getAdConfig(placementId);
  const sponsor = backgroundSponsorImage
    ? { src: backgroundSponsorImage, enabled: true }
    : getAdConfig("top-sponsor-background");
  const resolvedDesktop = desktopSize ?? ad?.desktopSize ?? [970, 250];
  const resolvedMobile = mobileSize ?? ad?.mobileSize ?? resolvedDesktop;

  useEffect(() => {
    trackImpression(placementId);
  }, [placementId]);

  return (
    <section
      className={`relative isolate flex justify-center overflow-hidden px-4 ${className}`}
      aria-label="Advertisement"
      data-testid={`adslot-${placementId}`}
    >
      {placementId === "homepage-top" && sponsor?.enabled && sponsor.src ? (
        <div
          className="absolute inset-0 -z-10 bg-cover bg-center opacity-45"
          style={{ backgroundImage: `url(${sponsor.src})` }}
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
          ad={ad}
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
          ad={ad}
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
  const left = sideSkinLeft
    ? { src: sideSkinLeft, enabled: true }
    : getAdConfig("sideskin-left");
  const right = sideSkinRight
    ? { src: sideSkinRight, enabled: true }
    : getAdConfig("sideskin-right");

  useEffect(() => {
    if (left?.enabled) {
      trackImpression("sideskin-left");
    }
    if (right?.enabled) {
      trackImpression("sideskin-right");
    }
  }, [left?.enabled, right?.enabled]);

  if (!left?.enabled && !right?.enabled) {
    return null;
  }

  return (
    <div className="pointer-events-none fixed inset-y-28 z-20 hidden w-full overflow-hidden min-[1440px]:block">
      {left?.enabled && left.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={left.src}
          alt=""
          data-testid="sideskin-left"
          className="pointer-events-auto fixed left-0 top-32 h-[calc(100vh-9rem)] max-h-[720px] w-[min(15vw,240px)] object-cover"
        />
      ) : null}
      {right?.enabled && right.src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={right.src}
          alt=""
          data-testid="sideskin-right"
          className="pointer-events-auto fixed right-0 top-32 h-[calc(100vh-9rem)] max-h-[720px] w-[min(15vw,240px)] object-cover"
        />
      ) : null}
    </div>
  );
}
