import { newsSources } from "../src/config/newsSources";
import { getArticleUrl } from "../src/lib/articleUrls";
import { isLeedsFootballArticle } from "../src/lib/filters";
import type { Article } from "../src/types/content";

function decodeXml(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function getTag(item: string, tagName: string) {
  const match = item.match(
    new RegExp(`<${tagName}[^>]*>([\\s\\S]*?)<\\/${tagName}>`, "i"),
  );

  return decodeXml(match?.[1] ?? "");
}

function getAttribute(tag: string, attribute: string) {
  return tag.match(new RegExp(`${attribute}=["']([^"']+)["']`, "i"))?.[1] ?? "";
}

function getLink(item: string) {
  return (
    getTag(item, "link") ||
    decodeXml(item.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1] ?? "")
  );
}

function getImage(item: string) {
  const media =
    item.match(/<media:content\b[^>]*>/i)?.[0] ||
    item.match(/<media:thumbnail\b[^>]*>/i)?.[0] ||
    "";

  return media ? decodeXml(getAttribute(media, "url")) : undefined;
}

async function getUrlStatus(url: string) {
  try {
    const response = await fetch(url, {
      method: "HEAD",
      redirect: "manual",
      signal: AbortSignal.timeout(4000),
    });

    return response.status;
  } catch {
    return "error";
  }
}

async function main() {
  const source = newsSources.find((candidate) => candidate.id === "mot-leeds-news");

  if (!source?.feedUrl) {
    throw new Error("MOT Leeds News source or feedUrl is not configured.");
  }

  const response = await fetch(source.feedUrl, {
    signal: AbortSignal.timeout(8000),
  });
  const xml = await response.text();
  const rows = [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((match) => {
    const raw = match[0];
    const item = {
      title: getTag(raw, "title"),
      description: getTag(raw, "description") || getTag(raw, "content:encoded"),
      link: getLink(raw),
      guid: getTag(raw, "guid"),
      imageUrl: getImage(raw),
      publishedAt: getTag(raw, "pubDate") || new Date(0).toISOString(),
    };
    const sourceUrl = getArticleUrl(item, source);
    const article = sourceUrl
      ? ({
          id: `${source.id}-${sourceUrl}`,
          title: item.title,
          standfirst: item.description,
          sourceId: source.id,
          publishedAt: item.publishedAt,
          url: sourceUrl,
          sourceUrl,
          imageUrl: item.imageUrl,
          category: "news",
          tags: ["Leeds United", "football", source.name],
          readMinutes: 3,
        } satisfies Article)
      : null;
    const accepted = article ? isLeedsFootballArticle(article) : false;
    let reason = "accepted";

    if (!sourceUrl) {
      reason = "no exact article URL";
    } else if (!item.title) {
      reason = "missing title";
    } else if (!accepted) {
      reason = "failed Leeds-only filter";
    }

    return {
      title: item.title,
      sourceUrl,
      accepted,
      reason,
      image: item.imageUrl ? "rss image" : "none",
    };
  });

  const accepted = rows.filter((row) => row.accepted);
  const rejected = rows.filter((row) => !row.accepted);
  const sampleStatuses = await Promise.all(
    accepted.slice(0, 5).map(async (row) => ({
      url: row.sourceUrl,
      status: row.sourceUrl ? await getUrlStatus(row.sourceUrl) : "missing",
    })),
  );

  console.log(
    JSON.stringify(
      {
        source: source.name,
        sourceStatus: response.status,
        feedUrl: source.feedUrl,
        method: source.ingestionType,
        fetched: rows.length,
        accepted: accepted.length,
        rejected: rejected.length,
        rejectedReasons: rejected.reduce<Record<string, number>>((reasons, row) => {
          reasons[row.reason] = (reasons[row.reason] ?? 0) + 1;
          return reasons;
        }, {}),
        sampleAccepted: accepted.slice(0, 5).map((row) => ({
          title: row.title,
          url: row.sourceUrl,
          image: row.image,
        })),
        sampleStatuses,
      },
      null,
      2,
    ),
  );
}

void main();
