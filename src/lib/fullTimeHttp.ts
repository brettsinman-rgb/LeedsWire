import { FULL_TIME_TEST_PAYLOAD, FULL_TIME_UUID, fullTimeTestRequest } from "./fullTime";
import { isCronBearerAuthorized } from "./cronAuth";
import type { FullTimeSubscription } from "./fullTimeMonitor";

function json(value: unknown, status = 200) {
  return Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
}
export async function fullTimeCronResponse(request: Request, secret: string | undefined, evaluate: () => Promise<unknown>) {
  if (!isCronBearerAuthorized(request.headers.get("authorization"), secret)) return json({ ok: false, error: "Unauthorized" }, 401);
  try { return json({ ok: true, report: await evaluate() }); }
  catch { return json({ ok: false, error: "Full-Time evaluation failed" }, 503); }
}
export async function fullTimeDiagnosticResponse(request: Request, deps: {
  authorized: () => Promise<boolean>; evaluate: () => Promise<unknown>; status: () => Promise<unknown>;
}) {
  if (!(await deps.authorized())) return json({ ok: false, error: "Unauthorized" }, 401);
  let value: unknown;
  try { value = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  if (!value || typeof value !== "object" || (value as { dryRun?: unknown }).dryRun !== true) {
    return json({ ok: false, error: "This endpoint only permits dryRun: true" }, 400);
  }
  try { return json({ ok: true, report: await deps.evaluate(), observability: await deps.status() }); }
  catch { return json({ ok: false, error: "Full-Time diagnostic failed" }, 503); }
}
export async function fullTimeTestResponse<S extends FullTimeSubscription>(request: Request, deps: {
  authorized: () => Promise<boolean>; pushEnabled: boolean;
  getSubscription: (id: string) => Promise<S | null>;
  send: (subscription: S, payload: typeof FULL_TIME_TEST_PAYLOAD) => Promise<{ sent: boolean; permanent?: boolean }>;
}) {
  if (!(await deps.authorized())) return json({ ok: false, error: "Unauthorized" }, 401);
  let value: unknown;
  try { value = await request.json(); } catch { return json({ ok: false, error: "Invalid JSON" }, 400); }
  const id = fullTimeTestRequest(value);
  if (!id) return json({ ok: false, error: "Explicit test: true and a subscription UUID are required" }, 400);
  if (!deps.pushEnabled) return json({ ok: false, error: "Push sending is disabled" }, 403);
  try {
    const subscription = await deps.getSubscription(id);
    if (!subscription?.is_active || !subscription.notification_full_time) return json({ ok: false, error: "Active Full-Time test subscription not found" }, 404);
    const result = await deps.send(subscription, FULL_TIME_TEST_PAYLOAD);
    return json({ ok: result.sent, permanentFailure: result.permanent === true });
  } catch { return json({ ok: false, error: "Full-Time test failed" }, 503); }
}
export async function fullTimeClickResponse(request: Request, track: (id: string) => Promise<void>) {
  const url = new URL(request.url);
  const id = url.searchParams.get("event") ?? "";
  if (FULL_TIME_UUID.test(id)) {
    try { await track(id); } catch { /* Tracking must not strand the visitor. */ }
  }
  // No internal match/result page exists. Keep the visitor in LeedsWire.
  return new Response(null, { status: 307, headers: { Location: new URL("/", url.origin).href, "Cache-Control": "no-store" } });
}
