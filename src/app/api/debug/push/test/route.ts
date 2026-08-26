import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin/auth";
import { getPushConfig } from "@/lib/pushConfig";
import { sendPushToSubscription } from "@/lib/pushService";
import { getPushSubscriptionById } from "@/lib/pushStore";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const input = body && typeof body === "object" ? body as Record<string, unknown> : {};
  const subscriptionId = typeof input.subscriptionId === "string" ? input.subscriptionId : "";
  if (!UUID.test(subscriptionId)) {
    return NextResponse.json({ ok: false, error: "A valid test subscription ID is required" }, { status: 400 });
  }
  const config = getPushConfig();
  if (!config.pushEnabled && input.diagnosticOverride !== true) {
    return NextResponse.json({ ok: false, error: "Push sending is disabled" }, { status: 403 });
  }

  try {
    const subscription = await getPushSubscriptionById(subscriptionId);
    if (!subscription?.is_active) {
      return NextResponse.json({ ok: false, error: "Active test subscription not found" }, { status: 404 });
    }
    const result = await sendPushToSubscription(subscription, {
      title: "LeedsWire Test",
      body: "Push notifications are connected.",
      destinationUrl: "/",
      tag: "leedswire-test",
    });
    return NextResponse.json({ ok: result.sent, permanentFailure: result.sent ? false : result.permanent });
  } catch {
    return NextResponse.json({ ok: false, error: "Test push failed" }, { status: 503 });
  }
}
