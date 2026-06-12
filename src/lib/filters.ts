import type { Article, Video } from "../types/content";
import { getNewsSource } from "../config/newsSources";

const leedsTerms = [
  "leeds united",
  "leeds",
  "lufc",
  "elland road",
  "daniel farke",
  "the whites",
  "whites",
];

const footballTerms = [
  "football",
  "fixture",
  "match",
  "goal",
  "squad",
  "transfer",
  "loan",
  "contract",
  "premier league",
  "championship",
  "cup",
  "elland road",
  "manager",
  "farke",
];

const localNewsRejectTerms = [
  "traffic",
  "weather",
  "crime",
  "police",
  "restaurant",
  "property",
  "council",
  "roadworks",
  "shopping",
  "school",
];

const genericFootballRejectTerms = [
  "betting",
  "odds",
  "fantasy",
  "dream team",
  "round-up",
  "roundup",
  "rumour mill",
  "gossip column",
  "all 20 clubs",
  "team of the week",
  "score predictions",
  "predictions",
  "complete guide",
  "power rankings",
];

const otherClubOnlyTerms = [
  "manchester united",
  "man utd",
  "man city",
  "liverpool",
  "chelsea",
  "arsenal",
  "tottenham",
  "newcastle",
  "everton",
  "aston villa",
  "sunderland",
  "sheffield wednesday",
  "sheffield united",
];

const transferTerms = [
  "transfer",
  "transfers",
  "sign",
  "signed",
  "signing",
  "loan",
  "rumour",
  "rumor",
  "deal",
  "deals",
  "contract",
  "release",
  "retained list",
  "outgoing",
  "incoming",
  "interest",
  "target",
  "bid",
  "clause",
  "exit",
  "exits",
  "join",
  "agree",
  "agreed",
  "talks",
];

const leedsPeopleTerms = [
  "daniel farke",
  "farke",
  "elland road",
  "thorp arch",
  "paraag marathe",
  "angus kinnear",
  "karl darlow",
  "illan meslier",
  "sam byram",
  "alex cairns",
  "lucas radebe",
  "marcelo bielsa",
  "raphinha",
  "gabriel gudmundsson",
  "harry wilson",
  "hayden hackney",
];

const weakNonLeedsHeadlinePatterns = [
  "everything you need to know",
  "complete guide",
  "who is playing",
  "how does it work",
];

function normalize(value: string) {
  return value.toLowerCase();
}

function includesAny(text: string, terms: string[]) {
  return terms.some((term) => text.includes(term));
}

function urlPath(article: Article) {
  try {
    return new URL(article.url).pathname.toLowerCase();
  } catch {
    return article.url.toLowerCase();
  }
}

function isClearlyLeedsUrl(article: Article) {
  const path = urlPath(article);

  return path.includes("leeds-united") || path.includes("/leeds/");
}

function hasWeakNonLeedsHeadline(title: string) {
  return includesAny(title, weakNonLeedsHeadlinePatterns);
}

function hasOtherClubPrimaryHeadline(title: string) {
  const leedsIndex = Math.min(
    ...leedsTerms
      .map((term) => title.indexOf(term))
      .filter((index) => index >= 0),
  );
  const otherClubIndex = Math.min(
    ...otherClubOnlyTerms
      .map((term) => title.indexOf(term))
      .filter((index) => index >= 0),
  );

  if (!Number.isFinite(otherClubIndex)) {
    return false;
  }

  return !Number.isFinite(leedsIndex) || otherClubIndex < leedsIndex;
}

export function isLeedsFootballArticle(article: Article) {
  const title = normalize(article.title);
  const standfirst = normalize(article.standfirst);
  const tags = normalize(article.tags.join(" "));
  const text = normalize(
    `${article.title} ${article.standfirst} ${article.tags.join(" ")}`,
  );
  const source = getNewsSource(article.sourceId);
  const headlineHasLeeds = includesAny(title, leedsTerms);
  const headlineHasLeedsPerson = includesAny(title, leedsPeopleTerms);
  const urlHasLeeds = isClearlyLeedsUrl(article);
  const summaryHasLeeds = includesAny(`${standfirst} ${tags}`, leedsTerms);
  const sourceIsLeedsSpecific = source?.leedsOnly === true;
  const isFootball =
    article.sourceId === "leeds-united-official" || includesAny(text, footballTerms);
  const isLocalNews = includesAny(text, localNewsRejectTerms);
  const isGenericFootball = includesAny(text, genericFootballRejectTerms);
  const isOtherClubOnly =
    includesAny(text, otherClubOnlyTerms) && !text.includes("leeds");
  const otherClubPrimary = hasOtherClubPrimaryHeadline(title);
  const weakNonLeedsHeadline = !headlineHasLeeds && hasWeakNonLeedsHeadline(title);

  const hasPrimaryLeedsSignal =
    article.sourceId === "leeds-united-official" ||
    headlineHasLeeds ||
    (headlineHasLeedsPerson && (urlHasLeeds || summaryHasLeeds)) ||
    (urlHasLeeds && sourceIsLeedsSpecific && summaryHasLeeds);

  return (
    hasPrimaryLeedsSignal &&
    isFootball &&
    !isLocalNews &&
    !isGenericFootball &&
    !isOtherClubOnly &&
    !otherClubPrimary &&
    !weakNonLeedsHeadline
  );
}

export function isLeedsTransferArticle(article: Article) {
  const title = normalize(article.title);
  const text = normalize(`${article.title} ${article.standfirst} ${article.tags.join(" ")}`);
  const path = urlPath(article);
  const transferInHeadline = includesAny(title, transferTerms);
  const transferInStrongContext =
    includesAny(text, transferTerms) &&
    (includesAny(title, leedsTerms) ||
      includesAny(title, leedsPeopleTerms) ||
      isClearlyLeedsUrl(article));
  const transferInPath =
    path.includes("transfer") ||
    path.includes("contract") ||
    path.includes("retained-list") ||
    path.includes("loan");

  return (
    isLeedsFootballArticle(article) &&
    (transferInHeadline || transferInStrongContext || transferInPath)
  );
}

export function isLongFormYouTubeVideo(video: Video) {
  const text = normalize(`${video.title} ${video.tags.join(" ")}`);
  const isShort =
    video.durationSeconds < 180 ||
    text.includes("#shorts") ||
    text.includes("shorts") ||
    text.includes("youtube shorts");

  return !isShort && includesAny(text, leedsTerms);
}
