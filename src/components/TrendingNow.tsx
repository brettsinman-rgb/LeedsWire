import { getNewsSource } from "@/config/newsSources";
import { formatRelativeTime } from "@/lib/format";
import type { Article } from "@/types/content";

type TrendingNowProps = {
  articles: Article[];
};

export function TrendingNow({ articles }: TrendingNowProps) {
  return (
    <section className="relative">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="rounded-[1.1rem] bg-white/[0.045] p-3 shadow-[0_18px_55px_rgba(0,0,0,0.18)] ring-1 ring-white/[0.07] backdrop-blur">
          <div className="mb-3 flex items-center justify-between px-1 sm:px-2">
            <div>
              <p className="text-[0.68rem] font-bold uppercase tracking-[0.22em] text-[#ffdd00]">
                Trending Now
              </p>
              <p className="mt-1 text-xs text-zinc-500">
                What Leeds fans are reading now
              </p>
            </div>
          </div>
          <ol className="flex snap-x gap-3 overflow-x-auto pb-1 lg:grid lg:grid-cols-5 lg:overflow-visible lg:pb-0">
            {articles.slice(0, 5).map((article, index) => (
              <li key={article.id} className="min-w-[255px] snap-start lg:min-w-0">
                <a
                  href={article.url}
                  target="_blank"
                  rel="noreferrer"
                  className="group flex h-full gap-3 rounded-xl bg-[#0b1524]/72 p-4 transition hover:-translate-y-0.5 hover:bg-[#111d30]"
                >
                  <span className="font-mono text-xl font-semibold text-[#ffdd00]/85">
                    {index + 1}
                  </span>
                  <span>
                    <span className="line-clamp-2 text-sm font-semibold leading-snug text-white">
                      {article.title}
                    </span>
                    <span className="mt-2 block text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
                      {getNewsSource(article.sourceId)?.name} ·{" "}
                      {formatRelativeTime(article.publishedAt)}
                    </span>
                  </span>
                </a>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </section>
  );
}
