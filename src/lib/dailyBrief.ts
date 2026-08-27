import { createHash } from "node:crypto";
import type { Article } from "@/types/content";

export const DAILY_BRIEF_TIME_ZONE = "Europe/London";
export const DAILY_BRIEF_FRESHNESS_MS = 18 * 60 * 60 * 1000;
export const DAILY_BRIEF_WINDOW_START_MINUTE = 11 * 60 + 25;
export const DAILY_BRIEF_WINDOW_END_MINUTE = 11 * 60 + 39;

export type DailyBriefClock = {
  dispatchDate: string;
  localTime: string;
  insideDispatchWindow: boolean;
};

export type DailyBriefEligibility = {
  eligible: boolean;
  storyAgeMinutes: number | null;
  reason: string | null;
  canonicalUrl: string | null;
  canonicalUrlHash: string | null;
};

function londonParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: DAILY_BRIEF_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    hour: Number(value("hour")),
    minute: Number(value("minute")),
  };
}

export function getDailyBriefClock(now = new Date()): DailyBriefClock {
  const parts = londonParts(now);
  const minuteOfDay = parts.hour * 60 + parts.minute;

  return {
    dispatchDate: `${parts.year}-${parts.month}-${parts.day}`,
    localTime: `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`,
    insideDispatchWindow:
      minuteOfDay >= DAILY_BRIEF_WINDOW_START_MINUTE &&
      minuteOfDay <= DAILY_BRIEF_WINDOW_END_MINUTE,
  };
}

export function canonicalizeArticleUrl(value: string) {
  try {
    const url = new URL(value);
    if (url.protocol !== "https:") return null;
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/+$/, "") || "/";
    return url.toString();
  } catch {
    return null;
  }
}

export function hashCanonicalUrl(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

export function evaluateDailyBriefStory(
  story: Article | null,
  now = new Date(),
): DailyBriefEligibility {
  if (!story) {
    return { eligible: false, storyAgeMinutes: null, reason: "no_top_story", canonicalUrl: null, canonicalUrlHash: null };
  }
  const canonicalUrl = canonicalizeArticleUrl(story.sourceUrl ?? story.url);
  if (!canonicalUrl || !story.id.trim() || !story.title.trim()) {
    return { eligible: false, storyAgeMinutes: null, reason: "invalid_story", canonicalUrl: null, canonicalUrlHash: null };
  }
  const sponsoredText = `${story.title} ${story.tags.join(" ")}`.toLowerCase();
  if (/\b(advert|advertisement|sponsored|paid partnership)\b/.test(sponsoredText)) {
    return { eligible: false, storyAgeMinutes: null, reason: "sponsored_story", canonicalUrl, canonicalUrlHash: hashCanonicalUrl(canonicalUrl) };
  }
  const publishedAt = Date.parse(story.publishedAt);
  const ageMs = now.getTime() - publishedAt;
  const storyAgeMinutes = Number.isFinite(ageMs) ? Math.max(0, Math.floor(ageMs / 60_000)) : null;
  if (storyAgeMinutes === null || ageMs < -5 * 60_000) {
    return { eligible: false, storyAgeMinutes, reason: "invalid_publish_time", canonicalUrl, canonicalUrlHash: hashCanonicalUrl(canonicalUrl) };
  }
  if (ageMs > DAILY_BRIEF_FRESHNESS_MS) {
    return { eligible: false, storyAgeMinutes, reason: "story_older_than_18_hours", canonicalUrl, canonicalUrlHash: hashCanonicalUrl(canonicalUrl) };
  }
  return { eligible: true, storyAgeMinutes, reason: null, canonicalUrl, canonicalUrlHash: hashCanonicalUrl(canonicalUrl) };
}

export function dailyBriefSendingEnabled(globalFlag: boolean, featureFlag: boolean) {
  return globalFlag && featureFlag;
}
