import type { Metadata } from "next";
import { redirect } from "next/navigation";
import {
  adCampaigns,
  getActiveAdForPlacement,
  type AdCampaign,
  type AdPlacementId,
} from "@/config/ads.config";
import { type AdControlKey } from "@/config/adControls";
import { AdSettingsDashboard } from "@/components/admin/AdSettingsDashboard";
import { getAdvertisingSettings, getAdSettingsAudit } from "@/lib/adSettings";
import { hasAdminSession, isAdminPasswordConfigured } from "@/lib/admin/auth";
import { logoutAction } from "@/app/admin/login/actions";

export const metadata: Metadata = {
  title: "LeedsWire Advertising Controls",
  robots: {
    index: false,
    follow: false,
  },
};

export const dynamic = "force-dynamic";

const placementControls: Array<{ label: string; key: AdControlKey }> = [
  { label: "Top Billboard", key: "topAdEnabled" },
  { label: "Mid Billboard", key: "midAdEnabled" },
  { label: "Bottom Billboard", key: "bottomAdEnabled" },
  { label: "Side Skins", key: "sideSkinsEnabled" },
  { label: "Sponsor Background", key: "sponsorBackgroundEnabled" },
  { label: "Popup", key: "popupEnabled" },
];

const campaignGroups: Array<{ label: string; ids: AdPlacementId[] }> = [
  {
    label: "Top Billboard",
    ids: ["homepage-top", "premier-league-news-top", "media-top"],
  },
  {
    label: "Mid Billboard",
    ids: ["homepage-mid", "premier-league-news-mid", "media-mid"],
  },
  {
    label: "Bottom Billboard",
    ids: ["homepage-bottom", "premier-league-news-bottom", "media-bottom"],
  },
  {
    label: "Side Skins",
    ids: ["sideskin-left", "sideskin-right"],
  },
  {
    label: "Sponsor Background",
    ids: ["top-sponsor-background"],
  },
  {
    label: "Popup",
    ids: ["popup"],
  },
];

function StatusBadge({ enabled, compact = false }: { enabled: boolean; compact?: boolean }) {
  return (
    <span
      className={
        enabled
          ? "inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-bold text-emerald-100 ring-1 ring-emerald-300/20"
          : "inline-flex items-center gap-1.5 rounded-full bg-zinc-500/10 px-2.5 py-1 text-xs font-bold text-zinc-300 ring-1 ring-white/[0.12]"
      }
    >
      <span
        className={
          enabled
            ? "size-1.5 rounded-full bg-emerald-300"
            : "size-1.5 rounded-full bg-zinc-500"
        }
      />
      {enabled ? "Enabled" : "Disabled"}
      {compact ? null : null}
    </span>
  );
}

function SectionHeading({
  eyebrow,
  title,
  description,
}: {
  eyebrow: string;
  title: string;
  description?: string;
}) {
  return (
    <div>
      <p className="text-[0.68rem] font-black uppercase tracking-[0.22em] text-[#ffdd00]/80">
        {eyebrow}
      </p>
      <h2 className="mt-2 text-xl font-semibold tracking-tight text-white sm:text-2xl">
        {title}
      </h2>
      {description ? (
        <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">
          {description}
        </p>
      ) : null}
    </div>
  );
}

function getCampaignPreview(campaign?: AdCampaign | null) {
  if (!campaign) {
    return undefined;
  }

  if (campaign.creativeType === "image" || campaign.creativeType === "gif") {
    return campaign.desktopSrc ?? campaign.mobileSrc;
  }

  return undefined;
}

function CampaignPreview({ campaign }: { campaign?: AdCampaign | null }) {
  const src = getCampaignPreview(campaign);

  if (!src) {
    return (
      <div className="flex size-12 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] text-[0.62rem] font-bold uppercase tracking-[0.12em] text-zinc-500 ring-1 ring-white/[0.08]">
        None
      </div>
    );
  }

  return (
    // Admin previews intentionally render the configured creative as supplied.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt=""
      className="size-12 shrink-0 rounded-lg object-cover ring-1 ring-white/[0.1]"
    />
  );
}

function textValue(value?: string | number | boolean) {
  return value === undefined || value === "" ? "-" : String(value);
}

function clickUrlValue(value?: string) {
  return value ? value : "Not set";
}

function DisabledAdminMessage() {
  return (
    <main className="min-h-screen bg-[#06111f] px-4 py-10 text-white sm:px-6">
      <section className="mx-auto max-w-3xl rounded-xl bg-white/[0.06] p-6 ring-1 ring-white/[0.12]">
        <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffdd00]">
          LeedsWire Admin
        </p>
        <h1 className="mt-4 text-3xl font-semibold tracking-tight">
          Admin access unavailable
        </h1>
        <p className="mt-4 text-sm leading-6 text-zinc-300">
          LEEDSWIRE_ADMIN_PASSWORD is not configured, so advertising controls are
          locked.
        </p>
      </section>
    </main>
  );
}

export default async function AdminAdsPage() {
  if (process.env.NODE_ENV === "production" && !isAdminPasswordConfigured()) {
    return <DisabledAdminMessage />;
  }

  if (!(await hasAdminSession())) {
    redirect("/admin/login");
  }

  const [{ settings, source, warning, updatedAt }, auditEntries] =
    await Promise.all([getAdvertisingSettings(), getAdSettingsAudit(10)]);
  const campaignRows = campaignGroups.map((group) => {
    const configuredCampaigns = adCampaigns.filter((campaign) =>
      group.ids.includes(campaign.placementId),
    );
    const activeCampaigns = group.ids
      .map((placementId) => ({
        placementId,
        campaign: getActiveAdForPlacement(placementId, settings),
      }))
      .filter((item) => Boolean(item.campaign));
    const primary = activeCampaigns[0];

    return {
      ...group,
      activeCount: activeCampaigns.length,
      configuredCount: configuredCampaigns.length,
      configuredClickUrl: configuredCampaigns.find((campaign) => campaign.clickUrl)
        ?.clickUrl,
      primaryPlacementId: primary?.placementId,
      active: primary?.campaign,
    };
  });

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_18%_0%,rgba(255,221,0,0.06),transparent_28%),linear-gradient(180deg,#081b2f_0%,#06111f_46%,#050c17_100%)] px-4 py-6 text-white sm:px-6 lg:px-8">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-col gap-5 border-b border-white/[0.09] pb-6 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-[#ffdd00]">
              LeedsWire Admin
            </p>
            <h1 className="mt-3 text-4xl font-semibold tracking-tight sm:text-5xl">
              Advertising Controls
            </h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-400">
              Live Phase 1.5 controls powered by Supabase. Toggle placements
              on or off without a Vercel redeploy.
            </p>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="h-9 rounded-full bg-white/[0.06] px-4 text-xs font-bold uppercase tracking-[0.14em] text-zinc-200 ring-1 ring-white/[0.12] transition hover:bg-white/[0.1] hover:text-white"
            >
              Logout
            </button>
          </form>
        </div>

        <AdSettingsDashboard
          initialSettings={settings}
          source={source}
          warning={warning}
          updatedAt={updatedAt}
          placementControls={placementControls}
          auditEntries={auditEntries}
        />

        <section className="mt-6 border-t border-white/[0.08] pt-6">
          <SectionHeading
            eyebrow="Campaigns"
            title="Campaign Status"
            description="Grouped view of active campaigns and fallback state by placement type."
          />
          <div className="mt-4 hidden overflow-hidden rounded-xl bg-white/[0.045] ring-1 ring-white/[0.09] lg:block">
            <table className="w-full table-fixed border-collapse">
              <thead className="bg-white/[0.045] text-left">
                <tr>
                  <th className="w-[28%] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Placement
                  </th>
                  <th className="w-[18%] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Status
                  </th>
                  <th className="w-[22%] px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Creative
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                    Click URL
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.07]">
                {campaignRows.map((row) => (
                  <tr key={row.label} className="align-middle">
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-3">
                        <CampaignPreview campaign={row.active} />
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-white">
                            {row.label}
                          </p>
                          <p className="mt-1 truncate text-xs text-zinc-500">
                            {row.primaryPlacementId ?? `${row.configuredCount} configured`}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge enabled={row.activeCount > 0} compact />
                      <p className="mt-1 text-xs text-zinc-500">
                        {row.activeCount > 0
                          ? `${row.activeCount} active`
                          : "Fallback empty"}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="truncate text-sm text-zinc-300">
                        {textValue(row.active?.creativeType)}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {textValue(row.active?.campaignType)}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <p className="truncate text-sm text-zinc-300">
                        {clickUrlValue(row.active?.clickUrl ?? row.configuredClickUrl)}
                      </p>
                      <p className="mt-1 truncate text-xs text-zinc-500">
                        {textValue(row.active?.id)}
                      </p>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="mt-4 grid gap-3 lg:hidden">
            {campaignRows.map((row) => (
              <article
                key={row.label}
                className="rounded-xl bg-white/[0.045] p-4 ring-1 ring-white/[0.09]"
              >
                <div className="flex items-start gap-3">
                  <CampaignPreview campaign={row.active} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate text-sm font-semibold text-white">
                          {row.label}
                        </h3>
                        <p className="mt-1 truncate text-xs text-zinc-500">
                          {row.primaryPlacementId ?? `${row.configuredCount} configured`}
                        </p>
                      </div>
                      <StatusBadge enabled={row.activeCount > 0} compact />
                    </div>
                    <dl className="mt-4 grid gap-3 text-sm">
                      <div>
                        <dt className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                          Creative
                        </dt>
                        <dd className="mt-1 truncate text-zinc-300">
                          {textValue(row.active?.creativeType)}
                        </dd>
                      </div>
                      <div>
                        <dt className="text-xs font-bold uppercase tracking-[0.14em] text-zinc-500">
                          Click URL
                        </dt>
                        <dd className="mt-1 truncate text-zinc-300">
                          {clickUrlValue(
                            row.active?.clickUrl ?? row.configuredClickUrl,
                          )}
                        </dd>
                      </div>
                    </dl>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      </section>
    </main>
  );
}
