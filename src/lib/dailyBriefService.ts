import "server-only";
import { getPushConfig } from "@/lib/pushConfig";
import { sendPushToSubscription } from "@/lib/pushService";
import {
  completeDailyBriefEvent,
  countDailyBriefSubscribers,
  getDailyBriefDuplicateState,
  getDailyBriefSubscribers,
  reserveDailyBriefEvent,
  updateDailyBriefStatus,
} from "@/lib/pushStore";
import {
  dailyBriefSendingEnabled,
  evaluateDailyBriefStory,
  getDailyBriefClock,
} from "@/lib/dailyBrief";
import { getHomepageStories } from "@/lib/topStory";

const SUBSCRIBER_BATCH_SIZE = 50;
const DELIVERY_CONCURRENCY = 5;

type DailyBriefReport = {
  dryRun: boolean;
  ukDispatchDate: string;
  ukLocalTime: string;
  insideDispatchWindow: boolean;
  selectedStory: null | { id: string; headline: string; sourceId: string; destinationUrl: string };
  storyAgeMinutes: number | null;
  eligible: boolean;
  duplicate: { articleAlreadySent: boolean; dateAlreadyUsed: boolean };
  eligibleSubscriberCount: number;
  sendingEnabled: boolean;
  wouldSend: boolean;
  sent: number;
  failed: number;
  skipReason: string | null;
};

async function deliverBatch<T>(
  items: T[],
  worker: (item: T) => Promise<boolean>,
) {
  let cursor = 0;
  let sent = 0;
  let failed = 0;
  async function consume() {
    while (cursor < items.length) {
      const item = items[cursor++];
      if (await worker(item)) sent += 1;
      else failed += 1;
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(DELIVERY_CONCURRENCY, items.length) }, consume),
  );
  return { sent, failed };
}

export async function runDailyBrief(input: { dryRun: boolean; now?: Date }) {
  const now = input.now ?? new Date();
  const evaluatedAt = now.toISOString();
  const clock = getDailyBriefClock(now);
  const { topStory } = await getHomepageStories();
  const eligibility = evaluateDailyBriefStory(topStory, now);
  const config = getPushConfig();
  const sendingEnabled = dailyBriefSendingEnabled(
    config.pushEnabled,
    config.dailyBriefPushEnabled,
  );
  const duplicate = eligibility.canonicalUrlHash
    ? await getDailyBriefDuplicateState(eligibility.canonicalUrlHash, clock.dispatchDate)
    : { articleAlreadySent: false, dateAlreadyUsed: false };
  const eligibleSubscriberCount = await countDailyBriefSubscribers();
  const duplicateReason = duplicate.articleAlreadySent
    ? "article_already_sent"
    : duplicate.dateAlreadyUsed
      ? "daily_brief_already_sent_today"
      : null;
  const skipReason = !clock.insideDispatchWindow
    ? "outside_dispatch_window"
    : !eligibility.eligible
      ? eligibility.reason
      : duplicateReason
        ? duplicateReason
        : eligibleSubscriberCount === 0
          ? "no_eligible_subscribers"
          : !sendingEnabled
            ? "sending_disabled"
            : null;
  const wouldSend = skipReason === null;
  const selectedStory = topStory && eligibility.canonicalUrl
    ? {
        id: topStory.id,
        headline: topStory.title,
        sourceId: topStory.sourceId,
        destinationUrl: eligibility.canonicalUrl,
      }
    : null;
  const report: DailyBriefReport = {
    dryRun: input.dryRun,
    ukDispatchDate: clock.dispatchDate,
    ukLocalTime: clock.localTime,
    insideDispatchWindow: clock.insideDispatchWindow,
    selectedStory,
    storyAgeMinutes: eligibility.storyAgeMinutes,
    eligible: eligibility.eligible && !duplicateReason,
    duplicate,
    eligibleSubscriberCount,
    sendingEnabled,
    wouldSend,
    sent: 0,
    failed: 0,
    skipReason,
  };

  if (input.dryRun || !wouldSend || !selectedStory || !eligibility.canonicalUrlHash) {
    if (!input.dryRun) {
      await updateDailyBriefStatus({
        evaluatedAt,
        articleId: topStory?.id,
        headline: topStory?.title,
        successfulDeliveries: 0,
        failedDeliveries: 0,
        skipReason,
      });
    }
    return report;
  }

  const eventId = await reserveDailyBriefEvent({
    articleId: selectedStory.id,
    canonicalUrl: selectedStory.destinationUrl,
    canonicalUrlHash: eligibility.canonicalUrlHash,
    headline: selectedStory.headline,
    sourceId: selectedStory.sourceId,
    detectedAt: evaluatedAt,
    dispatchDate: clock.dispatchDate,
  });
  if (!eventId) {
    report.wouldSend = false;
    report.eligible = false;
    report.skipReason = "concurrent_or_duplicate_dispatch";
    await updateDailyBriefStatus({
      evaluatedAt,
      articleId: selectedStory.id,
      headline: selectedStory.headline,
      successfulDeliveries: 0,
      failedDeliveries: 0,
      skipReason: report.skipReason,
    });
    return report;
  }

  let afterId: string | null = null;
  while (true) {
    const subscriptions = await getDailyBriefSubscribers(afterId, SUBSCRIBER_BATCH_SIZE);
    if (subscriptions.length === 0) break;
    const result = await deliverBatch(subscriptions, async (subscription) => {
      const delivery = await sendPushToSubscription(subscription, {
        title: "LEEDSWIRE DAILY",
        body: selectedStory.headline,
        destinationUrl: `/api/push/daily-brief/click?event=${eventId}`,
        tag: "leedswire-daily-brief",
        dailyBriefEventId: eventId,
      });
      return delivery.sent;
    });
    report.sent += result.sent;
    report.failed += result.failed;
    if (subscriptions.length < SUBSCRIBER_BATCH_SIZE) break;
    afterId = subscriptions.at(-1)?.id ?? null;
  }

  await completeDailyBriefEvent(eventId, report.sent, report.failed);
  await updateDailyBriefStatus({
    evaluatedAt,
    successfulAt: report.sent > 0 ? new Date().toISOString() : null,
    articleId: selectedStory.id,
    headline: selectedStory.headline,
    successfulDeliveries: report.sent,
    failedDeliveries: report.failed,
    skipReason: report.sent > 0 ? null : "no_successful_deliveries",
  });
  report.skipReason = report.sent > 0 ? null : "no_successful_deliveries";
  return report;
}
