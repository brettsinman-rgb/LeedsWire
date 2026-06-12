import assert from "node:assert/strict";
import { getArticleUrl, isSpecificArticleUrl, withArticleSourceUrl } from "../src/lib/articleUrls";
import { getNewsSource } from "../src/config/newsSources";
import type { Article } from "../src/types/content";

const leedsLive = getNewsSource("leeds-live");
const official = getNewsSource("leeds-united-official");
const bbc = getNewsSource("bbc-football-leeds");
const sky = getNewsSource("sky-sports-leeds");
const mot = getNewsSource("mot-leeds-news");

assert.equal(
  getArticleUrl(
    {
      link: "https://www.leeds-live.co.uk/sport/leeds-united/leeds-united-face-clear-hurdles-34099348",
    },
    leedsLive,
  ),
  "https://www.leeds-live.co.uk/sport/leeds-united/leeds-united-face-clear-hurdles-34099348",
  "uses item.link when it is a specific article",
);

assert.equal(
  getArticleUrl(
    {
      link: "https://www.skysports.com/leeds-united",
      guid: "https://www.skysports.com/football/news/11715/leeds-specific-story-123456",
    },
    sky,
  ),
  "https://www.skysports.com/football/news/11715/leeds-specific-story-123456",
  "falls back to guid when link is generic",
);

assert.equal(
  getArticleUrl(
    {
      link: "https://www.leedsunited.com/news",
      id: "https://www.leedsunited.com/news/first-team-training-return-date-confirmed",
    },
    official,
  ),
  "https://www.leedsunited.com/news/first-team-training-return-date-confirmed",
  "uses id when link is a generic official news page",
);

assert.equal(
  getArticleUrl(
    {
      link: "https://www.bbc.com/sport/football/teams/leeds-united",
      url: "https://www.bbc.com/sport/football/articles/c1234567890o",
    },
    bbc,
  ),
  "https://www.bbc.com/sport/football/articles/c1234567890o",
  "uses item.url after rejecting team page link",
);

assert.equal(
  getArticleUrl(
    {
      link: "https://motleedsnews.com/transfers/rhys-chadwick-daniel-farke-must-do-right-by-leeds-united-talent-this-summer",
    },
    mot,
  ),
  "https://motleedsnews.com/transfers/rhys-chadwick-daniel-farke-must-do-right-by-leeds-united-talent-this-summer",
  "accepts MOT Leeds News category/article slug URLs",
);

assert.equal(
  isSpecificArticleUrl("https://motleedsnews.com/transfers", mot),
  false,
  "rejects MOT Leeds News category pages",
);

for (const url of [
  "https://www.leedsunited.com/",
  "https://www.leedsunited.com/news",
  "https://www.leeds-live.co.uk/all-about/leeds-united-fc",
  "https://www.bbc.com/sport/football/teams/leeds-united",
  "https://www.skysports.com/leeds-united",
  "https://motleedsnews.com/",
]) {
  assert.equal(isSpecificArticleUrl(url, leedsLive), false, `rejects generic URL ${url}`);
}

const story: Article = {
  id: "story",
  title: "Leeds United exact story",
  standfirst: "Leeds United story.",
  sourceId: "leeds-live",
  publishedAt: "2026-06-11T00:00:00.000Z",
  url: "https://www.leeds-live.co.uk/sport/leeds-united/leeds-united-exact-story-34000000",
  category: "news",
  tags: ["Leeds United", "football"],
  readMinutes: 3,
};

assert.equal(
  withArticleSourceUrl(story).sourceUrl,
  story.url,
  "normalizes seeded story URL into sourceUrl when specific",
);

console.log("article-url regression tests passed");
