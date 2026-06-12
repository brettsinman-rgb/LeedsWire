import { ArticleCard } from "@/components/ArticleCard";
import { getNewsSource } from "@/config/newsSources";
import { getArticleCtaUrl } from "@/lib/articleUrls";
import { formatDate } from "@/lib/format";
import type { Article, TransferType } from "@/types/content";

type TransferCentreProps = {
  articles: Article[];
};

const labels: TransferType[] = ["Rumour", "Confirmed", "Contract", "Outgoing"];

function labelFor(article: Article): TransferType {
  return article.transferType ?? "Rumour";
}

export function TransferCentre({ articles }: TransferCentreProps) {
  const [featured, ...latest] = articles;

  if (!featured) {
    return null;
  }

  return (
    <section className="overflow-hidden rounded-[1.15rem] bg-[radial-gradient(circle_at_top_left,rgba(255,221,0,0.085),transparent_32%),linear-gradient(135deg,rgba(14,29,48,0.88)_0%,rgba(8,24,42,0.84)_100%)] p-5 shadow-[0_22px_68px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.08] sm:p-6 lg:p-8">
      <div className="mb-6 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="mb-2 text-xs font-bold uppercase tracking-[0.2em] text-[#ffdd00]/85">
            Transfer Centre
          </p>
          <h2 className="text-3xl font-semibold tracking-tight text-white sm:text-5xl">
            The Leeds window, live.
          </h2>
        </div>
        <div className="grid grid-cols-2 gap-2 sm:flex">
          {labels.map((label) => (
            <span
              key={label}
              className="rounded-full bg-[#101f33]/82 px-3 py-2 text-center text-[0.65rem] font-bold uppercase tracking-[0.13em] text-zinc-400 ring-1 ring-white/[0.08]"
            >
              {label}
            </span>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
        <ArticleCard article={featured} variant="wide" />
        <div className="grid gap-3">
          {latest.slice(0, 4).map((article) => {
            const ctaUrl = getArticleCtaUrl(article);
            const Wrapper = ctaUrl ? "a" : "div";

            return (
              <Wrapper
                key={article.id}
                {...(ctaUrl
                  ? {
                      href: ctaUrl,
                      target: "_blank",
                      rel: "noreferrer",
                    }
                  : {})}
                className="group rounded-xl bg-[#0b1726]/74 p-4 shadow-[0_12px_32px_rgba(0,0,0,0.12)] ring-1 ring-white/[0.06] transition hover:translate-x-1 hover:bg-[#101f33]"
              >
                <div className="mb-3 flex items-center gap-2">
                  <span className="rounded-full bg-[#ffdd00]/12 px-3 py-1 text-[0.62rem] font-bold uppercase tracking-[0.13em] text-[#ffdd00] ring-1 ring-[#ffdd00]/18">
                    {labelFor(article)}
                  </span>
                  <span className="text-[0.65rem] font-bold uppercase tracking-[0.12em] text-zinc-500">
                    {getNewsSource(article.sourceId)?.name} • {formatDate(article.publishedAt)}
                  </span>
                </div>
                <h3 className="text-lg font-semibold leading-tight text-white">
                  {article.title}
                </h3>
              </Wrapper>
            );
          })}
        </div>
      </div>
    </section>
  );
}
