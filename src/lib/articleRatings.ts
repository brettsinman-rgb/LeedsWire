export const articleRatingValues = [
  "worth_reading",
  "must_read",
  "skip",
] as const;

export type ArticleRatingValue = (typeof articleRatingValues)[number];

export type ArticleRatingCounts = {
  worthReading: number;
  mustRead: number;
  skip: number;
  total: number;
  positive: number;
  positivePercentage: number;
};

export type ArticleRatingResult = {
  articleId: string;
  visitorRating: ArticleRatingValue | null;
  counts: ArticleRatingCounts;
};

export type ArticleRatingContext = {
  sourceId?: string;
  category?: string;
  team?: string;
};

const visitorStorageKey = "leedswire_visitor_id";

export function isArticleRatingValue(value: unknown): value is ArticleRatingValue {
  return (
    typeof value === "string" &&
    articleRatingValues.includes(value as ArticleRatingValue)
  );
}

function fallbackUuid() {
  return "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (char) =>
    (
      Number(char) ^
      (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (Number(char) / 4)))
    ).toString(16),
  );
}

export function getVisitorId() {
  if (typeof window === "undefined") {
    return null;
  }

  const existing = window.localStorage.getItem(visitorStorageKey);

  if (existing) {
    return existing;
  }

  const visitorId =
    typeof crypto.randomUUID === "function"
      ? crypto.randomUUID()
      : fallbackUuid();

  window.localStorage.setItem(visitorStorageKey, visitorId);
  return visitorId;
}

export function emptyArticleRatingCounts(): ArticleRatingCounts {
  return {
    worthReading: 0,
    mustRead: 0,
    skip: 0,
    total: 0,
    positive: 0,
    positivePercentage: 0,
  };
}

export function calculateArticleRatingCounts(
  counts: Pick<ArticleRatingCounts, "worthReading" | "mustRead" | "skip">,
): ArticleRatingCounts {
  const positive = counts.worthReading + counts.mustRead;
  const total = positive + counts.skip;

  return {
    worthReading: counts.worthReading,
    mustRead: counts.mustRead,
    skip: counts.skip,
    total,
    positive,
    positivePercentage: total > 0 ? Math.round((positive / total) * 100) : 0,
  };
}

export function getOptimisticArticleRatingCounts({
  counts,
  previousRating,
  nextRating,
}: {
  counts: ArticleRatingCounts;
  previousRating: ArticleRatingValue | null;
  nextRating: ArticleRatingValue;
}) {
  const nextCounts = {
    worthReading: counts.worthReading,
    mustRead: counts.mustRead,
    skip: counts.skip,
  };

  if (previousRating === "worth_reading") {
    nextCounts.worthReading = Math.max(0, nextCounts.worthReading - 1);
  } else if (previousRating === "must_read") {
    nextCounts.mustRead = Math.max(0, nextCounts.mustRead - 1);
  } else if (previousRating === "skip") {
    nextCounts.skip = Math.max(0, nextCounts.skip - 1);
  }

  if (nextRating === "worth_reading") {
    nextCounts.worthReading += 1;
  } else if (nextRating === "must_read") {
    nextCounts.mustRead += 1;
  } else {
    nextCounts.skip += 1;
  }

  return calculateArticleRatingCounts(nextCounts);
}

export async function getArticleRating(articleId: string) {
  const visitorId = getVisitorId();
  const params = new URLSearchParams({ article_id: articleId });

  if (visitorId) {
    params.set("visitor_id", visitorId);
  }

  const response = await fetch(`/api/article-ratings?${params.toString()}`, {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error("Unable to load article rating.");
  }

  return (await response.json()) as ArticleRatingResult;
}

export async function rateArticle(
  articleId: string,
  rating: ArticleRatingValue,
  context: ArticleRatingContext = {},
) {
  const visitorId = getVisitorId();

  if (!visitorId) {
    throw new Error("Unable to create visitor id.");
  }

  const response = await fetch("/api/article-ratings", {
    method: "POST",
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify({
      articleId,
      rating,
      visitorId,
      ...context,
    }),
  });

  if (!response.ok) {
    throw new Error("Unable to save article rating.");
  }

  return (await response.json()) as ArticleRatingResult;
}
