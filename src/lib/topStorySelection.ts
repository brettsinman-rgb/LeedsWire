import type { Article } from "@/types/content";

export function selectTopStory(articles: Article[]) {
  return articles[0] ?? null;
}
