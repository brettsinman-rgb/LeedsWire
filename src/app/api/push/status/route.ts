import { NextResponse } from "next/server";
import { getPushConfig } from "@/lib/pushConfig";
import { getPushSubscriptionByEndpoint } from "@/lib/pushStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const config = getPushConfig();
  const endpoint = new URL(request.url).searchParams.get("endpoint");
  let subscription = null;
  if (endpoint?.startsWith("https://") && endpoint.length <= 4096) {
    try { subscription = await getPushSubscriptionByEndpoint(endpoint); } catch { subscription = null; }
  }

  return NextResponse.json({
    configured: Boolean(config.vapidPublicKey),
    publicKey: config.vapidPublicKey || null,
    subscribed: Boolean(subscription?.is_active),
    preferences: subscription?.is_active
      ? {
          matchAlerts: subscription.notification_match_alerts,
          fullTimeResults: subscription.notification_full_time,
        }
      : null,
  }, { headers: { "cache-control": "no-store" } });
}
