import type { Metadata } from "next";
import { ArticleGrid } from "@/components/ArticleGrid";
import { PageShell } from "@/components/PageShell";
import { SectionHeader } from "@/components/SectionHeader";
import { TransferCentre } from "@/components/TransferCentre";
import { enrichArticleImages } from "@/lib/articleImages";
import { getTransferArticles } from "@/lib/content";

export const metadata: Metadata = {
  title: "Transfers",
  description:
    "Leeds United transfer rumours, done deals, contracts and outgoing news.",
};

export const revalidate = 300;

export default async function TransfersPage() {
  const transfers = await enrichArticleImages(await getTransferArticles());

  return (
    <PageShell>
      <section className="bg-[radial-gradient(circle_at_top_left,rgba(255,221,0,0.08),transparent_32%),linear-gradient(180deg,rgba(11,22,38,0.82)_0%,rgba(5,7,11,0)_100%)]">
        <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
          <p className="mb-3 text-xs font-bold uppercase tracking-[0.22em] text-[#ffdd00]/85">
            Transfer centre
          </p>
          <h1 className="max-w-4xl text-4xl font-semibold leading-[1.02] tracking-tight text-white sm:text-6xl">
            The Leeds window, separated from the noise.
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-7 text-zinc-300">
            Rumours, done deals, contract updates and outgoing stories filtered
            for Leeds United relevance before publication.
          </p>
        </div>
      </section>
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <TransferCentre articles={transfers} />
        <div className="mt-12">
          <SectionHeader eyebrow="Latest file" title="All Transfer Stories" />
          <ArticleGrid articles={transfers} />
        </div>
      </div>
    </PageShell>
  );
}
