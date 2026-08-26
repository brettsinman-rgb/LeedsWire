import { NextResponse } from "next/server";
import { deactivatePushSubscription } from "@/lib/pushStore";

export async function POST(request: Request) {
  let body: unknown;
  try { body = await request.json(); } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  const endpoint = body && typeof body === "object" && "endpoint" in body
    ? (body as { endpoint?: unknown }).endpoint
    : null;
  if (typeof endpoint !== "string" || !endpoint.startsWith("https://") || endpoint.length > 4096) {
    return NextResponse.json({ ok: false, error: "Invalid push endpoint" }, { status: 400 });
  }

  try {
    await deactivatePushSubscription(endpoint);
    return NextResponse.json({ ok: true }, { headers: { "cache-control": "no-store" } });
  } catch {
    return NextResponse.json({ ok: false, error: "Unable to remove push subscription" }, { status: 503 });
  }
}
