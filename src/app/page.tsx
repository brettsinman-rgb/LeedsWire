import { ArticleGrid } from "@/components/ArticleGrid";
import { AdPlacementSet } from "@/components/AdPlacementSet";
import { Hero } from "@/components/Hero";
import { PageShell } from "@/components/PageShell";
import { SectionHeader } from "@/components/SectionHeader";
import { VideoChannelRows } from "@/components/VideoModal";
import { enrichArticleImages } from "@/lib/articleImages";
import { getArticles } from "@/lib/content";
import { getVideoChannelRows } from "@/lib/youtube";

export const revalidate = 300;

export default async function Home() {
  const articles = await enrichArticleImages(await getArticles());
  const topStory = articles[0];
  const latest = topStory
    ? articles.filter((article) => article.id !== topStory.id)
    : [];
  const videoRows = await getVideoChannelRows();

  return (
    <PageShell>
      <AdPlacementSet
        page="homepage"
        placement="top"
        className="bg-[#071827]/35 py-5 shadow-[inset_0_1px_0_rgba(255,255,255,0.06)] sm:py-6"
      />
      {topStory ? <Hero article={topStory} /> : null}
      <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 sm:py-12 lg:px-8">
        <section id="latest" className="pb-10">
          <SectionHeader
            eyebrow="Earlier Stories"
            title="Latest Leeds United News"
            href="/news"
            cta="View all news"
          />
          <ArticleGrid articles={latest.slice(0, 6)} layout="uniform" />
        </section>

        <AdPlacementSet
          page="homepage"
          placement="mid"
          className="pb-10 sm:pb-12"
        />

        <section
          id="media"
          className="overflow-hidden rounded-[1.15rem] bg-[radial-gradient(circle_at_82%_8%,rgba(255,221,0,0.08),transparent_26%),linear-gradient(135deg,rgba(14,29,48,0.88)_0%,rgba(8,24,42,0.84)_100%)] px-5 py-8 shadow-[0_22px_68px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.08] sm:px-8 sm:py-10 lg:px-10"
        >
          <div className="mb-10 flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div>
              <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#ffdd00]/85">
                Club Media
              </p>
              <h2 className="text-4xl font-semibold leading-none tracking-tight text-white sm:text-5xl">
                Club Media
              </h2>
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
          <VideoChannelRows rows={videoRows} />
        </section>

        <AdPlacementSet
          page="homepage"
          placement="bottom"
          className="pt-10 sm:pt-12"
        />
      </div>
    </PageShell>
  );
}
