import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { type AdControlKey } from "@/config/adControls";
import type { CampaignStatusGroup } from "@/config/adCampaignStatus";
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

const campaignGroups: CampaignStatusGroup[] = [
  {
    label: "Top Billboard",
    key: "topAdEnabled",
    ids: ["homepage-top", "premier-league-news-top", "media-top"],
  },
  {
    label: "Mid Billboard",
    key: "midAdEnabled",
    ids: ["homepage-mid", "premier-league-news-mid", "media-mid"],
  },
  {
    label: "Bottom Billboard",
    key: "bottomAdEnabled",
    ids: ["homepage-bottom", "premier-league-news-bottom", "media-bottom"],
  },
  {
    label: "Side Skins",
    key: "sideSkinsEnabled",
    ids: ["sideskin-left", "sideskin-right"],
  },
  {
    label: "Sponsor Background",
    key: "sponsorBackgroundEnabled",
    ids: ["top-sponsor-background"],
  },
  {
    label: "Popup",
    key: "popupEnabled",
    ids: ["popup"],
  },
];

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
          campaignGroups={campaignGroups}
          auditEntries={auditEntries}
        />
      </section>
    </main>
  );
}
