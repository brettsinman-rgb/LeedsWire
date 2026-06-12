export type NewsCategory = "news" | "transfer" | "media";

export type NewsSourceId =
  | "leeds-live"
  | "yorkshire-evening-post"
  | "leeds-united-official"
  | "sky-sports-leeds"
  | "bbc-football-leeds"
  | "mot-leeds-news"
  | "bbc-premier-league";

export type YouTubeSourceId =
  | "leeds-united-official"
  | "one-leeds"
  | "the-leeds-view"
  | "the-square-ball";

export type TransferType = "Rumour" | "Confirmed" | "Contract" | "Outgoing";

export type Article = {
  id: string;
  title: string;
  standfirst: string;
  sourceId: NewsSourceId;
  publishedAt: string;
  url: string;
  sourceUrl?: string;
  imageUrl?: string;
  category: NewsCategory;
  transferType?: TransferType;
  tags: string[];
  readMinutes: number;
  enrichedImageUrl?: string;
  imageSource?: "rss" | "og" | "twitter" | "metadata" | "html" | "fallback";
};

export type Video = {
  id: string;
  title: string;
  channelId: YouTubeSourceId;
  publishedAt: string;
  youtubeId: string;
  durationSeconds: number;
  thumbnailUrl: string;
  tags: string[];
};
