import { getNewsSource } from "@/config/newsSources";
import { isSpecificArticleUrl } from "@/lib/articleUrls";
import type { Article } from "@/types/content";

const BBC_PREMIER_LEAGUE_SOURCE_ID = "bbc-premier-league";
const MAX_DISCOVERED_ARTICLES = 18;

function decodeHtml(value = "") {
  return value
    .replace(/\\u003C/g, "<")
    .replace(/\\u003E/g, ">")
    .replace(/\\u002F/g, "/")
    .replace(/\\u0026/g, "&")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugFromUrl(url: string) {
  try {
    return new URL(url).pathname.split("/").filter(Boolean).at(-1) ?? url;
  } catch {
    return url;
  }
}

function getMetaContent(html: string, key: string) {
  const escaped = key.replace(/:/g, "\\:");
  const patterns = [
    new RegExp(`<meta[^>]+property=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+name=["']${escaped}["'][^>]+content=["']([^"']+)["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${escaped}["'][^>]*>`, "i"),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+name=["']${escaped}["'][^>]*>`, "i"),
  ];

  for (const pattern of patterns) {
    const match = html.match(pattern);

    if (match?.[1]) {
      return decodeHtml(match[1]);
    }
  }

  return "";
}

function resolveUrl(value: string, baseUrl: string) {
  try {
    return new URL(decodeHtml(value), baseUrl).toString();
  } catch {
    return "";
  }
}

async function fetchHtml(url: string) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(5000),
    headers: {
      accept: "text/html,application/xhtml+xml",
      "user-agent": "LeedsWire Premier League news",
    },
    next: { revalidate: 1800 },
  });

  if (!response.ok) {
    throw new Error(`BBC fetch failed: ${response.status}`);
  }

  return response.text();
}

function discoverBbcArticleUrls(html: string, sourceUrl: string) {
  const source = getNewsSource(BBC_PREMIER_LEAGUE_SOURCE_ID);
  const urls = new Set<string>();

  for (const match of html.matchAll(/<a\b[^>]+href=["']([^"']+)["'][^>]*>/gi)) {
    const url = resolveUrl(match[1], sourceUrl);
    const path = url ? new URL(url).pathname : "";

    if (
      path.includes("/sport/football/articles/") &&
      isSpecificArticleUrl(url, source)
    ) {
      urls.add(url);
    }
  }

  return [...urls].slice(0, MAX_DISCOVERED_ARTICLES);
}

function getPublishedAt(html: string) {
  const metaDate =
    getMetaContent(html, "article:published_time") ||
    getMetaContent(html, "datePublished") ||
    getMetaContent(html, "dc.date") ||
    getMetaContent(html, "pubdate");
  const jsonDate =
    html.match(/"datePublished"\s*:\s*"([^"]+)"/i)?.[1] ||
    html.match(/"firstPublished"\s*:\s*"([^"]+)"/i)?.[1];
  const candidate = metaDate || jsonDate;
  const timestamp = candidate ? Date.parse(candidate) : Number.NaN;

  return Number.isNaN(timestamp)
    ? new Date().toISOString()
    : new Date(timestamp).toISOString();
}

function getHeroImage(html: string, articleUrl: string) {
  const image =
    getMetaContent(html, "og:image") ||
    getMetaContent(html, "og:image:secure_url") ||
    getMetaContent(html, "twitter:image") ||
    getMetaContent(html, "twitter:image:src");

  return image ? resolveUrl(image, articleUrl) : undefined;
}

async function articleFromBbcUrl(url: string): Promise<Article | null> {
  try {
    const html = await fetchHtml(url);
    const title =
      getMetaContent(html, "og:title")
        .replace(/\s*-\s*BBC Sport\s*$/i, "")
        .trim() || getMetaContent(html, "twitter:title");
    const standfirst =
      getMetaContent(html, "og:description") ||
      getMetaContent(html, "description") ||
      "Latest Premier League story from BBC Sport.";

    if (!title) {
      return null;
    }

    return {
      id: `${BBC_PREMIER_LEAGUE_SOURCE_ID}-${slugFromUrl(url)}`,
      title,
      standfirst,
      sourceId: BBC_PREMIER_LEAGUE_SOURCE_ID,
      publishedAt: getPublishedAt(html),
      url,
      sourceUrl: url,
      imageUrl: getHeroImage(html, url),
      category: "news",
      tags: ["Premier League", "BBC Sport", "football"],
      readMinutes: 3,
    };
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[LeedsWire Premier League] article fetch failed", {
        url,
        error,
      });
    }

    return null;
  }
}

export async function getPremierLeagueArticles() {
  const source = getNewsSource(BBC_PREMIER_LEAGUE_SOURCE_ID);

  if (!source) {
    return [];
  }

  try {
    const html = await fetchHtml(source.url);
    const articleUrls = discoverBbcArticleUrls(html, source.url);
    const articles = await Promise.all(articleUrls.map(articleFromBbcUrl));

    return articles
      .filter((article): article is Article => Boolean(article))
      .sort(
        (a, b) =>
          new Date(b.publishedAt).getTime() -
          new Date(a.publishedAt).getTime(),
      );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[LeedsWire Premier League] index fetch failed", {
        source: source.url,
        error,
      });
    }

    return [];
  }
}
