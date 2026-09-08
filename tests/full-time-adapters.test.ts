import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import * as domain from "../src/lib/fullTime";
import type * as Provider from "../src/lib/footballDataIo";
import type * as Store from "../src/lib/fullTimeStore";

function load<T>(path: string, fetcher: typeof fetch): T {
  const exports = {};
  const code = ts.transpileModule(fs.readFileSync(path, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
  vm.runInNewContext(code, {
    exports, require: (name: string) => { if (name === "server-only") return {}; if (name === "./fullTime") return domain; throw Error(`Unexpected import ${name}`); },
    fetch: fetcher, AbortSignal, URL, Date,
    process: { env: { FOOTBALLDATA_IO_KEY: "test-provider-key", SUPABASE_URL: "https://database.test", SUPABASE_SERVICE_ROLE_KEY: "test-store-key" } },
  });
  return exports as T;
}
async function main() {
  const requests: { url: string; init: RequestInit | undefined }[] = [];
  let data: unknown = { matches: [{ match_id: 123 }] };
  const provider = load<typeof Provider>("src/lib/footballDataIo.ts", async (url, init) => {
    requests.push({ url: String(url), init });
    return Response.json({ success: true, data });
  });
  assert.equal((await provider.getFootballDataFullTimeMatches("2026-09-19T14:00:00Z", null))[0].match_id, 123);
  assert.equal(requests[0].url, "https://footballdata.io/api/v1/teams/193/matches?league_id=15&from=2026-09-17&to=2026-09-21&limit=100");
  assert.equal(requests[0].init?.cache, "no-store");
  assert.ok(requests[0].init?.signal);
  assert.equal(new Headers(requests[0].init?.headers).get("authorization"), "Bearer test-provider-key");
  data = { match_id: 123 };
  assert.equal((await provider.getFootballDataFullTimeMatches("2026-09-19T14:00:00Z", 123))[0].match_id, 123);
  assert.equal(requests[1].url, "https://footballdata.io/api/v1/matches/123");
  await assert.rejects(provider.getFootballDataFullTimeMatches("2026-09-19T14:00:00Z", -1));
  data = { wrong: [] };
  await assert.rejects(provider.getFootballDataFullTimeMatches("2026-09-19T14:00:00Z", null));
  const failedProvider = load<typeof Provider>("src/lib/footballDataIo.ts", async () => new Response(null, { status: 503 }));
  await assert.rejects(failedProvider.getFootballDataFullTimeMatches("2026-09-19T14:00:00Z", null), /request failed/);
  const timeoutProvider = load<typeof Provider>("src/lib/footballDataIo.ts", async () => { throw new DOMException("timeout", "TimeoutError"); });
  await assert.rejects(timeoutProvider.getFootballDataFullTimeMatches("2026-09-19T14:00:00Z", null));

  requests.length = 0;
  let responseData: unknown = [];
  const store = load<typeof Store>("src/lib/fullTimeStore.ts", async (url, init) => {
    requests.push({ url: String(url), init });
    if (init?.method === "HEAD") return new Response(null, { headers: { "content-range": "*/2" } });
    return Response.json(responseData);
  });
  assert.equal(await store.countFullTimeSubscribers(), 2);
  await store.getFullTimeSubscribers(null, 5);
  assert.ok(requests.every((request) => request.url.includes("is_active=eq.true&notification_full_time=eq.true")));
  assert.equal(requests.some((request) => request.url.includes("notification_daily_brief=eq.true")), false);
  await store.getFullTimeSubscribers("11111111-1111-4111-8111-111111111111", 5);
  assert.ok(requests.at(-1)?.url.includes("&id=gt.11111111-1111-4111-8111-111111111111&order=id&limit=5"));
  const fixture: domain.KnownFullTimeFixture = { id: "known", homeTeam: "Leeds United", awayTeam: "Crystal Palace", opponent: "Crystal Palace", isHome: true, competition: "Premier League", kickoffAt: "2026-09-19T14:00:00Z" };
  const result: domain.FullTimeResult = { fixtureId: "footballdata-io:123", providerFixtureId: 123, homeScore: 1, awayScore: 0 };
  responseData = [{ id: "reserved-event" }];
  assert.equal(await store.reserveFullTimeEvent(fixture, result, "2026-09-19T16:00:00Z", 2), "reserved-event");
  const reservation = requests.at(-1)!;
  assert.equal(new Headers(reservation.init?.headers).get("prefer"), "resolution=ignore-duplicates,return=representation");
  assert.equal(JSON.parse(String(reservation.init?.body)).event_type, "full_time");
  responseData = [];
  assert.equal(await store.reserveFullTimeEvent(fixture, result, "2026-09-19T16:00:00Z", 2), null);
  await store.saveFullTimeState({ fixture: null });
  assert.equal(String(requests.at(-1)?.init?.body), '{"fixture":null}');
  assert.equal(requests.at(-1)?.init?.method, "PATCH"); // Omitted delivery/observation fields survive skips.
  const before = requests.length;
  assert.equal(await store.getFullTimeClickEvent("invalid"), null);
  assert.equal(requests.length, before);
  await assert.rejects(store.getFullTimeState(), /migration required/);
  responseData = true;
  assert.equal(await store.claimFullTimePoll(), true);
  responseData = false;
  assert.equal(await store.claimFullTimePoll(), false);
  console.log("full-time adapter tests passed (network fully mocked)");
}
void main();
