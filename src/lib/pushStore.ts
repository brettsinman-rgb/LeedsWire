import "server-only";
import type { ValidPushSubscription } from "@/lib/pushValidation";
import { endpointFilter, pushSubscriptionRow } from "@/lib/pushStoreRequest";

export type StoredPushSubscription = {
  id: string;
  endpoint: string;
  p256dh: string;
  auth: string;
  notification_match_alerts: boolean;
  notification_full_time: boolean;
  notification_daily_brief: boolean;
  is_active: boolean;
};

function config() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Push subscription storage is not configured");
  return { url, key };
}

function headers(key: string, prefer?: string) {
  return {
    apikey: key,
    authorization: `Bearer ${key}`,
    "content-type": "application/json",
    ...(prefer ? { prefer } : {}),
  };
}

async function ensureOk(response: Response) {
  if (!response.ok) throw new Error(`Push subscription storage failed (${response.status})`);
}

export async function upsertPushSubscription(
  subscription: ValidPushSubscription,
  metadata: { userAgent?: string; platform?: string },
) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/push_subscriptions?on_conflict=endpoint&select=id`, {
    method: "POST",
    headers: headers(key, "resolution=merge-duplicates,return=representation"),
    body: JSON.stringify(pushSubscriptionRow(subscription, metadata)),
    cache: "no-store",
  });
  await ensureOk(response);
  const rows = (await response.json()) as Array<{ id?: string }>;
  if (rows.length !== 1 || typeof rows[0]?.id !== "string") {
    throw new Error("Push subscription persistence was not confirmed");
  }
  return { persisted: true as const };
}

export async function deactivatePushSubscription(endpoint: string) {
  const { url, key } = config();
  const response = await fetch(
    `${url}/rest/v1/push_subscriptions?${endpointFilter(endpoint)}`,
    {
      method: "PATCH",
      headers: headers(key, "return=minimal"),
      body: JSON.stringify({ is_active: false }),
      cache: "no-store",
    },
  );
  await ensureOk(response);
}

export async function getPushSubscriptionByEndpoint(endpoint: string) {
  const { url, key } = config();
  const response = await fetch(
    `${url}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth,notification_match_alerts,notification_full_time,notification_daily_brief,is_active&endpoint=eq.${encodeURIComponent(endpoint)}&limit=1`,
    { headers: headers(key), cache: "no-store" },
  );
  await ensureOk(response);
  return ((await response.json()) as StoredPushSubscription[])[0] ?? null;
}

export async function getPushSubscriptionById(id: string) {
  const { url, key } = config();
  const response = await fetch(
    `${url}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth,notification_match_alerts,notification_full_time,notification_daily_brief,is_active&id=eq.${encodeURIComponent(id)}&limit=1`,
    { headers: headers(key), cache: "no-store" },
  );
  await ensureOk(response);
  return ((await response.json()) as StoredPushSubscription[])[0] ?? null;
}

export async function countDailyBriefSubscribers() {
  const { url, key } = config();
  const response = await fetch(
    `${url}/rest/v1/push_subscriptions?select=id&is_active=eq.true&notification_daily_brief=eq.true`,
    { method: "HEAD", headers: headers(key, "count=exact"), cache: "no-store" },
  );
  await ensureOk(response);
  const range = response.headers.get("content-range") ?? "";
  return Number(range.split("/")[1] ?? 0) || 0;
}

export async function getDailyBriefSubscribers(afterId: string | null, limit: number) {
  const { url, key } = config();
  const after = afterId ? `&id=gt.${encodeURIComponent(afterId)}` : "";
  const response = await fetch(
    `${url}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth,notification_match_alerts,notification_full_time,notification_daily_brief,is_active&is_active=eq.true&notification_daily_brief=eq.true${after}&order=id&limit=${limit}`,
    { headers: headers(key), cache: "no-store" },
  );
  await ensureOk(response);
  return (await response.json()) as StoredPushSubscription[];
}

export type DailyBriefDuplicateState = {
  articleAlreadySent: boolean;
  dateAlreadyUsed: boolean;
};

export async function getDailyBriefDuplicateState(
  canonicalUrlHash: string,
  dispatchDate: string,
): Promise<DailyBriefDuplicateState> {
  const { url, key } = config();
  const query = new URLSearchParams({
    select: "canonical_url_hash,dispatch_date",
    event_type: "eq.daily_brief",
    or: `(canonical_url_hash.eq.${canonicalUrlHash},dispatch_date.eq.${dispatchDate})`,
  });
  const response = await fetch(`${url}/rest/v1/push_notification_events?${query}`, {
    headers: headers(key), cache: "no-store",
  });
  await ensureOk(response);
  const rows = (await response.json()) as Array<{ canonical_url_hash?: string; dispatch_date?: string }>;
  return {
    articleAlreadySent: rows.some((row) => row.canonical_url_hash === canonicalUrlHash),
    dateAlreadyUsed: rows.some((row) => row.dispatch_date === dispatchDate),
  };
}

export async function reserveDailyBriefEvent(input: {
  articleId: string;
  canonicalUrl: string;
  canonicalUrlHash: string;
  headline: string;
  sourceId: string;
  detectedAt: string;
  dispatchDate: string;
}) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/rpc/reserve_daily_brief_event`, {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify({
      input_article_id: input.articleId,
      input_canonical_url: input.canonicalUrl,
      input_canonical_url_hash: input.canonicalUrlHash,
      input_headline: input.headline,
      input_source_id: input.sourceId,
      input_detected_at: input.detectedAt,
      input_dispatch_date: input.dispatchDate,
    }),
    cache: "no-store",
  });
  await ensureOk(response);
  const id = (await response.json()) as string | null;
  return typeof id === "string" && id ? id : null;
}

export async function completeDailyBriefEvent(
  eventId: string,
  metrics: {
    eligibleSubscribers: number;
    attemptedDeliveries: number;
    successfulDeliveries: number;
    failedDeliveries: number;
    expiredSubscriptions: number;
    failureSummary: Record<string, number>;
  },
) {
  const { url, key } = config();
  const response = await fetch(
    `${url}/rest/v1/push_notification_events?id=eq.${encodeURIComponent(eventId)}`,
    {
      method: "PATCH",
      headers: headers(key, "return=minimal"),
      body: JSON.stringify({
        sent_at: metrics.successfulDeliveries > 0 ? new Date().toISOString() : null,
        eligible_subscribers: metrics.eligibleSubscribers,
        attempted_deliveries: metrics.attemptedDeliveries,
        successful_deliveries: metrics.successfulDeliveries,
        failed_deliveries: metrics.failedDeliveries,
        expired_subscriptions: metrics.expiredSubscriptions,
        failure_summary: metrics.failureSummary,
      }),
      cache: "no-store",
    },
  );
  await ensureOk(response);
}

export async function updateDailyBriefStatus(input: {
  evaluatedAt: string;
  successfulAt?: string | null;
  articleId?: string | null;
  headline?: string | null;
  successfulDeliveries: number;
  failedDeliveries: number;
  skipReason?: string | null;
  deliveryMetrics?: {
    attemptedAt: string;
    eligibleSubscribers: number;
    attemptedDeliveries: number;
    expiredSubscriptions: number;
    failureSummary: Record<string, number>;
  };
}) {
  const { url, key } = config();
  const response = await fetch(
    `${url}/rest/v1/push_daily_brief_status?on_conflict=singleton`,
    {
      method: "POST",
      headers: headers(key, "resolution=merge-duplicates,return=minimal"),
      body: JSON.stringify({
        singleton: true,
        last_evaluated_at: input.evaluatedAt,
        ...(input.successfulAt ? { last_successful_dispatch_at: input.successfulAt } : {}),
        ...(input.deliveryMetrics ? {
          last_dispatch_attempt_at: input.deliveryMetrics.attemptedAt,
          eligible_subscribers: input.deliveryMetrics.eligibleSubscribers,
          attempted_deliveries: input.deliveryMetrics.attemptedDeliveries,
          successful_deliveries: input.successfulDeliveries,
          failed_deliveries: input.failedDeliveries,
          expired_subscriptions: input.deliveryMetrics.expiredSubscriptions,
          failure_summary: input.deliveryMetrics.failureSummary,
        } : {}),
        selected_article_id: input.articleId ?? null,
        selected_headline: input.headline?.slice(0, 500) ?? null,
        skip_reason: input.skipReason ?? null,
        updated_at: input.evaluatedAt,
      }),
      cache: "no-store",
    },
  );
  await ensureOk(response);
}

export async function getDailyBriefEventDestination(eventId: string) {
  const { url, key } = config();
  const response = await fetch(
    `${url}/rest/v1/push_notification_events?select=canonical_url&id=eq.${encodeURIComponent(eventId)}&event_type=eq.daily_brief&limit=1`,
    { headers: headers(key), cache: "no-store" },
  );
  await ensureOk(response);
  const row = ((await response.json()) as Array<{ canonical_url?: string }>)[0];
  return row?.canonical_url ?? null;
}

export async function recordDailyBriefClick(eventId: string) {
  const { url, key } = config();
  const response = await fetch(`${url}/rest/v1/rpc/record_daily_brief_click`, {
    method: "POST",
    headers: headers(key),
    body: JSON.stringify({ input_event_id: eventId }),
    cache: "no-store",
  });
  await ensureOk(response);
}

export async function getDailyBriefStatus() {
  const { url, key } = config();
  const response = await fetch(
    `${url}/rest/v1/push_daily_brief_status?select=last_evaluated_at,last_dispatch_attempt_at,last_successful_dispatch_at,selected_article_id,selected_headline,eligible_subscribers,attempted_deliveries,successful_deliveries,failed_deliveries,expired_subscriptions,failure_summary,skip_reason&singleton=eq.true&limit=1`,
    { headers: headers(key), cache: "no-store" },
  );
  await ensureOk(response);
  return ((await response.json()) as Array<Record<string, unknown>>)[0] ?? null;
}

export async function recordPushResult(id: string, success: boolean, permanent = false) {
  const { url, key } = config();
  const now = new Date().toISOString();
  const body = success
    ? { last_success_at: now, failure_count: 0 }
    : {
        last_failure_at: now,
        ...(permanent ? { is_active: false } : {}),
      };
  const response = await fetch(
    `${url}/rest/v1/push_subscriptions?id=eq.${encodeURIComponent(id)}`,
    { method: "PATCH", headers: headers(key, "return=minimal"), body: JSON.stringify(body), cache: "no-store" },
  );
  await ensureOk(response);

  if (!success) {
    const increment = await fetch(`${url}/rest/v1/rpc/increment_push_failure`, {
      method: "POST",
      headers: headers(key),
      body: JSON.stringify({ subscription_id: id }),
      cache: "no-store",
    });
    await ensureOk(increment);
  }
}
