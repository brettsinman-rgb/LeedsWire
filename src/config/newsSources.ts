import type { NewsSourceId } from "../types/content";

export type NewsSource = {
  id: NewsSourceId;
  name: string;
  url: string;
  feedUrl?: string;
  type?: "rss" | "html";
  ingestionType: "rss" | "html";
  leedsOnly: boolean;
  approved?: boolean;
  premierLeagueOnly?: boolean;
  publisherImagePreferred: boolean;
};

export const newsSources: NewsSource[] = [
  {
    id: "leeds-live",
    name: "Leeds Live",
    url: "https://www.leeds-live.co.uk/sport/leeds-united/",
    feedUrl: "https://www.leeds-live.co.uk/sport/leeds-united/?service=rss",
    ingestionType: "rss",
    leedsOnly: true,
    publisherImagePreferred: true,
  },
  {
    id: "yorkshire-evening-post",
    name: "Yorkshire Evening Post",
    url: "https://www.yorkshireeveningpost.co.uk/sport/football/leeds-united",
    feedUrl: "https://www.yorkshireeveningpost.co.uk/sport/football/leeds-united/rss",
    ingestionType: "rss",
    leedsOnly: true,
    publisherImagePreferred: true,
  },
  {
    id: "leeds-united-official",
    name: "Leeds United Official",
    url: "https://www.leedsunited.com/news",
    ingestionType: "html",
    leedsOnly: true,
    publisherImagePreferred: true,
  },
  {
    id: "sky-sports-leeds",
    name: "Sky Sports Football",
    url: "https://www.skysports.com/leeds-united",
    feedUrl: "https://www.skysports.com/rss/12040",
    ingestionType: "rss",
    leedsOnly: false,
    publisherImagePreferred: true,
  },
  {
    id: "bbc-football-leeds",
    name: "BBC Football",
    url: "https://www.bbc.com/sport/football/teams/leeds-united",
    feedUrl: "https://feeds.bbci.co.uk/sport/football/rss.xml",
    ingestionType: "rss",
    leedsOnly: false,
    publisherImagePreferred: true,
  },
  {
    id: "mot-leeds-news",
    name: "MOT Leeds News",
    url: "https://motleedsnews.com/",
    feedUrl: "https://motleedsnews.com/feed/",
    type: "rss",
    ingestionType: "rss",
    leedsOnly: true,
    approved: true,
    publisherImagePreferred: true,
  },
  {
    id: "bbc-premier-league",
    name: "BBC Premier League",
    url: "https://www.bbc.com/sport/football/premier-league",
    type: "html",
    ingestionType: "html",
    leedsOnly: false,
    premierLeagueOnly: true,
    publisherImagePreferred: true,
  },
];

export function getNewsSource(sourceId: NewsSourceId) {
  return newsSources.find((source) => source.id === sourceId);
}
