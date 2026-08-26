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
    `${url}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth,notification_match_alerts,notification_full_time,is_active&endpoint=eq.${encodeURIComponent(endpoint)}&limit=1`,
    { headers: headers(key), cache: "no-store" },
  );
  await ensureOk(response);
  return ((await response.json()) as StoredPushSubscription[])[0] ?? null;
}

export async function getPushSubscriptionById(id: string) {
  const { url, key } = config();
  const response = await fetch(
    `${url}/rest/v1/push_subscriptions?select=id,endpoint,p256dh,auth,notification_match_alerts,notification_full_time,is_active&id=eq.${encodeURIComponent(id)}&limit=1`,
    { headers: headers(key), cache: "no-store" },
  );
  await ensureOk(response);
  return ((await response.json()) as StoredPushSubscription[])[0] ?? null;
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
