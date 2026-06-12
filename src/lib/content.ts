import {
  isLeedsFootballArticle,
  isLeedsTransferArticle,
  isLongFormYouTubeVideo,
} from "./filters";
import { getArticleUrl } from "./articleUrls";
import { newsSources, type NewsSource } from "../config/newsSources";
import type { Article, Video } from "../types/content";

export const fallbackImage = "/images/Leeds_United.png";

const allArticles: Article[] = [
  {
    id: "top-farke-window",
    title: "Farke sets out Leeds transfer priorities before pre-season return",
    standfirst:
      "Leeds United are expected to move early for reinforcements, with midfield depth and a proven forward high on the summer list.",
    sourceId: "leeds-live",
    publishedAt: "2026-06-11T08:30:00.000Z",
    url: "https://www.leeds-live.co.uk/sport/leeds-united/leeds-united-face-clear-hurdles-34099348",
    imageUrl:
      "https://images.unsplash.com/photo-1522778119026-d647f0596c20?auto=format&fit=crop&w=1400&q=80",
    category: "transfer",
    transferType: "Rumour",
    tags: ["Leeds United", "Daniel Farke", "transfer", "pre-season"],
    readMinutes: 4,
  },
  {
    id: "elland-road-retained-list",
    title: "Leeds publish retained list as contract talks continue",
    standfirst:
      "The club have confirmed their retained list, with senior contract discussions still active at Elland Road.",
    sourceId: "leeds-united-official",
    publishedAt: "2026-06-11T07:15:00.000Z",
    url: "https://www.leedsunited.com/news/first-team-training-return-date-confirmed",
    imageUrl:
      "https://images.unsplash.com/photo-1579952363873-27f3bade9f55?auto=format&fit=crop&w=1200&q=80",
    category: "news",
    transferType: "Contract",
    tags: ["Leeds United", "contract", "squad"],
    readMinutes: 3,
  },
  {
    id: "sky-leeds-fixture-angle",
    title: "Leeds face defining opening month after fixture release",
    standfirst:
      "Sky Sports assesses the early run that could shape Leeds United's campaign and Farke's selection calls.",
    sourceId: "sky-sports-leeds",
    publishedAt: "2026-06-10T18:45:00.000Z",
    url: "https://www.skysports.com/football/news/11715/leeds-face-defining-opening-month-after-fixture-release",
    imageUrl:
      "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&w=1200&q=80",
    category: "news",
    tags: ["Leeds United", "fixtures", "football"],
    readMinutes: 5,
  },
  {
    id: "yep-youngster-loan",
    title: "Leeds youngster attracting loan interest from Championship clubs",
    standfirst:
      "A temporary move is being considered as Leeds balance development minutes with squad cover.",
    sourceId: "yorkshire-evening-post",
    publishedAt: "2026-06-10T12:20:00.000Z",
    url: "https://www.yorkshireeveningpost.co.uk/sport/football/leeds-united/leeds-united-youngster-loan-interest-championship-clubs-8667001",
    category: "transfer",
    transferType: "Outgoing",
    tags: ["Leeds United", "loan", "outgoing", "Championship"],
    readMinutes: 4,
  },
  {
    id: "bbc-leeds-analysis",
    title: "What Leeds need to settle before the new season",
    standfirst:
      "BBC Football looks at the tactical and squad questions facing Leeds United after a demanding campaign.",
    sourceId: "bbc-football-leeds",
    publishedAt: "2026-06-09T16:10:00.000Z",
    url: "https://www.bbc.com/sport/football/articles/leeds-united-questions-before-new-season",
    imageUrl:
      "https://images.unsplash.com/photo-1517927033932-b3d18e61fb3a?auto=format&fit=crop&w=1200&q=80",
    category: "news",
    tags: ["Leeds United", "football", "analysis"],
    readMinutes: 6,
  },
  {
    id: "done-deal-fullback",
    title: "Leeds agree framework for full-back deal as medical plan prepared",
    standfirst:
      "A defensive addition is moving closer, though final paperwork and personal terms remain to be completed.",
    sourceId: "leeds-live",
    publishedAt: "2026-06-09T10:00:00.000Z",
    url: "https://www.leeds-live.co.uk/sport/leeds-united/leeds-agree-framework-full-back-34090001",
    imageUrl:
      "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?auto=format&fit=crop&w=1200&q=80",
    category: "transfer",
    transferType: "Confirmed",
    tags: ["Leeds United", "done deal", "transfer", "medical"],
    readMinutes: 3,
  },
  {
    id: "training-return-gallery",
    title: "First-team training return date confirmed by Leeds United",
    standfirst:
      "The Whites will return to Thorp Arch in stages as the coaching staff map out pre-season workloads.",
    sourceId: "leeds-united-official",
    publishedAt: "2026-06-08T15:00:00.000Z",
    url: "https://www.leedsunited.com/news/first-team-training-return-date-confirmed",
    imageUrl:
      "https://images.unsplash.com/photo-1556056504-5c7696c4c28d?auto=format&fit=crop&w=1200&q=80",
    category: "news",
    tags: ["Leeds United", "training", "squad"],
    readMinutes: 2,
  },
  {
    id: "reject-local-traffic",
    title: "Leeds city centre traffic warning before weekend events",
    standfirst:
      "Local diversions are expected as roadworks continue near the city centre.",
    sourceId: "leeds-live",
    publishedAt: "2026-06-08T09:00:00.000Z",
    url: "https://www.leeds-live.co.uk/news/",
    category: "news",
    tags: ["Leeds", "traffic", "roadworks"],
    readMinutes: 2,
  },
];

type RssItem = {
  title: string;
  description: string;
  link?: string;
  guid?: string;
  id?: string;
  url?: string;
  enclosure?: {
    url?: string;
  };
  imageUrl?: string;
  publishedAt: string;
};

const articleUrlStatusCache = new Map<string, number | "error">();

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
  const tagValue = getTag(item, "link");

  if (tagValue) {
    return tagValue;
  }

  const atomLink = item.match(/<link\b[^>]*href=["']([^"']+)["'][^>]*>/i)?.[1];

  return atomLink ? decodeXml(atomLink) : "";
}

function getEnclosure(item: string) {
  const enclosure = item.match(/<enclosure\b[^>]*>/i)?.[0];

  if (!enclosure) {
    return undefined;
  }

  return {
    url: decodeXml(getAttribute(enclosure, "url")),
  };
}

function getRssImage(item: string) {
  const mediaContent = item.match(/<media:content\b[^>]*>/i)?.[0];
  const mediaThumbnail = item.match(/<media:thumbnail\b[^>]*>/i)?.[0];
  const enclosure = item.match(/<enclosure\b[^>]*type=["']image\/[^"']+["'][^>]*>/i)?.[0];

  return (
    (mediaContent ? decodeXml(getAttribute(mediaContent, "url")) : "") ||
    (mediaThumbnail ? decodeXml(getAttribute(mediaThumbnail, "url")) : "") ||
    (enclosure ? decodeXml(getAttribute(enclosure, "url")) : "") ||
    undefined
  );
}

function parseRssItems(xml: string): RssItem[] {
  return [...xml.matchAll(/<item[\s\S]*?<\/item>/gi)].map((match) => {
    const item = match[0];

    return {
      title: getTag(item, "title"),
      description: getTag(item, "description") || getTag(item, "content:encoded"),
      link: getLink(item),
      guid: getTag(item, "guid"),
      id: getTag(item, "id"),
      url: getTag(item, "url"),
      enclosure: getEnclosure(item),
      imageUrl: getRssImage(item),
      publishedAt:
        getTag(item, "pubDate") ||
        getTag(item, "dc:date") ||
        new Date(0).toISOString(),
    };
  });
}

async function fetchFeed(source: NewsSource) {
  if (!source.feedUrl || source.ingestionType !== "rss") {
    if (process.env.NODE_ENV === "development") {
      console.warn("[LeedsWire news] live RSS disabled for source", {
        source: source.name,
        ingestionType: source.ingestionType,
      });
    }

    return [];
  }

  try {
    const fetchOptions: RequestInit & { next?: { revalidate: number } } = {
      signal: AbortSignal.timeout(5000),
      next: { revalidate: 1800 },
    };
    const response = await fetch(source.feedUrl, fetchOptions);

    if (!response.ok) {
      if (process.env.NODE_ENV === "development") {
        console.warn("[LeedsWire news] feed rejected", {
          source: source.name,
          feedUrl: source.feedUrl,
          status: response.status,
        });
      }

      return [];
    }

    return parseRssItems(await response.text());
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[LeedsWire news] feed fetch failed", {
        source: source.name,
        feedUrl: source.feedUrl,
        error,
      });
    }

    return [];
  }
}

async function getUrlStatus(url: string) {
  const cached = articleUrlStatusCache.get(url);

  if (cached !== undefined) {
    return cached;
  }

  const attempts: RequestInit[] = [
    { method: "HEAD", redirect: "manual", signal: AbortSignal.timeout(3000) },
    {
      method: "GET",
      redirect: "manual",
      signal: AbortSignal.timeout(4000),
      headers: { range: "bytes=0-0" },
    },
  ];

  for (const options of attempts) {
    try {
      const response = await fetch(url, options);

      if ([200, 301, 302].includes(response.status)) {
        articleUrlStatusCache.set(url, response.status);
        return response.status;
      }

      if ([404, 410, 500].includes(response.status)) {
        articleUrlStatusCache.set(url, response.status);
        return response.status;
      }
    } catch {
      // Try the next method before marking as error.
    }
  }

  articleUrlStatusCache.set(url, "error");
  return "error";
}

function itemToArticle(item: RssItem, source: NewsSource): Article | null {
  const sourceUrl = getArticleUrl(item, source);

  if (!sourceUrl || !item.title) {
    return null;
  }

  return {
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
  };
}

async function getLiveArticles() {
  const sourceItems = await Promise.all(
    newsSources
      .filter((source) => !source.premierLeagueOnly)
      .map(async (source) => ({
        source,
        items: await fetchFeed(source),
      })),
  );
  const candidates = sourceItems.flatMap(({ source, items }) =>
    items
      .map((item) => itemToArticle(item, source))
      .filter((article): article is Article => Boolean(article)),
  );
  const leedsArticles = candidates.filter(isLeedsFootballArticle);
  const checked = await Promise.all(
    leedsArticles.map(async (article) => ({
      article,
      status: await getUrlStatus(article.sourceUrl ?? ""),
    })),
  );

  return checked
    .filter(({ status }) => [200, 301, 302].includes(Number(status)))
    .map(({ article }) => ({
      ...article,
      category: isLeedsTransferArticle(article) ? "transfer" : article.category,
      transferType: isLeedsTransferArticle(article) ? article.transferType ?? "Rumour" : article.transferType,
    }));
}

const allVideos: Video[] = [
  {
    id: "official-access",
    title: "Inside Thorp Arch: Leeds United players return for testing",
    channelId: "leeds-united-official",
    publishedAt: "2026-06-11T06:30:00.000Z",
    youtubeId: "dQw4w9WgXcQ",
    durationSeconds: 612,
    thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
    tags: ["Leeds United", "training", "behind the scenes"],
  },
  {
    id: "one-leeds-transfer-chat",
    title: "Leeds United transfer window: priorities, rumours and exits",
    channelId: "one-leeds",
    publishedAt: "2026-06-10T20:00:00.000Z",
    youtubeId: "ysz5S6PUM-U",
    durationSeconds: 1460,
    thumbnailUrl: "https://i.ytimg.com/vi/ysz5S6PUM-U/hqdefault.jpg",
    tags: ["Leeds United", "transfer", "rumours"],
  },
  {
    id: "leeds-view-analysis",
    title: "The Leeds View: Farke's biggest tactical calls this summer",
    channelId: "the-leeds-view",
    publishedAt: "2026-06-09T19:00:00.000Z",
    youtubeId: "jNQXAC9IVRw",
    durationSeconds: 1050,
    thumbnailUrl: "https://i.ytimg.com/vi/jNQXAC9IVRw/hqdefault.jpg",
    tags: ["Leeds United", "Daniel Farke", "analysis"],
  },
  {
    id: "fozcast-leeds-chat",
    title: "Ben Foster Podcast: Leeds United pressure, keepers and Elland Road",
    channelId: "the-square-ball",
    publishedAt: "2026-06-08T18:30:00.000Z",
    youtubeId: "ScMzIvxBSi4",
    durationSeconds: 1980,
    thumbnailUrl: "https://i.ytimg.com/vi/ScMzIvxBSi4/hqdefault.jpg",
    tags: ["Leeds United", "Fozcast", "Elland Road"],
  },
  {
    id: "short-rejected",
    title: "Leeds United goal reaction #Shorts",
    channelId: "leeds-united-official",
    publishedAt: "2026-06-08T10:00:00.000Z",
    youtubeId: "aqz-KE-bpKQ",
    durationSeconds: 42,
    thumbnailUrl: "https://i.ytimg.com/vi/aqz-KE-bpKQ/hqdefault.jpg",
    tags: ["Leeds United", "shorts"],
  },
];

function byNewest<T extends { publishedAt: string }>(items: T[]) {
  return [...items].sort(
    (a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime(),
  );
}

function getDevSeededArticles() {
  if (process.env.NODE_ENV === "production") {
    return [];
  }

  return byNewest(allArticles.filter(isLeedsFootballArticle));
}

export async function getArticles() {
  const liveArticles = byNewest(await getLiveArticles());

  return liveArticles.length > 0 ? liveArticles : getDevSeededArticles();
}

export async function getTransferArticles() {
  return (await getArticles()).filter(isLeedsTransferArticle);
}

export function getVideos() {
  return byNewest(allVideos.filter(isLongFormYouTubeVideo));
}

export function getFallbackVideosByChannel() {
  return getVideos().reduce<Record<Video["channelId"], Video[]>>(
    (groups, video) => {
      groups[video.channelId] = [...(groups[video.channelId] ?? []), video];
      return groups;
    },
    {
      "leeds-united-official": [],
      "one-leeds": [],
      "the-leeds-view": [],
      "the-square-ball": [],
    },
  );
}

export async function getTopStory() {
  return (await getArticles())[0];
}
