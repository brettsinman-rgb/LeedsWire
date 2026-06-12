import { fallbackImage } from "./content";
import type { Article } from "../types/content";

type ImageSource = NonNullable<Article["imageSource"]>;

type EnrichedImage = {
  imageUrl: string;
  imageSource: ImageSource;
};

const imageCache = new Map<string, EnrichedImage>();
const imageReachabilityCache = new Map<string, boolean>();

const rejectedUrlParts = [
  "favicon",
  "logo",
  "icon",
  "placeholder",
  "default",
  "googleusercontent",
  "gstatic",
  "news.google",
  "tracking",
  "pixel",
  "spacer",
  "blank",
  "avatar",
];

const genericImageHosts = ["images.unsplash.com", "images.pexels.com", "cdn.pixabay.com"];

function decodeHtml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .trim();
}

function resolveImageUrl(imageUrl: string, articleUrl: string) {
  try {
    return new URL(decodeHtml(imageUrl), articleUrl).toString();
  } catch {
    return "";
  }
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

function hasSmallDimensionHints(url: string) {
  const width = url.match(/[?&](?:w|width)=([0-9]+)/i)?.[1];
  const height = url.match(/[?&](?:h|height)=([0-9]+)/i)?.[1];

  return Number(width ?? 9999) < 220 || Number(height ?? 9999) < 160;
}

function isUsableImageUrl(imageUrl: string, articleUrl: string, allowExternal = false) {
  const resolved = resolveImageUrl(imageUrl, articleUrl);

  if (!resolved) {
    return false;
  }

  const lower = resolved.toLowerCase();

  if (
    rejectedUrlParts.some((part) => lower.includes(part)) ||
    lower.startsWith("data:") ||
    lower.endsWith(".svg") ||
    hasSmallDimensionHints(lower)
  ) {
    return false;
  }

  const imageHost = getHostname(resolved);
  const articleHost = getHostname(articleUrl);

  if (!allowExternal && genericImageHosts.includes(imageHost)) {
    return false;
  }

  return allowExternal || !imageHost || !articleHost || imageHost === articleHost || !genericImageHosts.includes(imageHost);
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

function parseAttributes(tag: string) {
  const attributes = new Map<string, string>();

  for (const match of tag.matchAll(/([a-zA-Z0-9:-]+)=["']([^"']+)["']/g)) {
    attributes.set(match[1].toLowerCase(), decodeHtml(match[2]));
  }

  return attributes;
}

function bestFromSrcSet(srcset: string) {
  return srcset
    .split(",")
    .map((candidate) => {
      const [url = "", width = "0w"] = candidate.trim().split(/\s+/);
      return {
        url,
        width: Number(width.replace(/\D/g, "")) || 0,
      };
    })
    .sort((a, b) => b.width - a.width)[0]?.url;
}

function findLargestHtmlImage(html: string, articleUrl: string) {
  const candidates = [...html.matchAll(/<img\b[^>]*>/gi)]
    .map((match) => {
      const attributes = parseAttributes(match[0]);
      const srcset = attributes.get("srcset") ?? attributes.get("data-srcset");
      const src =
        (srcset ? bestFromSrcSet(srcset) : "") ??
        attributes.get("data-src") ??
        attributes.get("data-original") ??
        attributes.get("src") ??
        "";
      const width = Number(attributes.get("width") ?? 0);
      const height = Number(attributes.get("height") ?? 0);

      return {
        src,
        score: width * height || width || 0,
      };
    })
    .filter((candidate) => isUsableImageUrl(candidate.src, articleUrl, true))
    .sort((a, b) => b.score - a.score);

  return candidates[0]?.src ?? "";
}

async function fetchArticleHtml(articleUrl: string) {
  const fetchOptions: RequestInit & { next?: { revalidate: number } } = {
    signal: AbortSignal.timeout(4000),
    headers: {
      "user-agent": "LeedsWire image enrichment",
      accept: "text/html,application/xhtml+xml",
    },
    next: { revalidate: 3600 },
  };
  const response = await fetch(articleUrl, fetchOptions);

  if (!response.ok) {
    throw new Error(`Article HTML fetch failed: ${response.status}`);
  }

  return response.text();
}

function fromExistingImage(article: Article): EnrichedImage | null {
  if (!article.imageUrl || !isUsableImageUrl(article.imageUrl, article.url)) {
    return null;
  }

  return {
    imageUrl: resolveImageUrl(article.imageUrl, article.url),
    imageSource: article.imageSource ?? "rss",
  };
}

async function isReachableImage(imageUrl: string) {
  if (imageUrl.startsWith("/")) {
    return true;
  }

  const cached = imageReachabilityCache.get(imageUrl);

  if (cached !== undefined) {
    return cached;
  }

  const attempts: RequestInit[] = [
    { method: "HEAD", signal: AbortSignal.timeout(1500) },
    {
      method: "GET",
      signal: AbortSignal.timeout(1500),
      headers: { range: "bytes=0-0" },
    },
  ];

  for (const options of attempts) {
    try {
      const response = await fetch(imageUrl, options);
      const contentType = response.headers.get("content-type") ?? "";
      const ok =
        response.ok &&
        (!contentType || contentType.toLowerCase().startsWith("image/"));

      if (ok) {
        imageReachabilityCache.set(imageUrl, true);
        return true;
      }
    } catch {
      // Try the next lightweight validation strategy.
    }
  }

  imageReachabilityCache.set(imageUrl, false);
  return false;
}

async function resolveHeroImage(article: Article): Promise<EnrichedImage> {
  const existing = fromExistingImage(article);

  if (existing && (await isReachableImage(existing.imageUrl))) {
    return existing;
  }

  try {
    const html = await fetchArticleHtml(article.url);
    const orderedMeta: Array<[ImageSource, string[]]> = [
      ["og", ["og:image", "og:image:secure_url"]],
      ["twitter", ["twitter:image", "twitter:image:src"]],
      ["metadata", ["article:image", "image"]],
    ];

    for (const [imageSource, keys] of orderedMeta) {
      for (const key of keys) {
        const imageUrl = getMetaContent(html, key);

        const resolvedImageUrl = resolveImageUrl(imageUrl, article.url);

        if (
          imageUrl &&
          isUsableImageUrl(imageUrl, article.url, true) &&
          (await isReachableImage(resolvedImageUrl))
        ) {
          return {
            imageUrl: resolvedImageUrl,
            imageSource,
          };
        }
      }
    }

    const htmlImage = findLargestHtmlImage(html, article.url);

    const resolvedHtmlImage = resolveImageUrl(htmlImage, article.url);

    if (htmlImage && (await isReachableImage(resolvedHtmlImage))) {
      return {
        imageUrl: resolvedHtmlImage,
        imageSource: "html",
      };
    }
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[LeedsWire article image] enrichment failed", {
        articleUrl: article.url,
        error,
      });
    }
  }

  return {
    imageUrl: fallbackImage,
    imageSource: "fallback",
  };
}

export async function getArticleHeroImage(article: Article): Promise<Article> {
  const cached = imageCache.get(article.url);
  const image = cached ?? (await resolveHeroImage(article));

  if (!cached) {
    imageCache.set(article.url, image);
  }

  return {
    ...article,
    imageUrl: image.imageUrl,
    enrichedImageUrl: image.imageUrl,
    imageSource: image.imageSource,
  };
}

export async function enrichArticleImages(articles: Article[]) {
  return Promise.all(articles.map((article) => getArticleHeroImage(article)));
}
