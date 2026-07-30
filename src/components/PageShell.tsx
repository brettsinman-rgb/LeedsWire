import type { ReactNode } from "react";
import { SideSkins } from "@/components/AdSlot";
import { Header } from "@/components/Header";
import { NextFixturePopup } from "@/components/NextFixturePopup";
import { PromotionalPopup } from "@/components/PromotionalPopup";
import { getActiveAdForPlacement } from "@/config/ads.config";
import { isPlacementEnabled } from "@/config/adControls";
import { getPopupConfigForCampaign } from "@/config/popup.config";
import { getActiveCreativeCampaignForPlacement } from "@/lib/adCreatives";
import { getAdvertisingSettings } from "@/lib/adSettings";

type PageShellProps = {
  children: ReactNode;
  pathname?: string;
};

const sideSkinExcludedPathnames = new Set(["/media"]);

export async function PageShell({ children, pathname }: PageShellProps) {
  const { settings } = await getAdvertisingSettings();
  const sideSkinsExcluded = pathname
    ? sideSkinExcludedPathnames.has(pathname)
    : false;
  const sideSkinsEnabled =
    !sideSkinsExcluded &&
    (isPlacementEnabled("sideskin-left", settings) ||
      isPlacementEnabled("sideskin-right", settings));
  const leftCreative = sideSkinsEnabled
    ? await getActiveCreativeCampaignForPlacement("sideskin-left", "left")
    : null;
  const rightCreative = sideSkinsEnabled
    ? await getActiveCreativeCampaignForPlacement("sideskin-right", "right")
    : null;
  const leftSideSkin = sideSkinsEnabled
    ? leftCreative ?? getActiveAdForPlacement("sideskin-left", settings)
    : null;
  const rightSideSkin = sideSkinsEnabled
    ? rightCreative ?? getActiveAdForPlacement("sideskin-right", settings)
    : null;
  const popupEnabled = isPlacementEnabled("popup", settings);
  const popupCreative = popupEnabled
    ? await getActiveCreativeCampaignForPlacement("popup", "default")
    : null;
  const popupCampaign = popupEnabled
    ? popupCreative ?? getActiveAdForPlacement("popup", settings)
    : null;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_12%_0%,rgba(255,221,0,0.07),transparent_26%),radial-gradient(circle_at_88%_8%,rgba(63,119,178,0.16),transparent_31%),linear-gradient(180deg,#081b2f_0%,#071827_38%,#06111f_100%)] text-white">
      <Header />
      <SideSkins
        sideSkinsEnabledOverride={sideSkinsEnabled}
        sideSkinLeftOverride={leftSideSkin}
        sideSkinRightOverride={rightSideSkin}
      />
      {popupEnabled ? (
        <PromotionalPopup config={getPopupConfigForCampaign(popupCampaign)} />
      ) : null}
      <NextFixturePopup />
      <main className="pt-[var(--lw-header-offset)]">{children}</main>
      <footer className="border-t border-white/[0.08] bg-[#071827]/72 px-4 py-10 text-center backdrop-blur sm:py-12">
        <p className="mx-auto max-w-[700px] text-[13px] leading-6 text-[#94A3B8] sm:text-sm">
          LeedsWire aggregates headlines and links to original publishers. All
          articles remain the property of their respective owners.
        </p>
        <p className="mx-auto mt-5 max-w-[700px] text-xs leading-5 text-[#64748B]">
          Questions, feedback or partnership enquiries?{" "}
          <a
            href="mailto:helloleedswire@gmail.com?subject=LeedsWire%20Enquiry"
            className="font-medium text-[#94A3B8] underline decoration-white/20 underline-offset-4 transition-colors hover:text-[#FFDD00] hover:decoration-[#FFDD00]/70"
          >
            Contact Us
          </a>
        </p>
      </footer>
    </div>
  );
}
