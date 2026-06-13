import type { Metadata } from "next";
import { AdPlacementSet } from "@/components/AdPlacementSet";
import { MediaChannelNav } from "@/components/MediaChannelNav";
import { PageShell } from "@/components/PageShell";
import { VideoChannelRows } from "@/components/VideoModal";
import { getVideoChannelRows } from "@/lib/youtube";

export const metadata: Metadata = {
  title: "Media",
  description:
    "Leeds United long-form video from official and trusted Leeds channels.",
};

export const dynamic = "force-dynamic";

export default async function MediaPage() {
  const channelRows = await getVideoChannelRows();
  const firstRows = channelRows.slice(0, 2);
  const remainingRows = channelRows.slice(2);

  return (
    <PageShell>
      <AdPlacementSet
        page="media"
        placement="top"
        className="bg-[#071827]/35 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:py-6"
      />
      <div className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6 lg:px-8">
        <section className="rounded-[1.15rem] bg-[radial-gradient(circle_at_82%_8%,rgba(255,221,0,0.08),transparent_26%),linear-gradient(135deg,rgba(14,29,48,0.88)_0%,rgba(8,24,42,0.84)_100%)] px-5 py-8 shadow-[0_22px_68px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.08] sm:px-8 sm:py-10 lg:px-10">
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#ffdd00]/85">
                Club media
              </p>
              <h1 className="text-4xl font-semibold leading-none tracking-tight text-white sm:text-5xl">
                Club Media
              </h1>
              <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
                Latest official and fan videos for Leeds United.
              </p>
            </div>
          </div>
          <div className="mb-8">
            <MediaChannelNav sticky title="Watch by channel" align="start" />
          </div>
          <div className="space-y-12">
            <VideoChannelRows rows={firstRows} />
            <AdPlacementSet page="media" placement="mid" className="py-1" />
            {remainingRows.length > 0 ? (
              <VideoChannelRows rows={remainingRows} />
            ) : null}
            <AdPlacementSet page="media" placement="bottom" className="pt-1" />
          </div>
        </section>
      </div>
    </PageShell>
  );
}
