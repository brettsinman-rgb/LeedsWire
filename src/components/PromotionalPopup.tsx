"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { popupConfig, type PopupConfig } from "@/config/popup.config";

const DISMISSED_KEY = "leedswire-popup-dismissed";
const ALLOWED_PATHS = new Set(["/", "/premier-league-news", "/media"]);

function isInDateWindow(config: PopupConfig) {
  const now = Date.now();
  const startsAt = config.startDate ? Date.parse(config.startDate) : Number.NaN;
  const endsAt = config.endDate ? Date.parse(config.endDate) : Number.NaN;

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

function hasCreative(config: PopupConfig) {
  if (config.creativeType === "image") {
    return Boolean(config.imageUrl);
  }

  if (config.creativeType === "iframe") {
    return Boolean(config.iframeUrl);
  }

  return Boolean(config.html);
}

function trackPopup(
  event:
    | "Popup Viewed"
    | "Force View Completed"
    | "Popup Clicked"
    | "Popup Closed",
) {
  if (process.env.NODE_ENV === "development") {
    console.info(`[LeedsWire popup] ${event}`, {
      campaignName: popupConfig.campaignName,
      creativeType: popupConfig.creativeType,
      clickUrl: popupConfig.clickUrl,
    });
  }
}

function Creative({ config }: { config: PopupConfig }) {
  if (config.creativeType === "iframe" && config.iframeUrl) {
    return (
      <iframe
        src={config.iframeUrl}
        title={config.campaignName ?? "Promotional popup"}
        className="aspect-video w-full border-0"
        sandbox="allow-popups allow-popups-to-escape-sandbox allow-scripts allow-same-origin"
      />
    );
  }

  if ((config.creativeType === "html" || config.creativeType === "tag") && config.html) {
    return (
      <div
        className="w-full"
        // Placeholder-ready for trusted HTML5 creative or third-party ad tags.
        dangerouslySetInnerHTML={{ __html: config.html }}
      />
    );
  }

  if (config.creativeType === "image" && config.imageUrl) {
    return (
      // Promo creatives can be JPG, PNG, or GIF and should render as supplied.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={config.imageUrl}
        alt={config.campaignName ?? "Promotional popup"}
        className="h-auto w-full object-contain"
      />
    );
  }

  return null;
}

export function PromotionalPopup() {
  const pathname = usePathname();
  const [isVisible, setIsVisible] = useState(false);
  const [forceViewRemaining, setForceViewRemaining] = useState(0);
  const canClose = !popupConfig.forceView || forceViewRemaining <= 0;
  const canRender = useMemo(
    () =>
      ALLOWED_PATHS.has(pathname) &&
      popupConfig.enabled &&
      hasCreative(popupConfig) &&
      isInDateWindow(popupConfig),
    [pathname],
  );

  useEffect(() => {
    if (!canRender) {
      return;
    }

    if (
      popupConfig.showOncePerSession &&
      window.sessionStorage.getItem(DISMISSED_KEY) === "true"
    ) {
      return;
    }

    const delayMs = Math.max(0, popupConfig.showDelaySeconds ?? 2) * 1000;
    const timeout = window.setTimeout(() => {
      setForceViewRemaining(
        popupConfig.forceView
          ? Math.max(1, Math.ceil(popupConfig.forceViewSeconds ?? 3))
          : 0,
      );
      setIsVisible(true);
      trackPopup("Popup Viewed");
    }, delayMs);

    return () => window.clearTimeout(timeout);
  }, [canRender]);

  useEffect(() => {
    if (!isVisible || !popupConfig.forceView || forceViewRemaining <= 0) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setForceViewRemaining((remaining) => {
        const next = Math.max(0, remaining - 1);

        if (next === 0) {
          trackPopup("Force View Completed");
        }

        return next;
      });
    }, 1000);

    return () => window.clearTimeout(timeout);
  }, [forceViewRemaining, isVisible]);

  useEffect(() => {
    if (!isVisible) {
      return;
    }

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape" && canClose) {
        closePopup();
      }
    }

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  if (!canRender || !isVisible) {
    return null;
  }

  function closePopup() {
    if (!canClose) {
      return;
    }

    if (popupConfig.showOncePerSession) {
      window.sessionStorage.setItem(DISMISSED_KEY, "true");
    }

    setIsVisible(false);
    trackPopup("Popup Closed");
  }

  function handleCreativeClick() {
    if (!popupConfig.clickUrl) {
      return;
    }

    trackPopup("Popup Clicked");
    window.open(popupConfig.clickUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-center justify-center bg-black/60 px-4 py-6 backdrop-blur-md"
      role="dialog"
      aria-modal="true"
      aria-label={popupConfig.campaignName ?? "Promotional popup"}
      data-testid="promo-popup"
    >
      <div className="relative max-h-[88vh] w-full max-w-[800px] overflow-visible">
        {canClose ? (
          <button
            type="button"
            aria-label="Close promotional popup"
            onClick={closePopup}
            data-testid="promo-popup-close"
            className="absolute -right-3 -top-3 z-10 flex size-10 items-center justify-center rounded-full bg-white text-2xl font-semibold leading-none text-[#111111] shadow-[0_8px_24px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.08] transition hover:bg-[#EFBF04] focus:outline-none focus:ring-2 focus:ring-[#EFBF04] focus:ring-offset-2 focus:ring-offset-black"
          >
            ×
          </button>
        ) : (
          <div
            className="absolute -top-12 left-1/2 z-10 -translate-x-1/2 rounded-full bg-white/95 px-4 py-2 text-xs font-bold uppercase tracking-[0.12em] text-[#111111] shadow-[0_8px_24px_rgba(0,0,0,0.22)] ring-1 ring-black/[0.08]"
            data-testid="promo-popup-countdown"
          >
            You can close this in {forceViewRemaining}
          </div>
        )}
        <div className="overflow-hidden rounded-[1.15rem] bg-[#071827] shadow-[0_30px_90px_rgba(0,0,0,0.42)] ring-1 ring-white/[0.12]">
          {popupConfig.clickUrl ? (
            <button
              type="button"
              className="block max-h-[88vh] w-full cursor-pointer overflow-auto text-left"
              onClick={handleCreativeClick}
              aria-label="Open promotion"
              data-testid="promo-popup-creative"
            >
              <Creative config={popupConfig} />
            </button>
          ) : (
            <div className="max-h-[88vh] overflow-auto">
              <Creative config={popupConfig} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
