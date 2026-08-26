import type { ValidPushSubscription } from "@/lib/pushValidation";

export function pushSubscriptionRow(
  subscription: ValidPushSubscription,
  metadata: { userAgent?: string; platform?: string },
) {
  return {
    endpoint: subscription.endpoint,
    p256dh: subscription.keys.p256dh,
    auth: subscription.keys.auth,
    user_agent: metadata.userAgent?.slice(0, 500) || null,
    platform: metadata.platform?.slice(0, 100) || null,
    notification_match_alerts: subscription.preferences.matchAlerts,
    notification_full_time: subscription.preferences.fullTimeResults,
    is_active: true,
    failure_count: 0,
    last_failure_at: null,
  };
}

export function endpointFilter(endpoint: string) {
  return `endpoint=eq.${encodeURIComponent(endpoint)}`;
}
