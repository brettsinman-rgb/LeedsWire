import type { Metadata } from "next";
import { ArticleGrid } from "@/components/ArticleGrid";
import { PageShell } from "@/components/PageShell";
import { enrichArticleImages } from "@/lib/articleImages";
import { getArticles } from "@/lib/content";

export const metadata: Metadata = {
  title: "News Archive",
  description: "Latest Leeds United football news from trusted local, club and national sources.",
};

export default async function NewsArchivePage() {
  const articles = await enrichArticleImages(await getArticles());

  return (
    <PageShell>
      <section className="bg-[radial-gradient(circle_at_18%_0%,rgba(255,221,0,0.09),transparent_28%),radial-gradient(circle_at_82%_8%,rgba(63,119,178,0.14),transparent_34%),linear-gradient(180deg,rgba(11,23,38,0.78)_0%,rgba(7,24,39,0.24)_74%,rgba(7,24,39,0)_100%)]">
        <div className="mx-auto max-w-7xl px-4 pb-8 pt-10 sm:px-6 sm:pb-10 sm:pt-14 lg:px-8">
          <div className="max-w-3xl">
            <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#ffdd00]/85">
              News Archive
            </p>
            <h1 className="text-4xl font-semibold leading-[1.03] tracking-tight text-white sm:text-5xl">
              All Leeds United Stories
            </h1>
            <p className="mt-5 text-base leading-7 text-zinc-300 sm:text-lg">
              Latest Leeds United news, transfers, official updates and
              fan-focused coverage.
            </p>
          </div>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 pb-14 pt-8 sm:px-6 sm:pb-16 sm:pt-10 lg:px-8">
        <ArticleGrid articles={articles} layout="uniform" />
      </div>
    </PageShell>
  );
}
