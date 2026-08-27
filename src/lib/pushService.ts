import "server-only";
import webPush from "web-push";
import { getPushConfig, hasVapidConfig } from "@/lib/pushConfig";
import { recordPushResult, type StoredPushSubscription } from "@/lib/pushStore";
import { isPermanentPushFailure, shapePushPayload, type SafePushPayload } from "@/lib/pushValidation";

export type PushFailureCategory =
  | "expired"
  | "authentication"
  | "vapid_configuration"
  | "network"
  | "payload"
  | "push_service"
  | "unknown";

function safeFailureCategory(error: unknown, statusCode: number): PushFailureCategory {
  if (isPermanentPushFailure(statusCode)) return "expired";
  if (statusCode === 401 || statusCode === 403) return "authentication";
  if (statusCode === 400 || statusCode === 413) return "payload";
  if (statusCode >= 500) return "push_service";
  const code = typeof error === "object" && error && "code" in error
    ? String(error.code)
    : "";
  if (["ECONNRESET", "ETIMEDOUT", "ENOTFOUND", "EAI_AGAIN"].includes(code)) return "network";
  return "unknown";
}

export async function sendPushToSubscription(
  subscription: StoredPushSubscription,
  payload: Partial<SafePushPayload>,
) {
  const config = getPushConfig();
  if (!hasVapidConfig(config)) {
    return { sent: false as const, permanent: false, statusCode: 0, failureCategory: "vapid_configuration" as const };
  }

  try {
    webPush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);
    await webPush.sendNotification(
      { endpoint: subscription.endpoint, keys: { p256dh: subscription.p256dh, auth: subscription.auth } },
      JSON.stringify(shapePushPayload(payload)),
      { TTL: 60 },
    );
    await recordPushResult(subscription.id, true);
    return { sent: true as const };
  } catch (error) {
    const statusCode = typeof error === "object" && error && "statusCode" in error
      ? Number(error.statusCode)
      : 0;
    const permanent = isPermanentPushFailure(statusCode);
    await recordPushResult(subscription.id, false, permanent);
    return { sent: false as const, permanent, statusCode, failureCategory: safeFailureCategory(error, statusCode) };
  }
}
