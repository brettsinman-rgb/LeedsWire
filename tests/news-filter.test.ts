import assert from "node:assert/strict";
import { isLeedsFootballArticle, isLeedsTransferArticle } from "../src/lib/filters";
import type { Article } from "../src/types/content";

function article(overrides: Partial<Article>): Article {
  return {
    id: "test-story",
    title: "Leeds United injury update before Arsenal match",
    standfirst: "Daniel Farke has provided the latest Leeds United squad news.",
    sourceId: "leeds-live",
    publishedAt: "2026-06-11T00:00:00.000Z",
    url: "https://www.leeds-live.co.uk/sport/leeds-united/leeds-united-injury-update",
    category: "news",
    tags: ["Leeds United", "football"],
    readMinutes: 3,
    ...overrides,
  };
}

const acceptedFootball: Array<[string, Article]> = [
  [
    "accepts Leeds headline stories",
    article({
      title: "Leeds United injury update before Premier League return",
      standfirst: "Leeds United are assessing two players before the next fixture.",
    }),
  ],
  [
    "accepts Leeds official stories without explicit Leeds headline",
    article({
      sourceId: "leeds-united-official",
      title: "First-team training return date confirmed",
      standfirst: "The Whites will return to Thorp Arch next week.",
      url: "https://www.leedsunited.com/news/first-team-training-return-date-confirmed",
    }),
  ],
  [
    "accepts Leeds manager stories",
    article({
      title: "Daniel Farke outlines summer transfer plan",
      standfirst: "Leeds United are expected to move early in the window.",
      url: "https://www.leeds-live.co.uk/sport/leeds-united/daniel-farke-transfer-plan",
    }),
  ],
  [
    "accepts audited Leeds Live false negative",
    article({
      title: "Leeds United have important off-field appointment to make - and it’s not in the dugout",
      standfirst: "Leeds United have a key appointment to make as plans continue.",
      url: "https://www.leeds-live.co.uk/sport/leeds-united/leeds-united-important-field-appointment-34098304",
    }),
  ],
  [
    "accepts audited YEP false negative",
    article({
      sourceId: "yorkshire-evening-post",
      title: "Leeds United's strongest XI and bench with pair departing and Whites in talks with three others",
      standfirst: "Leeds United continue to shape the squad before the Premier League season.",
      url: "https://www.yorkshireeveningpost.co.uk/sport/football/leeds-united/leeds-uniteds-new-best-xi-and-bench-8668534",
    }),
  ],
  [
    "accepts audited Harry Wilson false negative",
    article({
      title: "How close Leeds United came to signing Harry Wilson and why this summer is different",
      standfirst: "Leeds United explored a transfer before changing their summer approach.",
      url: "https://www.leeds-live.co.uk/sport/leeds-united/how-close-leeds-united-came-34087494",
    }),
  ],
];

const rejectedFootball: Array<[string, Article]> = [
  [
    "rejects generic Premier League stories",
    article({
      sourceId: "bbc-football-leeds",
      title: "Complete guide to all Premier League fixtures",
      standfirst: "Leeds are mentioned once among several clubs in the division.",
      url: "https://www.bbc.com/sport/football/articles/premier-league-guide",
    }),
  ],
  [
    "rejects Leeds only in summary",
    article({
      sourceId: "sky-sports-leeds",
      title: "Arsenal transfer roundup as striker talks continue",
      standfirst: "Leeds United have also been linked, but Arsenal remain the focus.",
      url: "https://www.skysports.com/football/news/arsenal-transfer-roundup",
    }),
  ],
  [
    "rejects another club as primary subject",
    article({
      title: "Manchester United consider move for midfielder also linked with Leeds",
      standfirst: "Manchester United are leading the race, with Leeds United mentioned as previous admirers.",
      url: "https://www.leeds-live.co.uk/sport/manchester-united-midfielder-leeds",
    }),
  ],
  [
    "rejects fantasy football stories",
    article({
      sourceId: "bbc-football-leeds",
      title: "Fantasy Premier League picks for the weekend",
      standfirst: "Leeds players are among dozens of names considered.",
      url: "https://www.bbc.com/sport/football/articles/fantasy-premier-league",
    }),
  ],
  [
    "rejects betting stories",
    article({
      sourceId: "sky-sports-leeds",
      title: "Premier League betting odds and tips this weekend",
      standfirst: "Leeds United are one of several clubs included in the betting preview.",
      url: "https://www.skysports.com/football/news/betting-odds",
    }),
  ],
  [
    "rejects broad transfer roundups without Leeds as primary subject",
    article({
      title: "Premier League transfer roundup: Arsenal, Chelsea and Liverpool latest",
      standfirst: "Leeds United are mentioned once among the wider transfer gossip.",
      url: "https://www.skysports.com/football/news/premier-league-transfer-roundup",
    }),
  ],
  [
    "rejects audited false positive",
    article({
      title: "Everything you need to know about Karl Darlow contract talks and Illan Meslier future",
      standfirst: "Leeds United goalkeepers are part of the latest contract discussion.",
      url: "https://www.leeds-live.co.uk/sport/leeds-united/everything-you-need-know-karl-34097746",
    }),
  ],
];

const acceptedTransfers: Array<[string, Article]> = [
  [
    "accepts Leeds transfer headline",
    article({
      title: "Leeds United ready new transfer bid for striker",
      standfirst: "Leeds United are preparing a new bid in the summer window.",
      category: "transfer",
      tags: ["Leeds United", "transfer", "bid"],
    }),
  ],
  [
    "accepts Leeds contract talks",
    article({
      title: "Leeds United retained list as contract talks continue",
      standfirst: "Leeds United are negotiating with senior players.",
      category: "transfer",
      tags: ["Leeds United", "contract"],
    }),
  ],
];

for (const [name, story] of acceptedFootball) {
  assert.equal(isLeedsFootballArticle(story), true, name);
}

for (const [name, story] of rejectedFootball) {
  assert.equal(isLeedsFootballArticle(story), false, name);
}

for (const [name, story] of acceptedTransfers) {
  assert.equal(isLeedsTransferArticle(story), true, name);
}

assert.equal(
  isLeedsTransferArticle(
    article({
      title: "Leeds United fixture analysis before opening month",
      standfirst: "Leeds United face a difficult Premier League run.",
      tags: ["Leeds United", "fixtures"],
    }),
  ),
  false,
  "rejects Leeds non-transfer story from transfer feed",
);

console.log("news-filter regression tests passed");
