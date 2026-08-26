import "server-only";
import webPush from "web-push";
import { getPushConfig, hasVapidConfig } from "@/lib/pushConfig";
import { recordPushResult, type StoredPushSubscription } from "@/lib/pushStore";
import { isPermanentPushFailure, shapePushPayload, type SafePushPayload } from "@/lib/pushValidation";

export async function sendPushToSubscription(
  subscription: StoredPushSubscription,
  payload: Partial<SafePushPayload>,
) {
  const config = getPushConfig();
  if (!hasVapidConfig(config)) throw new Error("VAPID is not configured");
  webPush.setVapidDetails(config.vapidSubject, config.vapidPublicKey, config.vapidPrivateKey);

  try {
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
    return { sent: false as const, permanent, statusCode };
  }
}
