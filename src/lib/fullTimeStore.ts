import "server-only";
import type { StoredPushSubscription } from "./pushStore";
import { FULL_TIME_UUID, type KnownFullTimeFixture, type FullTimeResult } from "./fullTime";
import type { FullTimeDelivery, FullTimeState } from "./fullTimeMonitor";

export const FULL_TIME_SUBSCRIBER_FILTER = "is_active=eq.true&notification_full_time=eq.true";
async function request(path: string, init: RequestInit = {}) {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Full-Time store is not configured");
  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...init, cache: "no-store", signal: AbortSignal.timeout(5_000),
    headers: { apikey: key, Authorization: `Bearer ${key}`, "Content-Type": "application/json", ...init.headers },
  });
  if (!response.ok) throw new Error("Full-Time store request failed");
  return response;
}
export async function getFullTimeState(): Promise<FullTimeState> {
  const response = await request("push_full_time_status?select=fixture,provider_fixture_id,last_poll_at,evaluation,last_provider_observation,last_completed_match,last_dispatch&singleton=eq.true");
  const rows = await response.json() as FullTimeState[];
  if (!rows[0]) throw new Error("Full-Time monitor migration required");
  return rows[0];
}
export async function saveFullTimeState(patch: Partial<FullTimeState>) {
  await request("push_full_time_status?singleton=eq.true", { method: "PATCH", body: JSON.stringify(patch) });
}
export async function claimFullTimePoll() {
  return await (await request("rpc/claim_full_time_poll", { method: "POST", body: "{}" })).json() === true;
}
export async function fullTimeAlreadyReserved(fixtureId: string) {
  const response = await request(`push_notification_events?select=id&event_type=eq.full_time&fixture_id=eq.${encodeURIComponent(fixtureId)}&limit=1`);
  return ((await response.json()) as unknown[]).length > 0;
}
export async function countFullTimeSubscribers() {
  const response = await request(`push_subscriptions?select=id&${FULL_TIME_SUBSCRIBER_FILTER}`, { method: "HEAD", headers: { Prefer: "count=exact" } });
  const count = Number(response.headers.get("content-range")?.split("/")[1]);
  if (!Number.isSafeInteger(count) || count < 0) throw new Error("Full-Time subscriber count unavailable");
  return count;
}
export async function getFullTimeSubscribers(afterId: string | null, limit: number): Promise<StoredPushSubscription[]> {
  const after = afterId ? `&id=gt.${encodeURIComponent(afterId)}` : "";
  const response = await request(`push_subscriptions?select=id,endpoint,p256dh,auth,is_active,notification_full_time,notification_match_alerts,notification_daily_brief&${FULL_TIME_SUBSCRIBER_FILTER}${after}&order=id&limit=${Math.min(limit, 50)}`);
  return response.json();
}
export async function reserveFullTimeEvent(fixture: KnownFullTimeFixture, result: FullTimeResult, at: string, eligibleSubscribers: number) {
  const response = await request("push_notification_events?on_conflict=event_type,fixture_id", {
    method: "POST", headers: { Prefer: "resolution=ignore-duplicates,return=representation" },
    body: JSON.stringify({ event_type: "full_time", fixture_id: result.fixtureId,
      home_team: fixture.homeTeam, away_team: fixture.awayTeam, home_score: result.homeScore, away_score: result.awayScore,
      provider: "footballdata.io", provider_status: "complete", detected_at: at, eligible_subscribers: eligibleSubscribers }),
  });
  return ((await response.json()) as { id: string }[])[0]?.id ?? null;
}
export async function completeFullTimeEvent(eventId: string, delivery: FullTimeDelivery) {
  await request(`push_notification_events?id=eq.${encodeURIComponent(eventId)}&event_type=eq.full_time`, {
    method: "PATCH", body: JSON.stringify({ attempted_deliveries: delivery.attempted,
      successful_deliveries: delivery.successful, failed_deliveries: delivery.failed, expired_subscriptions: delivery.expired,
      ...(delivery.successful > 0 ? { sent_at: delivery.at } : {}),
    }),
  });
}
export async function getFullTimeClickEvent(eventId: string) {
  if (!FULL_TIME_UUID.test(eventId)) return null;
  const response = await request(`push_notification_events?select=fixture_id,home_team,away_team,home_score,away_score&event_type=eq.full_time&id=eq.${encodeURIComponent(eventId)}&limit=1`);
  return ((await response.json()) as { fixture_id: string; home_team: string; away_team: string; home_score: number; away_score: number }[])[0] ?? null;
}
export async function recordFullTimeClick(eventId: string) {
  await request("rpc/record_full_time_click", { method: "POST", body: JSON.stringify({ input_event_id: eventId }) });
}
