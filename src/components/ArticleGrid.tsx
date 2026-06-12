import { ArticleCard } from "@/components/ArticleCard";
import type { Article } from "@/types/content";

type ArticleGridProps = {
  articles: Article[];
  layout?: "featured" | "uniform";
};

export function ArticleGrid({ articles, layout = "featured" }: ArticleGridProps) {
  if (layout === "uniform") {
    return (
      <div className="grid items-stretch gap-6 md:grid-cols-2 xl:grid-cols-3">
        {articles.map((article) => (
          <ArticleCard key={article.id} article={article} variant="standard" />
        ))}
      </div>
    );
  }

  const [lead, ...rest] = articles;

  if (!lead) {
    return null;
  }

  return (
    <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,1.45fr)_minmax(330px,0.95fr)]">
      <div className="lg:max-h-[520px] lg:min-h-[420px]">
        <ArticleCard article={lead} variant="wide" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-1">
        {rest.slice(0, 3).map((article) => (
          <ArticleCard key={article.id} article={article} variant="compact" />
        ))}
      </div>
    </div>
  );
}
