import { getNewsSource } from "@/config/newsSources";
import { getArticleCtaUrl } from "@/lib/articleUrls";
import { formatRelativeTime } from "@/lib/format";
import type { Article } from "@/types/content";
import { SafeImage } from "@/components/SafeImage";
import type { CSSProperties } from "react";

type ArticleCardProps = {
  article: Article;
  variant?: "standard" | "compact" | "wide";
  denseMobile?: boolean;
};

const clamp2Style = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 2,
  overflow: "hidden",
} satisfies CSSProperties;

const clamp3Style = {
  display: "-webkit-box",
  WebkitBoxOrient: "vertical",
  WebkitLineClamp: 3,
  overflow: "hidden",
} satisfies CSSProperties;

export function ArticleCard({
  article,
  variant = "standard",
  denseMobile = false,
}: ArticleCardProps) {
  const source = getNewsSource(article.sourceId);
  const isWide = variant === "wide";
  const categoryLabel = article.transferType ?? (article.category === "transfer" ? "Transfers" : "General");
  const ctaUrl = getArticleCtaUrl(article);
  const Wrapper = ctaUrl ? "a" : "div";
  const shouldHideExcerptOnMobile = denseMobile && !isWide;

  return (
    <article
      className={
        isWide
          ? "shine-card group overflow-hidden rounded-[1.15rem] bg-[#0b1726]/92 shadow-[0_20px_62px_rgba(0,0,0,0.22)] ring-1 ring-white/[0.08] transition duration-300 hover:-translate-y-1 hover:bg-[#0e1d30] hover:shadow-[0_26px_76px_rgba(0,0,0,0.28)] hover:ring-[#ffdd00]/22 lg:max-h-[520px] lg:min-h-[420px]"
          : "shine-card group flex h-full overflow-hidden rounded-[1rem] bg-[#0b1726]/82 shadow-[0_14px_42px_rgba(0,0,0,0.16)] ring-1 ring-white/[0.08] transition duration-300 hover:-translate-y-1 hover:bg-[#101f33] hover:shadow-[0_22px_58px_rgba(0,0,0,0.22)] hover:ring-[#ffdd00]/18"
      }
    >
      <Wrapper
        {...(ctaUrl
          ? {
              href: ctaUrl,
              target: "_blank",
              rel: "noreferrer",
            }
          : {})}
        className={isWide ? "grid gap-0 md:grid-cols-[1.08fr_0.92fr] lg:max-h-[520px] lg:min-h-[420px]" : "flex h-full w-full flex-col"}
      >
        <div
          className={
            isWide
              ? "image-wrap aspect-[1.35] md:aspect-auto lg:max-h-[520px] lg:min-h-[420px]"
              : denseMobile
                ? "image-wrap aspect-[1.2] sm:aspect-video"
                : "image-wrap aspect-video"
          }
        >
          <SafeImage
            src={article.imageUrl}
            alt=""
            className="h-full w-full object-cover opacity-90 contrast-[1.02] saturate-[0.96] transition duration-700 group-hover:scale-[1.035] group-hover:opacity-100"
          />
          <div className="absolute inset-0 bg-[linear-gradient(0deg,rgba(6,17,31,0.62)_0%,rgba(6,17,31,0.05)_52%),linear-gradient(90deg,rgba(6,17,31,0.18)_0%,rgba(6,17,31,0)_42%)]" />
        </div>
        <div
          className={
            isWide
              ? "flex min-h-[360px] flex-col justify-center p-6 sm:p-7 lg:min-h-[420px] lg:max-h-[520px]"
              : denseMobile
                ? "flex flex-1 flex-col p-3 sm:min-h-[260px] sm:p-5"
                : "flex flex-1 flex-col p-4 sm:min-h-[260px] sm:p-5"
          }
        >
          <div
            className={
              denseMobile
                ? "mb-2 flex flex-wrap items-center gap-1.5 sm:mb-3 sm:gap-2"
                : "mb-3 flex flex-wrap items-center gap-2"
            }
          >
            <span
              className={
                denseMobile
                  ? "rounded-full bg-white/[0.055] px-1.5 py-1 text-[0.52rem] font-bold uppercase tracking-[0.04em] text-zinc-300 ring-1 ring-white/[0.08] sm:px-2.5 sm:text-[0.62rem] sm:tracking-[0.13em]"
                  : "rounded-full bg-white/[0.055] px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.13em] text-zinc-300 ring-1 ring-white/[0.08]"
              }
            >
              {source?.name}
            </span>
            <span
              className={
                denseMobile
                  ? "rounded-full bg-[#ffdd00]/8 px-1.5 py-1 text-[0.52rem] font-bold uppercase tracking-[0.04em] text-[#ffdd00]/85 ring-1 ring-[#ffdd00]/20 sm:px-2.5 sm:text-[0.62rem] sm:tracking-[0.14em]"
                  : "rounded-full bg-[#ffdd00]/8 px-2.5 py-1 text-[0.62rem] font-bold uppercase tracking-[0.14em] text-[#ffdd00]/85 ring-1 ring-[#ffdd00]/20"
              }
            >
              {categoryLabel}
            </span>
          </div>
          <h3
            className={
              isWide
                ? "lw-clamp-3 text-2xl font-semibold leading-[1.06] tracking-tight text-white sm:text-3xl lg:text-[2.15rem]"
                : denseMobile
                  ? "lw-clamp-3 text-[0.86rem] font-semibold leading-snug tracking-tight text-white [overflow-wrap:anywhere] sm:text-xl sm:leading-tight"
                  : "lw-clamp-3 text-lg font-semibold leading-tight tracking-tight text-white sm:text-xl"
            }
            style={clamp3Style}
          >
            {article.title}
          </h3>
          {isWide ? (
            <p
              className="lw-clamp-2 mt-4 text-sm leading-6 text-zinc-400 sm:text-base sm:leading-7"
              style={clamp2Style}
            >
              {article.standfirst}
            </p>
          ) : (
            <>
              {shouldHideExcerptOnMobile ? null : (
                <p
                  className="lw-clamp-2 mt-3 text-sm leading-6 text-zinc-500 sm:hidden"
                  style={clamp2Style}
                >
                  {article.standfirst}
                </p>
              )}
              <p
                className={
                  shouldHideExcerptOnMobile
                    ? "lw-clamp-3 lw-mobile-hidden mt-3 text-sm leading-6 text-zinc-500 sm:block"
                    : "lw-clamp-3 mt-3 hidden text-sm leading-6 text-zinc-500 sm:block"
                }
                style={clamp3Style}
              >
                {article.standfirst}
              </p>
            </>
          )}
          <div className={denseMobile ? "mt-auto pt-4 sm:pt-5" : "mt-auto pt-5"}>
            <div className={denseMobile ? "mb-3 h-px bg-white/[0.08] sm:mb-4" : "mb-4 h-px bg-white/[0.08]"} />
            <div className="flex items-center justify-between gap-2 sm:gap-4">
              <time className={denseMobile ? "text-[0.62rem] font-semibold uppercase tracking-[0.08em] text-zinc-500 sm:text-xs sm:tracking-[0.12em]" : "text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500"}>
                {formatRelativeTime(article.publishedAt)}
              </time>
              {ctaUrl ? (
                <span className={denseMobile ? "inline-flex items-center gap-1 text-[0.62rem] font-bold uppercase tracking-[0.08em] text-[#ffdd00]/85 transition group-hover:translate-x-1 group-hover:text-white sm:gap-2 sm:text-xs sm:tracking-[0.12em]" : "inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[0.12em] text-[#ffdd00]/85 transition group-hover:translate-x-1 group-hover:text-white"}>
                  Read
                  <span className="text-base leading-none">→</span>
                </span>
              ) : null}
            </div>
          </div>
        </div>
      </Wrapper>
    </article>
  );
}
