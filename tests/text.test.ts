import assert from "node:assert/strict";
import { decodeHtmlEntities, normalizeDecodedText } from "../src/lib/text";

assert.equal(decodeHtmlEntities("Silva&#x27;s"), "Silva's");
assert.equal(decodeHtmlEntities("Leeds &amp; Fulham"), "Leeds & Fulham");
assert.equal(
  decodeHtmlEntities("&quot;Transfer boost&quot;"),
  "\"Transfer boost\"",
);
assert.equal(decodeHtmlEntities("Plain Leeds headline"), "Plain Leeds headline");

assert.equal(decodeHtmlEntities("Silva&#39;s"), "Silva's");
assert.equal(decodeHtmlEntities("Silva&apos;s"), "Silva's");
assert.equal(decodeHtmlEntities("Leeds&#8217; update"), "Leeds’ update");
assert.equal(decodeHtmlEntities("&#8220;Leeds&#8221;"), "“Leeds”");
assert.equal(normalizeDecodedText("Leeds&nbsp;&amp;&nbsp;Fulham"), "Leeds & Fulham");

console.log("text entity decoding tests passed");
