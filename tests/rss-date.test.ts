import assert from "node:assert/strict";
import {
  normalizeArticleDate,
  parseRssDate,
  sortNewestFirst,
} from "../src/lib/rssDates";

assert.equal(
  parseRssDate("Fri, 19 Jun 2026 10:09:00 BST"),
  Date.parse("2026-06-19T09:09:00.000Z"),
  "BST is normalized to UTC+1",
);
assert.equal(
  parseRssDate("Fri, 19 Jun 2026 10:09:00 GMT"),
  Date.parse("2026-06-19T10:09:00.000Z"),
  "GMT is normalized to UTC",
);
assert.equal(
  parseRssDate("2026-06-19T10:09:00Z"),
  Date.parse("2026-06-19T10:09:00.000Z"),
  "ISO RSS dates remain supported",
);
assert.equal(
  normalizeArticleDate("not-a-date", "2026-06-19T08:00:00Z"),
  "2026-06-19T08:00:00.000Z",
  "invalid publication dates fall back to fetch time",
);

const sorted = sortNewestFirst([
  { id: "leeds", publishedAt: "Fri, 19 Jun 2026 10:00:00 GMT" },
  { id: "invalid", publishedAt: "invalid", fetchedAt: "invalid" },
  { id: "mot", publishedAt: "Fri, 19 Jun 2026 12:00:00 BST" },
  { id: "fallback", publishedAt: "invalid", fetchedAt: "2026-06-19T10:30:00Z" },
]);

assert.deepEqual(
  sorted.map(({ id }) => id),
  ["mot", "fallback", "leeds", "invalid"],
  "sources interleave by resolved time and irrecoverable dates sort last",
);

console.log("RSS date parsing and ordering tests passed");
