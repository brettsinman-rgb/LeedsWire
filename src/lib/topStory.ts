import "server-only";
import { enrichArticleImages } from "@/lib/articleImages";
import { getArticles } from "@/lib/content";
import { selectTopStory } from "@/lib/topStorySelection";

export async function getHomepageStories() {
  const articles = await enrichArticleImages(await getArticles());

  return {
    articles,
    topStory: selectTopStory(articles),
  };
}
