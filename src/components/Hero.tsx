import { SafeImage } from "@/components/SafeImage";
import { getNewsSource } from "@/config/newsSources";
import { getArticleCtaUrl } from "@/lib/articleUrls";
import { formatDate, formatRelativeTime } from "@/lib/format";
import type { Article } from "@/types/content";

type HeroProps = {
  article: Article;
};

function excerpt(value: string) {
  const normalized = value.replace(/\s+/g, " ").trim();

  return normalized.length > 180
    ? `${normalized.slice(0, 177).trimEnd()}...`
    : normalized;
}

export function Hero({ article }: HeroProps) {
  const source = getNewsSource(article.sourceId);
  const ctaUrl = getArticleCtaUrl(article);
  const shortExcerpt = excerpt(article.standfirst);

  return (
    <section className="relative isolate overflow-hidden">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_8%,rgba(255,221,0,0.075),transparent_28%),linear-gradient(180deg,rgba(8,27,47,0.78)_0%,rgba(6,17,31,0)_100%)]" />
      <div className="relative mx-auto max-w-7xl px-4 pb-8 pt-5 sm:px-6 sm:pb-12 lg:px-8">
        <article className="shine-card group relative overflow-hidden rounded-[1.25rem] bg-[#0b1726]/78 shadow-[0_26px_82px_rgba(0,0,0,0.26)] ring-1 ring-white/[0.08] backdrop-blur lg:max-h-[800px]">
          <div className="grid lg:h-[min(70vh,720px)] lg:min-h-[650px] lg:max-h-[720px] lg:grid-cols-[1.35fr_0.82fr]">
            <div className="image-wrap h-[320px] sm:h-[420px] md:h-[500px] lg:h-full lg:min-h-0">
              <SafeImage
                src={article.imageUrl}
                alt=""
                className="h-full w-full object-cover opacity-95 contrast-[1.03] saturate-[0.98] transition duration-1000 group-hover:scale-[1.025]"
              />
              <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(6,17,31,0.08)_0%,rgba(6,17,31,0.02)_54%,rgba(6,17,31,0.46)_100%),linear-gradient(0deg,rgba(6,17,31,0.7)_0%,rgba(6,17,31,0)_46%)]" />
              <div className="absolute bottom-5 left-5 flex flex-wrap items-center gap-2 text-[0.68rem] font-bold uppercase tracking-[0.16em] text-white/85 sm:bottom-7 sm:left-7">
                <span className="rounded-full bg-[#ffdd00]/90 px-3 py-1 text-[#07101d]">
                  Top Story
                </span>
                <span>{source?.name}</span>
                <span className="text-white/35">•</span>
                <time>{formatDate(article.publishedAt)}</time>
              </div>
            </div>
            <div className="flex min-h-[360px] flex-col bg-[linear-gradient(145deg,rgba(14,29,48,0.96)_0%,rgba(8,24,42,0.92)_100%)] p-6 sm:p-8 lg:min-h-0 lg:p-10">
              <div className="flex flex-1 flex-col justify-center overflow-hidden">
                <p className="mb-4 text-xs font-bold uppercase tracking-[0.22em] text-[#ffdd00]">
                  Featured briefing
                </p>
                <h1 className="line-clamp-4 text-4xl font-semibold leading-[1.03] tracking-tight text-white sm:text-5xl lg:text-[3.35rem]">
                  {article.title}
                </h1>
                <p className="mt-5 line-clamp-3 max-w-2xl text-base leading-7 text-zinc-300">
                  {shortExcerpt}
                </p>
              </div>
              <div className="mt-auto pt-8">
                <div className="mb-5 h-px bg-white/[0.08]" />
                <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                  <time className="text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">
                    {formatRelativeTime(article.publishedAt)}
                  </time>
                  {ctaUrl ? (
                    <a
                      href={ctaUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex w-fit items-center gap-3 border-b border-[#ffdd00]/70 pb-1 text-sm font-bold uppercase tracking-[0.16em] text-white transition hover:border-white hover:text-[#ffdd00]"
                    >
                      Read the feature <span className="text-lg leading-none">→</span>
                    </a>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
        </article>
      </div>
    </section>
  );
}
