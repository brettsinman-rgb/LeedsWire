import { getNewsSource, type NewsSource } from "../config/newsSources";
import type { Article } from "../types/content";

type UrlCandidateItem = {
  link?: string;
  guid?: string;
  id?: string;
  url?: string;
  enclosure?: {
    url?: string;
  };
};

const genericPathPatterns = [
  /^\/?$/,
  /^\/news\/?$/,
  /^\/en\/news\/?$/,
  /^\/leeds-united\/?$/,
  /^\/all-about\/leeds-united-fc\/?$/,
  /^\/sport\/football\/teams\/leeds-united\/?$/,
  /^\/sport\/football\/leeds-united\/?$/,
];

function toUrl(value?: string) {
  if (!value) {
    return null;
  }

  try {
    return new URL(value.trim());
  } catch {
    return null;
  }
}

function stripTrailingSlash(pathname: string) {
  return pathname.replace(/\/+$/, "") || "/";
}

export function isSpecificArticleUrl(value?: string, source?: NewsSource) {
  const url = toUrl(value);

  if (!url) {
    return false;
  }

  const normalizedUrl = `${url.origin}${stripTrailingSlash(url.pathname)}`;
  const sourceUrl = source ? toUrl(source.url) : null;
  const sourceHome = sourceUrl
    ? `${sourceUrl.origin}${stripTrailingSlash(sourceUrl.pathname)}`
    : "";
  const path = stripTrailingSlash(url.pathname).toLowerCase();

  if (sourceHome && normalizedUrl.toLowerCase() === sourceHome.toLowerCase()) {
    return false;
  }

  if (genericPathPatterns.some((pattern) => pattern.test(path))) {
    return false;
  }

  if (
    path.includes("/tag/") ||
    path.includes("/topic/") ||
    path.includes("/all-about/") ||
    path.includes("/teams/leeds-united")
  ) {
    return false;
  }

  if (source?.id === "mot-leeds-news") {
    const segments = path.split("/").filter(Boolean);

    return segments.length >= 2 && segments[1].length > 12;
  }

  return (
    /\d{4,}/.test(path) ||
    path.includes("/articles/") ||
    path.includes("/news/") ||
    path.split("/").filter(Boolean).length >= 3
  );
}

export function getArticleUrl(item: UrlCandidateItem, source?: NewsSource) {
  const candidates = [
    item.link,
    item.guid,
    item.id,
    item.url,
    item.enclosure?.url,
  ];

  return (
    candidates.find((candidate) => isSpecificArticleUrl(candidate, source)) ?? null
  );
}

export function getArticleCtaUrl(article: Article) {
  const source = getNewsSource(article.sourceId);
  const ctaUrl =
    article.sourceUrl && isSpecificArticleUrl(article.sourceUrl, source)
      ? article.sourceUrl
      : null;

  if (process.env.NODE_ENV === "development") {
    console.info("[LeedsWire article CTA]", {
      title: article.title,
      source: source?.name ?? article.sourceId,
      sourceUrl: article.sourceUrl,
      rejectedGenericUrl: Boolean(article.sourceUrl && !ctaUrl),
      ctaUrl,
    });
  }

  return ctaUrl;
}

export function withArticleSourceUrl(article: Article): Article {
  const source = getNewsSource(article.sourceId);
  const sourceUrl = getArticleUrl(
    {
      link: article.sourceUrl,
      url: article.url,
    },
    source,
  );

  return {
    ...article,
    sourceUrl: sourceUrl ?? undefined,
  };
}
