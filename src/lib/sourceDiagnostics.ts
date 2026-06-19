import { newsSources, type NewsSource } from "../config/newsSources";
import { isLeedsFootballArticle } from "./filters";
import {
  getUrlStatus,
  itemToArticle,
  parseRssItems,
  type RssItem,
} from "./content";
import { parseRssDate, resolveArticleTimestamp } from "./rssDates";

export const SOURCE_DIAGNOSTIC_WINDOW_HOURS = 24;

export type SourceRejectionReasons = {
  duplicate: number;
  missingImage: number;
  invalidClubMatch: number;
  dateParsing: number;
  extractionFailure: number;
  feedUnavailable: number;
};

export type SourceDiagnostic = {
  sourceName: string;
  sourceId: NewsSource["id"];
  status: "healthy" | "partial" | "disabled" | "failing";
  enabled: boolean;
  lastRunTimestamp: string | null;
  lastFetch: string | null;
  articlesFetched: number;
  articlesAccepted: number;
  articlesRejected: number;
  rejected: SourceRejectionReasons;
  latestAcceptedHeadline: string | null;
  primaryRejectionReason: string | null;
  feedUrl: string | null;
  refreshSchedule: string;
  error: string | null;
};

export type SourcesDiagnosticResponse = {
  generatedAt: string;
  windowHours: number;
  persistence: "live-run-only";
  sources: SourceDiagnostic[];
};

function emptyReasons(): SourceRejectionReasons {
  return {
    duplicate: 0,
    missingImage: 0,
    invalidClubMatch: 0,
    dateParsing: 0,
    extractionFailure: 0,
    feedUnavailable: 0,
  };
}

function enabledForLiveIngestion(source: NewsSource) {
  return source.ingestionType === "rss" && Boolean(source.feedUrl);
}

function primaryRejectionReason(rejected: SourceRejectionReasons) {
  const labels: Record<keyof SourceRejectionReasons, string> = {
    duplicate: "duplicate",
    missingImage: "missing image",
    invalidClubMatch: "invalid club match",
    dateParsing: "date parsing",
    extractionFailure: "extraction failure",
    feedUnavailable: "feed unavailable",
  };
  const primary = (Object.entries(rejected) as Array<
    [keyof SourceRejectionReasons, number]
  >).sort((left, right) => right[1] - left[1])[0];

  return primary && primary[1] > 0 ? labels[primary[0]] : null;
}

async function fetchDiagnosticFeed(source: NewsSource, fetcher: typeof fetch) {
  const response = await fetcher(source.feedUrl!, {
    cache: "no-store",
    headers: {
      accept: "application/rss+xml,application/xml,text/xml;q=0.9,*/*;q=0.1",
      "user-agent": "LeedsWire source diagnostics",
    },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    throw new Error(`Feed returned HTTP ${response.status}`);
  }

  const body = await response.text();
  const fetchedAt = new Date().toISOString();
  const items = parseRssItems(body).map((item) => ({ ...item, fetchedAt }));

  if (items.length === 0) {
    throw new Error("Feed contained no parseable RSS <item> elements");
  }

  return items;
}

export async function diagnoseSource(
  source: NewsSource,
  now = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<SourceDiagnostic> {
  const enabled = enabledForLiveIngestion(source);
  const base = {
    sourceName: source.name,
    sourceId: source.id,
    enabled,
    lastRunTimestamp: null,
    lastFetch: null,
    articlesFetched: 0,
    articlesAccepted: 0,
    articlesRejected: 0,
    rejected: emptyReasons(),
    latestAcceptedHeadline: null,
    primaryRejectionReason: null,
    feedUrl: source.feedUrl ?? null,
    refreshSchedule: "on request; Next.js fetch cache revalidates after 300 seconds",
    error: null,
  };

  if (!enabled) {
    return {
      ...base,
      status: "disabled",
      error: source.liveDisabledReason ?? "No live RSS feed is configured.",
    };
  }

  let items: RssItem[];

  try {
    items = await fetchDiagnosticFeed(source, fetcher);
  } catch (error) {
    return {
      ...base,
      status: "failing",
      lastRunTimestamp: now.toISOString(),
      rejected: { ...base.rejected, feedUnavailable: 1 },
      articlesRejected: 1,
      primaryRejectionReason: "feed unavailable",
      error: error instanceof Error ? error.message : "Unknown feed error",
    };
  }

  const fetchedAt = now.toISOString();
  const cutoff = now.getTime() - SOURCE_DIAGNOSTIC_WINDOW_HOURS * 60 * 60 * 1000;
  const rejected = emptyReasons();
  const seenUrls = new Set<string>();
  const candidates = [];
  let fetched = 0;
  let dateFallbacks = 0;

  for (const item of items) {
    const publishedTimestamp = parseRssDate(item.publishedAt);
    const timestamp = resolveArticleTimestamp(item.publishedAt, item.fetchedAt);

    if (timestamp === null) {
      fetched += 1;
      rejected.dateParsing += 1;
      continue;
    }

    if (publishedTimestamp === null) {
      dateFallbacks += 1;
    }

    if (timestamp < cutoff || timestamp > now.getTime() + 5 * 60 * 1000) {
      continue;
    }

    fetched += 1;
    const article = itemToArticle(item, source);

    if (!article?.sourceUrl) {
      rejected.extractionFailure += 1;
      continue;
    }

    if (seenUrls.has(article.sourceUrl)) {
      rejected.duplicate += 1;
      continue;
    }

    seenUrls.add(article.sourceUrl);

    if (!isLeedsFootballArticle(article)) {
      rejected.invalidClubMatch += 1;
      continue;
    }

    // Missing RSS images are not rejected by the production pipeline. They are
    // enriched from article metadata/HTML later and ultimately use a club fallback.
    candidates.push(article);
  }

  const urlChecks = await Promise.all(
    candidates.map(async (article) => ({
      article,
      status:
        source.id === "yorkshire-evening-post"
          ? "rss-trusted"
          : await getUrlStatus(article.sourceUrl!),
    })),
  );
  const acceptedArticles = urlChecks
    .filter(
      ({ status }) =>
        status === "rss-trusted" || [200, 301, 302].includes(Number(status)),
    )
    .map(({ article }) => article);
  rejected.extractionFailure += urlChecks.length - acceptedArticles.length;
  const rejectedTotal = Object.values(rejected).reduce(
    (total, count) => total + count,
    0,
  );

  return {
    ...base,
    status:
      source.id === "yorkshire-evening-post" || dateFallbacks > 0
        ? "partial"
        : acceptedArticles.length > 0
          ? "healthy"
          : "partial",
    lastRunTimestamp: fetchedAt,
    lastFetch: fetchedAt,
    articlesFetched: fetched,
    articlesAccepted: acceptedArticles.length,
    articlesRejected: rejectedTotal,
    rejected,
    latestAcceptedHeadline:
      acceptedArticles.sort(
        (left, right) =>
          (resolveArticleTimestamp(right.publishedAt, right.fetchedAt) ?? 0) -
          (resolveArticleTimestamp(left.publishedAt, left.fetchedAt) ?? 0),
      )[0]?.title ?? null,
    primaryRejectionReason: primaryRejectionReason(rejected),
    error:
      source.id === "yorkshire-evening-post"
        ? "Article-page validation bypassed because Cloudflare blocks server requests; RSS content accepted."
        : dateFallbacks > 0
          ? `${dateFallbacks} item(s) used fetch time because the publication date was invalid.`
          : null,
  };
}

export async function getSourcesDiagnostics(
  now = new Date(),
  fetcher: typeof fetch = fetch,
): Promise<SourcesDiagnosticResponse> {
  const sources = newsSources.filter((source) => !source.premierLeagueOnly);

  return {
    generatedAt: now.toISOString(),
    windowHours: SOURCE_DIAGNOSTIC_WINDOW_HOURS,
    persistence: "live-run-only",
    sources: await Promise.all(
      sources.map((source) => diagnoseSource(source, now, fetcher)),
    ),
  };
}
