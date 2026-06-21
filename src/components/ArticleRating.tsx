"use client";

import { useEffect, useMemo, useState } from "react";
import {
  emptyArticleRatingCounts,
  getArticleRating,
  getOptimisticArticleRatingCounts,
  rateArticle,
  type ArticleRatingCounts,
  type ArticleRatingValue,
} from "@/lib/articleRatings";
import type { Article } from "@/types/content";

type ArticleRatingProps = {
  article: Pick<Article, "id" | "sourceId" | "category" | "tags">;
  dense?: boolean;
};

const ratingOptions = [
  {
    value: "worth_reading",
    label: "Worth Reading",
    mobileLabel: "Top Read",
    icon: "🔥",
    className:
      "border-[#3f77b2]/55 bg-transparent text-[#b9d8ff] hover:border-[#3f77b2]/80 hover:bg-[#3f77b2]/8",
    activeClassName: "border-[#3f77b2] bg-[#3f77b2] text-white",
  },
  {
    value: "must_read",
    label: "Must Read",
    mobileLabel: "Good Un",
    icon: "💛",
    className:
      "border-[#ffdd00]/55 bg-transparent text-[#ffed75] hover:border-[#ffdd00]/80 hover:bg-[#ffdd00]/8",
    activeClassName: "border-[#ffdd00] bg-[#ffdd00] text-[#07101d]",
  },
  {
    value: "skip",
    label: "Skip",
    mobileLabel: "Nah",
    icon: "😴",
    className:
      "border-white/[0.16] bg-transparent text-zinc-400 hover:border-white/[0.28] hover:bg-white/[0.055] hover:text-zinc-200",
    activeClassName: "border-zinc-500 bg-zinc-500 text-white",
  },
] as const satisfies Array<{
  value: ArticleRatingValue;
  label: string;
  mobileLabel: string;
  icon: string;
  className: string;
  activeClassName: string;
}>;

type FeedbackMessage = "voted" | "updated" | "error" | null;

export function ArticleRating({ article, dense = false }: ArticleRatingProps) {
  const [counts, setCounts] = useState<ArticleRatingCounts>(
    emptyArticleRatingCounts,
  );
  const [visitorRating, setVisitorRating] =
    useState<ArticleRatingValue | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [pendingRating, setPendingRating] = useState<ArticleRatingValue | null>(
    null,
  );
  const [feedbackMessage, setFeedbackMessage] =
    useState<FeedbackMessage>(null);

  const team = useMemo(
    () =>
      article.tags.find((tag) => tag.toLowerCase().includes("leeds")) ??
      "Leeds United",
    [article.tags],
  );

  useEffect(() => {
    let isMounted = true;

    getArticleRating(article.id)
      .then((result) => {
        if (!isMounted) {
          return;
        }

        setCounts(result.counts);
        setVisitorRating(result.visitorRating);
        setFeedbackMessage(null);
      })
      .catch(() => {
        if (isMounted) {
          setCounts(emptyArticleRatingCounts());
          setFeedbackMessage(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [article.id]);

  async function handleRate(nextRating: ArticleRatingValue) {
    if (isSaving || nextRating === visitorRating) {
      return;
    }

    const previousCounts = counts;
    const previousRating = visitorRating;
    const isUpdatingVote = Boolean(previousRating);
    const optimisticCounts = getOptimisticArticleRatingCounts({
      counts,
      previousRating,
      nextRating,
    });

    setCounts(optimisticCounts);
    setVisitorRating(nextRating);
    setFeedbackMessage(null);
    setIsSaving(true);
    setPendingRating(nextRating);

    try {
      const result = await rateArticle(article.id, nextRating, {
        sourceId: article.sourceId,
        category: article.category,
        team,
      });

      setCounts(result.counts);
      setVisitorRating(result.visitorRating);
      setFeedbackMessage(isUpdatingVote ? "updated" : "voted");
    } catch {
      setCounts(previousCounts);
      setVisitorRating(previousRating);
      setFeedbackMessage("error");
    } finally {
      setIsSaving(false);
      setPendingRating(null);
    }
  }

  const hasRecordedVote = Boolean(visitorRating);

  return (
    <div
      className={
        dense
          ? "mt-3 border-t border-white/[0.08] pt-3"
          : "mt-4 border-t border-white/[0.08] pt-4"
      }
    >
      <p
        className={
          dense
            ? "mb-2 text-[0.68rem] font-semibold text-zinc-400"
            : "mb-3 text-xs font-semibold text-zinc-400"
        }
      >
        Was this worth your time?
      </p>
      <div className="grid grid-cols-3 gap-1.5 md:gap-2">
        {ratingOptions.map((option) => {
          const isActive = visitorRating === option.value;

          return (
            <button
              key={option.value}
              type="button"
              disabled={isSaving}
              onClick={() => handleRate(option.value)}
              aria-pressed={isActive}
              className={[
                "inline-flex min-h-11 min-w-0 items-center justify-center gap-1 whitespace-nowrap rounded-lg border px-1.5 py-2 text-[0.64rem] font-bold transition disabled:cursor-wait disabled:opacity-70 md:min-h-10 md:gap-1.5 md:px-2.5 md:text-[0.72rem]",
                dense ? "text-[0.58rem] md:min-h-9 md:text-[0.66rem]" : "",
                option.className,
                isActive ? option.activeClassName : "",
              ].join(" ")}
            >
              {isSaving && pendingRating === option.value ? (
                <span
                  aria-hidden="true"
                  className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-current border-t-transparent"
                />
              ) : (
                <span aria-hidden="true">{option.icon}</span>
              )}
              <span className="md:hidden">{option.mobileLabel}</span>
              <span className="hidden md:inline">{option.label}</span>
            </button>
          );
        })}
      </div>
      {isSaving ? (
        <p
          className={
            dense
              ? "mt-2 text-[0.68rem] leading-5 text-zinc-500"
              : "mt-3 text-xs leading-5 text-zinc-500"
          }
        >
          Saving your vote...
        </p>
      ) : null}
      {feedbackMessage ? (
        <p
          className={
            dense
              ? "mt-2 text-[0.68rem] font-semibold leading-5 text-zinc-300"
              : "mt-3 text-xs font-semibold leading-5 text-zinc-300"
          }
        >
          {feedbackMessage === "voted"
            ? "Thanks for voting."
            : feedbackMessage === "updated"
              ? "Your vote has been updated."
              : "We couldn't save your vote. Please try again."}
        </p>
      ) : null}
      {hasRecordedVote && counts.total > 0 ? (
        <p
          className={
            dense
              ? "mt-2 text-[0.68rem] leading-5 text-zinc-500"
              : feedbackMessage || isSaving
                ? "mt-2 text-xs leading-5 text-zinc-500"
                : "mt-3 text-xs leading-5 text-zinc-500"
          }
        >
          {counts.positivePercentage}% of Leeds fans thought this was worth
          reading.
        </p>
      ) : null}
    </div>
  );
}
