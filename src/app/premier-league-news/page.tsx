import type { Metadata } from "next";
import { ArticleGrid } from "@/components/ArticleGrid";
import { PageShell } from "@/components/PageShell";
import { getPremierLeagueArticles } from "@/lib/premierLeague";

export const metadata: Metadata = {
  title: "Premier League News",
  description: "Latest Premier League stories from BBC Sport.",
};

export const revalidate = 1800;

export default async function PremierLeagueNewsPage() {
  const articles = await getPremierLeagueArticles();

  return (
    <PageShell>
      <section className="bg-[radial-gradient(circle_at_18%_0%,rgba(255,221,0,0.09),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(63,119,178,0.14),transparent_34%),linear-gradient(180deg,rgba(11,23,38,0.78)_0%,rgba(7,24,39,0.24)_74%,rgba(7,24,39,0)_100%)]">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#ffdd00]/85">
              Premier League News
            </p>
            <h1 className="text-4xl font-semibold leading-[1.03] tracking-tight text-white sm:text-5xl">
              Latest Premier League News
            </h1>
            <p className="mt-5 text-base leading-7 text-zinc-300 sm:text-lg">
              Latest Premier League stories from BBC Sport.
            </p>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
        {articles.length > 0 ? (
          <ArticleGrid articles={articles} layout="uniform" />
        ) : (
          <div className="rounded-[1rem] bg-[#0b1726]/82 p-8 text-sm font-semibold text-zinc-400 ring-1 ring-white/[0.08]">
            Premier League stories are temporarily unavailable.
          </div>
        )}
      </div>
    </PageShell>
  );
}
