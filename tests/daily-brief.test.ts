import assert from "node:assert/strict";
import fs from "node:fs";
import {
  DAILY_BRIEF_FRESHNESS_MS,
  dailyBriefSendingEnabled,
  evaluateDailyBriefStory,
  getDailyBriefClock,
} from "../src/lib/dailyBrief";
import { selectTopStory } from "../src/lib/topStorySelection";
import { validatePushSubscription } from "../src/lib/pushValidation";
import { pushSubscriptionRow } from "../src/lib/pushStoreRequest";
import { isCronBearerAuthorized } from "../src/lib/cronAuth";
import type { Article } from "../src/types/content";

function story(publishedAt: string, overrides: Partial<Article> = {}): Article {
  return {
    id: "story-1",
    title: "Leeds United top story",
    standfirst: "Latest Leeds United news.",
    sourceId: "leeds-live",
    publishedAt,
    url: "https://www.leeds-live.co.uk/sport/leeds-united/story-123456",
    sourceUrl: "https://www.leeds-live.co.uk/sport/leeds-united/story-123456?utm_source=rss#top",
    category: "news",
    tags: ["Leeds United"],
    readMinutes: 3,
    ...overrides,
  };
}

const now = new Date("2026-01-15T11:30:00.000Z");
const fresh = story(new Date(now.getTime() - DAILY_BRIEF_FRESHNESS_MS).toISOString());
assert.equal(evaluateDailyBriefStory(fresh, now).eligible, true);
assert.equal(
  evaluateDailyBriefStory(
    story(new Date(now.getTime() - DAILY_BRIEF_FRESHNESS_MS - 1).toISOString()),
    now,
  ).reason,
  "story_older_than_18_hours",
);
assert.equal(evaluateDailyBriefStory(story(now.toISOString(), { tags: ["Sponsored"] }), now).eligible, false);
assert.equal(evaluateDailyBriefStory(story(now.toISOString(), { url: "http://unsafe.test", sourceUrl: undefined }), now).eligible, false);

assert.deepEqual(getDailyBriefClock(new Date("2026-01-15T11:30:00.000Z")), {
  dispatchDate: "2026-01-15",
  localTime: "11:30",
  insideDispatchWindow: true,
});
assert.deepEqual(getDailyBriefClock(new Date("2026-07-15T10:30:00.000Z")), {
  dispatchDate: "2026-07-15",
  localTime: "11:30",
  insideDispatchWindow: true,
});
assert.equal(getDailyBriefClock(new Date("2026-07-15T11:30:00.000Z")).insideDispatchWindow, false);

assert.equal(dailyBriefSendingEnabled(true, true), true);
assert.equal(dailyBriefSendingEnabled(true, false), false);
assert.equal(dailyBriefSendingEnabled(false, true), false);

assert.equal(isCronBearerAuthorized(null, undefined), false);
assert.equal(isCronBearerAuthorized(null, "cron-secret"), false);
assert.equal(isCronBearerAuthorized("Bearer wrong", "cron-secret"), false);
assert.equal(isCronBearerAuthorized("Bearer cron-secret", "cron-secret"), true);

const first = story(now.toISOString());
const second = story(now.toISOString(), { id: "story-2", title: "Second" });
assert.equal(selectTopStory([first, second]), first);
assert.equal(selectTopStory([]), null);

const existingShape = validatePushSubscription({
  endpoint: "https://push.example.test/endpoint",
  keys: { p256dh: "key", auth: "auth" },
});
assert.equal(existingShape?.preferences.dailyBrief, false);
const optedIn = validatePushSubscription({
  endpoint: "https://push.example.test/endpoint",
  keys: { p256dh: "key", auth: "auth" },
  preferences: { dailyBrief: true, matchAlerts: false, fullTimeResults: true },
});
assert.deepEqual(optedIn?.preferences, {
  dailyBrief: true,
  matchAlerts: false,
  fullTimeResults: true,
});
assert.equal(
  pushSubscriptionRow(optedIn!, {}).notification_daily_brief,
  true,
);

const migration = fs.readFileSync("supabase/migrations/007_daily_leeds_brief.sql", "utf8");
assert.match(migration, /notification_daily_brief boolean not null default false/);
assert.match(migration, /push_daily_brief_article_once_idx/);
assert.match(migration, /push_daily_brief_date_once_idx/);
assert.match(migration, /on conflict do nothing/);

const homepage = fs.readFileSync("src/app/page.tsx", "utf8");
const service = fs.readFileSync("src/lib/dailyBriefService.ts", "utf8");
assert.match(homepage, /getHomepageStories/);
assert.match(service, /getHomepageStories/);
assert.match(service, /notification_daily_brief|countDailyBriefSubscribers/);
assert.match(service, /dryRun/);
assert.match(service, /sendPushToSubscription/);
assert.match(service, /concurrent_or_duplicate_dispatch/);

const serviceWorker = fs.readFileSync("public/sw.js", "utf8");
assert.match(serviceWorker, /dailyBriefEventId/);

const cronRoute = fs.readFileSync("src/app/api/cron/daily-brief/route.ts", "utf8");
assert.match(cronRoute, /process\.env\.CRON_SECRET/);

console.log("daily brief tests passed");
