import assert from "node:assert/strict";
import { itemToArticle, parseRssItems } from "../src/lib/content";
import { getNewsSource } from "../src/config/newsSources";

const source = getNewsSource("leeds-all-over");

assert.ok(source, "Leeds All Over source is configured");

const [item] = parseRssItems(`
  <rss>
    <channel>
      <item>
        <title><![CDATA[Transfer update for Leeds United target]]></title>
        <link>https://www.leedsallover.com/leeds-united-target-julian-brandts-agent-spotted-at-real-betis/</link>
        <dc:creator><![CDATA[Kris Smith]]></dc:creator>
        <pubDate>Tue, 30 Jun 2026 18:30:00 +0000</pubDate>
        <category><![CDATA[Latest News]]></category>
        <category><![CDATA[Leeds United]]></category>
        <description><![CDATA[<p>Leeds United are in the hunt to sign a midfielder.</p>]]></description>
        <content:encoded><![CDATA[
          <p>Leeds United article body.</p>
          <img src="https://thumbs.smartframe.io/example.webp?force-scraper=rss&amp;t=rss" alt="SmartFrame Image" />
        ]]></content:encoded>
      </item>
    </channel>
  </rss>
`);

assert.equal(item.author, "Kris Smith", "extracts RSS author");
assert.deepEqual(item.categories, ["Latest News", "Leeds United"], "extracts RSS categories");
assert.equal(
  item.imageUrl,
  "https://thumbs.smartframe.io/example.webp?force-scraper=rss&t=rss",
  "extracts the first content image when media tags are absent",
);

const article = itemToArticle(item, source);

assert.ok(article, "maps Leeds All Over RSS item to an Article");
assert.equal(article.author, "Kris Smith", "maps author onto Article");
assert.equal(
  article.sourceUrl,
  "https://www.leedsallover.com/leeds-united-target-julian-brandts-agent-spotted-at-real-betis/",
  "maps one-segment Leeds All Over article slugs",
);
assert.ok(article.tags.includes("Latest News"), "maps RSS categories into tags");

console.log("RSS parser regression tests passed");
