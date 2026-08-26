import { NextResponse } from "next/server";
import { upsertPushSubscription } from "@/lib/pushStore";
import { validatePushSubscription } from "@/lib/pushValidation";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const subscription = validatePushSubscription(body);
  if (!subscription) {
    return NextResponse.json({ ok: false, error: "Invalid push subscription" }, { status: 400 });
  }

  try {
    const result = await upsertPushSubscription(subscription, {
      userAgent: request.headers.get("user-agent") ?? undefined,
      platform: request.headers.get("sec-ch-ua-platform")?.replaceAll('"', "") ?? undefined,
    });
    return NextResponse.json(
      { ok: true, persisted: result.persisted },
      { headers: { "cache-control": "no-store" } },
    );
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[LeedsWire push] subscription persistence failed", {
        error: error instanceof Error ? error.message : "Unknown storage error",
      });
    }
    return NextResponse.json(
      { ok: false, persisted: false, error: "Unable to save push subscription", code: "PUSH_STORAGE_FAILED" },
      { status: 503 },
    );
  }
}
