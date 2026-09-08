import { hasAdminSession } from "@/lib/admin/auth";
import { fullTimeTestResponse } from "@/lib/fullTimeHttp";
import { getPushConfig } from "@/lib/pushConfig";
import { getPushSubscriptionById } from "@/lib/pushStore";
import { sendPushToSubscription } from "@/lib/pushService";

export const maxDuration = 60;

export async function POST(request: Request) {
  return fullTimeTestResponse(request, {
    authorized: hasAdminSession, pushEnabled: getPushConfig().pushEnabled,
    getSubscription: getPushSubscriptionById,
    send: (subscription, payload) => sendPushToSubscription(subscription, payload, { timeout: 8_000 }),
  });
}
