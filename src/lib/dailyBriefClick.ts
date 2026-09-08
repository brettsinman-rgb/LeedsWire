import { canonicalizeArticleUrl, hashCanonicalUrl } from "./dailyBrief";
import { getNewsSource } from "../config/newsSources";
import type { Article } from "../types/content";

export const DAILY_BRIEF_EVENT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type DailyBriefStory = {
  article_id: string;
  canonical_url: string;
  canonical_url_hash: string;
  headline: string;
  source_id: Article["sourceId"];
};

export function dailyBriefClickUrl(eventId: string) {
  return DAILY_BRIEF_EVENT_ID.test(eventId)
    ? `/api/push/daily-brief/click?event=${encodeURIComponent(eventId)}` : "/";
}

export function resolveDailyBriefStory(saved: DailyBriefStory, articles: Article[]): Article | null {
  const canonical = canonicalizeArticleUrl(saved.canonical_url);
  if (!canonical || !saved.article_id || !saved.headline || !getNewsSource(saved.source_id)) return null;
  const article = articles.find((candidate) => candidate.id === saved.article_id) ?? articles.find((candidate) => {
    const url = canonicalizeArticleUrl(candidate.sourceUrl ?? candidate.url);
    return url && hashCanonicalUrl(url) === saved.canonical_url_hash;
  });
  // Events already retain attribution and headline when a story leaves the RSS feed.
  return article ?? {
    id: saved.article_id, title: saved.headline,
    standfirst: "Selected for the Daily Leeds Brief. Read the feature for the full story from the original publisher.",
    sourceId: saved.source_id, sourceUrl: canonical, url: canonical,
    publishedAt: "", category: "news", tags: [], readMinutes: 0,
  };
}

export async function dailyBriefClickResponse(request: Request, dependencies: {
  getStory: (id: string) => Promise<DailyBriefStory | null>;
  recordClick: (id: string) => Promise<void>;
}) {
  const url = new URL(request.url);
  const id = url.searchParams.get("event") ?? "";
  let path = "/";
  if (DAILY_BRIEF_EVENT_ID.test(id)) {
    try {
      const saved = await dependencies.getStory(id);
      if (saved && resolveDailyBriefStory(saved, [])) {
        path = `/?dailyBrief=${encodeURIComponent(id)}`;
        // Analytics failure must not prevent the selected story from opening.
        try { await dependencies.recordClick(id); } catch { /* best effort */ }
      }
    } catch { /* unavailable event falls back to home */ }
  }
  return new Response(null, {
    status: 307,
    headers: { Location: new URL(path, url.origin).href, "Cache-Control": "no-store" },
  });
}
