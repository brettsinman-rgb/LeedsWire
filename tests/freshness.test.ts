import assert from "node:assert/strict";
import { getArticleUrl } from "../src/lib/articleUrls";
import { NEWS_REVALIDATE_SECONDS } from "../src/lib/content";
import { getNewsSource } from "../src/config/newsSources";

assert.equal(
  NEWS_REVALIDATE_SECONDS,
  300,
  "Leeds news feed cache interval is 300 seconds",
);

async function main() {
  const motSource = getNewsSource("mot-leeds-news");
  assert.equal(
    getNewsSource("bbc-football-leeds")?.feedUrl,
    "https://feeds.bbci.co.uk/sport/football/teams/leeds-united/rss.xml",
    "BBC uses its Leeds-specific team feed",
  );
  assert.equal(
    getArticleUrl(
      {
        link: "https://motleedsnews.com/transfers/leeds-united-fresh-transfer-update-after-world-cup-showing",
      },
      motSource,
    ),
    "https://motleedsnews.com/transfers/leeds-united-fresh-transfer-update-after-world-cup-showing",
    "source URL resolution still accepts specific MOT Leeds News stories",
  );

  console.info("news freshness tests passed");
}

main().catch((error) => {
  throw error;
});
