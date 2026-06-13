import Image from "next/image";
import { AdPreviewPopupButton } from "@/components/AdPreviewPopupButton";
import { AdSlot } from "@/components/AdSlot";
import { PageShell } from "@/components/PageShell";
import {
  getAdCreativeDiagnostics,
  getActiveAdForPlacement,
  getFallbackChainForPlacement,
  knownAdAssetPaths,
  type AdPlacementId,
} from "@/config/ads.config";

const pageAdGroups = [
  {
    title: "Homepage ads",
    description: "Placements used on the LeedsWire homepage.",
    prefix: "homepage",
  },
  {
    title: "Premier League News ads",
    description: "Placements used on /premier-league-news.",
    prefix: "premier-league-news",
  },
  {
    title: "Media ads",
    description: "Placements used on /media.",
    prefix: "media",
  },
] as const;

const placementLabels: Partial<Record<AdPlacementId, string>> = {
  "homepage-top": "Homepage Top",
  "homepage-mid": "Homepage Mid",
  "homepage-bottom": "Homepage Bottom",
  "premier-league-news-top": "Premier League News Top",
  "premier-league-news-mid": "Premier League News Mid",
  "premier-league-news-bottom": "Premier League News Bottom",
  "media-top": "Media Top",
  "media-mid": "Media Mid",
  "media-bottom": "Media Bottom",
  "top-sponsor-background": "Sponsor Background",
  "sideskin-left": "Side Skin Left",
  "sideskin-right": "Side Skin Right",
  popup: "Popup Sponsor",
};

function fallbackChainLabel(placementId: AdPlacementId) {
  return getFallbackChainForPlacement(placementId)
    .map((item) => `${item.label}: ${item.status}`)
    .join(" -> ");
}

function CampaignSummary({ placementId }: { placementId: AdPlacementId }) {
  const active = getActiveAdForPlacement(placementId);
  const chain = getFallbackChainForPlacement(placementId);

  return (
    <div className="rounded-[0.85rem] border border-white/[0.08] bg-[#071827]/72 p-4 text-sm text-zinc-300">
      <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
        <p>
          <span className="font-bold text-zinc-500">Active:</span>{" "}
          {active ? active.campaignType : "none"}
        </p>
        <p>
          <span className="font-bold text-zinc-500">Campaign:</span>{" "}
          {active?.id ?? "none"}
        </p>
        <p>
          <span className="font-bold text-zinc-500">Creative:</span>{" "}
          {active?.desktopSrc ?? active?.creativeType ?? "text fallback"}
        </p>
        <p>
          <span className="font-bold text-zinc-500">Click URL:</span>{" "}
          {active?.clickUrl ?? "none"}
        </p>
        <p>
          <span className="font-bold text-zinc-500">Priority:</span>{" "}
          {active?.priority ?? "n/a"}
        </p>
        <p>
          <span className="font-bold text-zinc-500">Dates:</span>{" "}
          {active?.startDate ?? "any"} to {active?.endDate ?? "any"}
        </p>
      </div>
      <div className="mt-4">
        <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-[#EFBF04]">
          Fallback chain
        </p>
        <div className="grid gap-2 sm:grid-cols-4">
          {chain.map((item) => (
            <div
              key={item.campaignType}
              className="rounded-full bg-white/[0.05] px-3 py-2 text-xs font-bold uppercase tracking-[0.12em] text-zinc-400 ring-1 ring-white/[0.08]"
            >
              {item.label}: {item.status}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function AdPreviewPage() {
  const diagnostics = getAdCreativeDiagnostics();

  return (
    <PageShell>
      <div className="mx-auto max-w-7xl px-4 pb-16 pt-8 sm:px-6 lg:px-8">
        <header className="mb-8 rounded-[1.15rem] border border-white/[0.08] bg-[radial-gradient(circle_at_top_right,rgba(239,191,4,0.14),transparent_34%),linear-gradient(135deg,rgba(14,29,48,0.88),rgba(7,24,39,0.88))] p-6 shadow-[0_24px_70px_rgba(0,0,0,0.24)] sm:p-8">
          <p className="text-xs font-bold uppercase tracking-[0.2em] text-[#EFBF04]">
            Local preview
          </p>
          <h1 className="mt-3 text-4xl font-semibold tracking-tight text-white sm:text-5xl">
            LeedsWire advertising preview
          </h1>
          <p className="mt-4 max-w-3xl text-base leading-7 text-zinc-300 [overflow-wrap:anywhere]">
            Set NEXT_PUBLIC_LEEDSWIRE_TEST_ADS=true in .env.local to preview
            live ad placements.
          </p>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-zinc-400 [overflow-wrap:anywhere]">
            For popup testing, also set NEXT_PUBLIC_LEEDSWIRE_TEST_POPUP=true
            and NEXT_PUBLIC_LEEDSWIRE_TEST_POPUP_FORCE_VIEW=true.
          </p>
        </header>

        {pageAdGroups.map((group) => (
          <section
            key={group.prefix}
            className="mt-10 space-y-6 first:mt-0"
          >
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#EFBF04]">
                {group.prefix}
              </p>
              <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
                {group.title}
              </h2>
              <p className="mt-2 text-sm text-zinc-400">
                {group.description}
              </p>
            </div>

            <div className="space-y-5">
              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  {group.prefix}-top / 970x250 desktop / 300x100 mobile /
                  sponsor background
                </p>
                <CampaignSummary
                  placementId={`${group.prefix}-top` as AdPlacementId}
                />
                <AdSlot
                  placementId={`${group.prefix}-top` as AdPlacementId}
                  desktopSize={[970, 250]}
                  mobileSize={[300, 100]}
                  className="rounded-[1rem] bg-[#071827]/45 py-6 ring-1 ring-white/[0.08]"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  {group.prefix}-mid / 970x250 desktop / 300x600 mobile
                </p>
                <CampaignSummary
                  placementId={`${group.prefix}-mid` as AdPlacementId}
                />
                <AdSlot
                  placementId={`${group.prefix}-mid` as AdPlacementId}
                  desktopSize={[970, 250]}
                  mobileSize={[300, 600]}
                  className="rounded-[1rem] bg-[#071827]/45 py-6 ring-1 ring-white/[0.08]"
                />
              </div>

              <div>
                <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
                  {group.prefix}-bottom / 970x250 desktop / 300x250 mobile
                </p>
                <CampaignSummary
                  placementId={`${group.prefix}-bottom` as AdPlacementId}
                />
                <AdSlot
                  placementId={`${group.prefix}-bottom` as AdPlacementId}
                  desktopSize={[970, 250]}
                  mobileSize={[300, 250]}
                  className="rounded-[1rem] bg-[#071827]/45 py-6 ring-1 ring-white/[0.08]"
                />
              </div>
            </div>
          </section>
        ))}

        <section className="mt-10 rounded-[1rem] border border-white/[0.08] bg-[#0b1726]/82 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#EFBF04]">
            Side skins
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Desktop-only side skin preview
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            160x1080 Side Skin. Fixed side skins render only at 1664px and
            wider, where there is room for the main content, both skins and
            32px safe gutters. They are hidden below that to avoid overlap or
            horizontal scroll.
          </p>
          <div className="mt-4 grid gap-3 text-xs font-bold uppercase tracking-[0.13em]">
            <p className="rounded-full bg-[#EFBF04]/12 px-3 py-2 text-[#EFBF04] min-[1664px]:hidden">
              Currently hidden at this viewport
            </p>
            <p className="hidden rounded-full bg-[#EFBF04]/12 px-3 py-2 text-[#EFBF04] min-[1664px]:block">
              Currently visible at this viewport
            </p>
          </div>
          <div className="mt-5 hidden gap-4 rounded-[0.85rem] bg-[#071827]/70 p-4 min-[900px]:grid min-[900px]:grid-cols-[160px_1fr_160px]">
            <div>
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
                Left Side Skin
              </p>
              <Image
                src="/ads/side-skin-left.jpg"
                alt="Left side skin creative"
                width={160}
                height={1080}
                className="h-[540px] w-[160px] rounded-[0.65rem] object-cover"
              />
            </div>
            <div className="flex min-h-[480px] items-center justify-center rounded-[0.65rem] border border-dashed border-white/[0.14] text-center text-sm font-semibold uppercase tracking-[0.16em] text-zinc-500">
              Main content safe area with 32px side gutters
            </div>
            <div>
              <p className="mb-3 text-center text-xs font-bold uppercase tracking-[0.14em] text-zinc-400">
                Right Side Skin
              </p>
              <Image
                src="/ads/side-skin-right.jpg"
                alt="Right side skin creative"
                width={160}
                height={1080}
                className="h-[540px] w-[160px] rounded-[0.65rem] object-cover"
              />
            </div>
          </div>
          <p className="mt-4 text-sm text-zinc-500 min-[900px]:hidden">
            Resize to desktop width to view side skin creatives.
          </p>
          <div className="mt-5 grid gap-4 lg:grid-cols-2">
            <CampaignSummary placementId="sideskin-left" />
            <CampaignSummary placementId="sideskin-right" />
          </div>
        </section>

        <section className="mt-10">
          <div className="mb-4">
            <CampaignSummary placementId="popup" />
          </div>
          <AdPreviewPopupButton />
        </section>

        <section className="mt-10 rounded-[1rem] border border-white/[0.08] bg-[#0b1726]/82 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#EFBF04]">
            Asset paths
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Expected local creatives
          </h2>
          <div className="mt-4 grid gap-2 text-sm leading-6 text-zinc-300 sm:grid-cols-2">
            <p>Top Billboard: 970x250 desktop / 300x100 mobile</p>
            <p>Mid Billboard: 970x250 desktop / 300x600 mobile</p>
            <p>Bottom Billboard: 970x250 desktop / 300x250 mobile</p>
            <p>Side Skins: 160x1080</p>
            <p>Sponsor Background: 1920x1080</p>
            <p>Popup: 1200x1200</p>
          </div>
          <div className="mt-5 grid gap-3 sm:grid-cols-2">
            {knownAdAssetPaths.map((asset) => (
              <div
                key={asset}
                className="rounded-[0.65rem] border border-white/[0.08] bg-[#071827]/72 px-4 py-3 font-mono text-xs text-zinc-300 [overflow-wrap:anywhere]"
              >
                {asset}
              </div>
            ))}
          </div>
        </section>

        <section className="mt-10 rounded-[1rem] border border-white/[0.08] bg-[#0b1726]/82 p-5 shadow-[0_18px_50px_rgba(0,0,0,0.22)]">
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#EFBF04]">
            Diagnostics
          </p>
          <h2 className="mt-2 text-2xl font-semibold tracking-tight text-white">
            Configured creative status
          </h2>
          <p className="mt-2 text-sm text-zinc-400">
            Local image paths are checked against the approved files in
            public/ads. Missing creatives fall back before a broken image can
            render.
          </p>
          <div className="mt-5 overflow-x-auto rounded-[0.85rem] border border-white/[0.08]">
            <table className="min-w-[880px] w-full border-collapse text-left text-sm">
              <thead className="bg-white/[0.06] text-xs uppercase tracking-[0.14em] text-zinc-400">
                <tr>
                  <th className="px-4 py-3">Placement</th>
                  <th className="px-4 py-3">Campaign</th>
                  <th className="px-4 py-3">Slot</th>
                  <th className="px-4 py-3">Image path</th>
                  <th className="px-4 py-3">Found</th>
                  <th className="px-4 py-3">Fallback chain</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.08] text-zinc-300">
                {diagnostics.map((item) => (
                  <tr key={`${item.campaignId}-${item.slot}`}>
                    <td className="px-4 py-3 font-semibold text-white">
                      {placementLabels[item.placementId] ?? item.placementId}
                    </td>
                    <td className="px-4 py-3">
                      <span className="block font-medium text-zinc-200">
                        {item.campaignLabel ?? item.campaignId}
                      </span>
                      <span className="mt-1 block font-mono text-xs text-zinc-500">
                        {item.campaignId}
                      </span>
                    </td>
                    <td className="px-4 py-3 uppercase tracking-[0.12em] text-zinc-400">
                      {item.slot}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs [overflow-wrap:anywhere]">
                      {item.path}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-bold uppercase tracking-[0.12em] ${
                          item.found
                            ? "bg-emerald-400/12 text-emerald-300"
                            : "bg-red-400/12 text-red-300"
                        }`}
                      >
                        {item.found ? "true" : "false"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {fallbackChainLabel(item.placementId)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </PageShell>
  );
}
