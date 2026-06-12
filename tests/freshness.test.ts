import assert from "node:assert/strict";
import { getArticleUrl } from "../src/lib/articleUrls";
import {
  handleWarmNewsRequest,
  WARM_NEWS_PATHS,
  warmNewsRoutes,
} from "../src/lib/cronWarmNews";
import { NEWS_REVALIDATE_SECONDS } from "../src/lib/content";
import { getNewsSource } from "../src/config/newsSources";

assert.equal(
  NEWS_REVALIDATE_SECONDS,
  300,
  "Leeds news feed cache interval is 300 seconds",
);

const originalCronSecret = process.env.CRON_SECRET;

async function main() {
  process.env.CRON_SECRET = "test-cron-secret";

  const rejected = await handleWarmNewsRequest(
    "https://leedswire.test/api/cron/warm-news?secret=wrong",
  );

  assert.equal(rejected.status, 401, "cron route rejects an invalid secret");
  assert.deepEqual(
    rejected.body,
    { ok: false, error: "Unauthorized" },
    "cron route returns a 401 JSON body for invalid secrets",
  );

  const fetchedUrls: string[] = [];
  const okFetch: typeof fetch = async (input) => {
    fetchedUrls.push(String(input));
    return new Response(null, { status: 200 });
  };

  const accepted = await handleWarmNewsRequest(
    "https://leedswire.test/api/cron/warm-news?secret=test-cron-secret",
    okFetch,
  );

  assert.equal(accepted.status, 200, "cron route accepts a valid secret");
  assert.deepEqual(
    "warmed" in accepted.body ? accepted.body.warmed : [],
    WARM_NEWS_PATHS,
    "cron route warms every expected news route",
  );
  assert.deepEqual(
    fetchedUrls.map((url) => new URL(url).pathname),
    WARM_NEWS_PATHS,
    "cron route fetches every expected path",
  );

  const partial = await warmNewsRoutes(
    "https://leedswire.test/api/cron/warm-news?secret=test-cron-secret",
    async (input) => {
      const pathname = new URL(String(input)).pathname;

      if (pathname === "/news") {
        return new Response(null, { status: 503 });
      }

      return new Response(null, { status: 200 });
    },
  );

  assert.equal(partial.ok, false, "cron result records partial failures");
  assert.equal(
    partial.results.find((result) => result.path === "/news")?.status,
    503,
    "cron route includes the failed route status",
  );
  assert.deepEqual(
    partial.warmed,
    WARM_NEWS_PATHS.filter((path) => path !== "/news"),
    "cron route continues warming other routes after one failure",
  );

  const motSource = getNewsSource("mot-leeds-news");
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

  if (originalCronSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalCronSecret;
  }

  console.info("freshness and cron tests passed");
}

main().catch((error) => {
  if (originalCronSecret === undefined) {
    delete process.env.CRON_SECRET;
  } else {
    process.env.CRON_SECRET = originalCronSecret;
  }

  throw error;
});
