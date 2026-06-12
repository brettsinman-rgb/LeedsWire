import type { Metadata } from "next";
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

  return (
    <PageShell>
      <main className="mx-auto max-w-[1560px] px-4 py-8 sm:px-6 lg:px-8">
        <section className="overflow-hidden rounded-[1.15rem] bg-[radial-gradient(circle_at_82%_8%,rgba(255,221,0,0.08),transparent_26%),linear-gradient(135deg,rgba(14,29,48,0.88)_0%,rgba(8,24,42,0.84)_100%)] px-5 py-8 shadow-[0_22px_68px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.08] sm:px-8 sm:py-10 lg:px-10">
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
            <a
              href="https://www.youtube.com/results?search_query=Leeds+United"
              target="_blank"
              rel="noreferrer"
              className="inline-flex w-fit items-center justify-center border-b border-white/15 pb-1 text-xs font-bold uppercase tracking-[0.14em] text-zinc-300 transition hover:border-[#ffdd00] hover:text-[#ffdd00]"
            >
              Explore on YouTube <span className="ml-3 text-base">→</span>
            </a>
          </div>
          <VideoChannelRows rows={channelRows} />
        </section>
      </main>
    </PageShell>
  );
}
