import assert from "node:assert/strict";
import fs from "node:fs";
import {
  knownFullTimeFixture, insideFullTimeWindow, matchFullTimeFixture, selectFullTimeFixture,
  fullTimeResult, fullTimePayload, fullTimeTestRequest, validFinalScore, fullTimeSearchRange,
  type FullTimeProviderMatch,
} from "../src/lib/fullTime";
import { runFullTimeMonitor, type FullTimeDependencies, type FullTimeState, type FullTimeSubscription } from "../src/lib/fullTimeMonitor";
import { fullTimeClickResponse, fullTimeCronResponse, fullTimeDiagnosticResponse, fullTimeTestResponse } from "../src/lib/fullTimeHttp";
import { shapePushPayload } from "../src/lib/pushValidation";
import type { NextFixture } from "../src/types/fixture";

const eventId = "11111111-1111-4111-8111-111111111111";
const source: NextFixture = {
  homeTeam: "Leeds United", awayTeam: "Crystal Palace", opponent: "Crystal Palace", competition: "Premier League",
  kickoffAt: "2026-09-19T14:00:00.000Z", venue: null, isHome: true, leedsCrestUrl: null, opponentCrestUrl: null,
  matchCentreUrl: null, sourceUrl: "https://www.leedsunited.com/en/matches/mens/fixtures", lastFetchedAt: "2026-09-19T13:00:00.000Z",
};
const fixture = knownFullTimeFixture(source)!;
const now = new Date("2026-09-19T16:00:00.000Z");
const match: FullTimeProviderMatch = {
  match_id: 905082997, date_unix: Date.parse(source.kickoffAt) / 1000, status: "complete",
  league: { league_id: 15 }, season: { year: 20262027 },
  home_team: { team_id: 193, team_name: "Leeds United FC" }, away_team: { team_id: 127, team_name: "Crystal Palace" }, score: { home: 2, away: 0 },
};
const clone = <T>(value: T): T => structuredClone(value);
function harness() {
  let state: FullTimeState = { fixture: null, provider_fixture_id: null, last_poll_at: null };
  const reserved = new Set<string>();
  const calls = { provider: 0, sends: 0, reserves: 0, writes: 0, polls: 0, attempts: 0, logs: 0 };
  const deps: FullTimeDependencies<FullTimeSubscription> = {
    flags: { pushEnabled: true, fullTimePushEnabled: true },
    getState: async () => clone(state), getFixtures: async () => [source],
    getMatches: async () => { calls.provider++; return [clone(match)]; }, claimPoll: async () => { calls.polls++; return true; },
    isDuplicate: async (id) => reserved.has(id), countSubscribers: async () => 1,
    reserve: async (_fixture, result) => { calls.reserves++; if (reserved.has(result.fixtureId)) return null; reserved.add(result.fixtureId); return eventId; },
    subscribers: async () => [{ id: eventId, is_active: true, notification_full_time: true }],
    send: async (_sub, payload) => { calls.sends++; assert.equal(payload.title, "FULL TIME"); return { sent: true }; },
    saveState: async (patch) => { calls.writes++; state = { ...state, ...clone(patch) }; },
    completeEvent: async () => { calls.attempts++; }, logDispatch: () => { calls.logs++; },
  };
  return { deps, calls, state: () => state };
}
function request(body: unknown) {
  return new Request("https://leedswire.test/api/debug/push/full-time", { method: "POST", body: JSON.stringify(body) });
}
async function main() {
  assert.equal(knownFullTimeFixture({ ...source, homeTeam: "Leeds United Women" }), null);
  assert.equal(knownFullTimeFixture({ ...source, kickoffAt: "bad" }), null);
  assert.equal(knownFullTimeFixture(source)?.id, fixture.id);
  for (const [time, expected] of [["13:44:59", false], ["13:45:00", true], ["15:30:00", true], ["16:59:00", true], ["17:00:00", true], ["17:00:01", false]] as const) {
    assert.equal(insideFullTimeWindow(fixture, new Date(`2026-09-19T${time}Z`)), expected);
  }
  assert.equal(selectFullTimeFixture([], fixture, now).fixture?.id, fixture.id);
  assert.equal(selectFullTimeFixture([fixture, { ...fixture, id: "other", awayTeam: "Other" }], null, now).ambiguous, true);
  assert.equal(selectFullTimeFixture([fixture, fixture], null, now).ambiguous, false);
  assert.equal(matchFullTimeFixture(fixture, [match], null).match?.match_id, match.match_id);
  for (const wrong of [
    { ...match, date_unix: match.date_unix! - 86400 },
    { ...match, league: { league_id: 16 } }, { ...match, season: { year: 20252026 } },
    { ...match, home_team: { team_id: 194, team_name: "Leeds United" } },
    { ...match, home_team: { team_id: 193, team_name: "Leeds United U21" } },
    { ...match, away_team: { team_id: 127, team_name: "Newcastle United" } },
    { ...match, date_unix: undefined }, { ...match, match_id: -1 },
  ]) assert.equal(matchFullTimeFixture(fixture, [wrong], null).match, null);
  assert.equal(matchFullTimeFixture(fixture, [match, { ...match, match_id: 123 }], null).reason, "ambiguous_provider_match");
  assert.equal(matchFullTimeFixture(fixture, [match], 123).reason, "provider_fixture_changed");
  const brighton = { ...fixture, homeTeam: "Brighton & Hove Albion", awayTeam: "Leeds United", opponent: "Brighton & Hove Albion", isHome: false };
  assert.ok(matchFullTimeFixture(brighton, [{ ...match, home_team: { team_id: 180, team_name: "Brighton &amp; Hove Albion" }, away_team: { team_id: 193, team_name: "Leeds United" } }], null).match);
  assert.deepEqual(fullTimeSearchRange("2026-10-01T19:00:00Z"), { from: "2026-09-29", to: "2026-10-03" });
  assert.deepEqual(fullTimeSearchRange("2027-01-01T19:00:00Z"), { from: "2026-12-30", to: "2027-01-03" });
  // Real observed schedule discrepancies: identity is exact, official time stays authoritative.
  for (const [opponent, opponentId, officialKickoff, providerKickoff, hours] of [
    ["Crystal Palace", 127, "2026-09-20T13:00:00Z", "2026-09-19T14:00:00Z", -23],
    ["Newcastle United", 141, "2026-09-14T19:00:00Z", "2026-09-12T14:00:00Z", -53],
  ] as const) {
    const official = knownFullTimeFixture({ ...source, awayTeam: opponent, opponent, kickoffAt: officialKickoff })!;
    const candidate = { ...match, status: "incomplete", date_unix: Date.parse(providerKickoff) / 1000,
      away_team: { team_id: opponentId, team_name: opponent + " FC" } };
    const matched = matchFullTimeFixture(official, [candidate], null);
    assert.equal(matched.match?.match_id, match.match_id);
    assert.equal(matched.diagnostics.fixtureMatchStatus, "matched");
    assert.equal(matched.diagnostics.kickoffDifferenceHours, hours);
    assert.equal(matched.diagnostics.providerCandidateCount, 1);
    assert.equal(official.kickoffAt, officialKickoff);
    assert.equal(insideFullTimeWindow(official, new Date(providerKickoff)), false);
    assert.equal(matchFullTimeFixture(official, [{ ...candidate, status: "complete" }], null).reason, "unverified_drifted_complete");
  }
  const incomplete = { ...match, status: "incomplete" };
  assert.ok(matchFullTimeFixture(fixture, [{ ...incomplete, home_team: { team_id: 193, team_name: "Leeds" } }], null).match);
  assert.equal(matchFullTimeFixture(fixture, [{ ...incomplete, date_unix: match.date_unix! + 3 * 86400 }], null).diagnostics.fixtureMatchStatus, "no_candidate");
  assert.ok(matchFullTimeFixture(fixture, [{ ...incomplete, date_unix: match.date_unix! + 2 * 86400 }], null).match);
  const reversed = { ...incomplete, home_team: match.away_team, away_team: match.home_team };
  assert.equal(matchFullTimeFixture(fixture, [reversed], null).diagnostics.homeAwayMatched, false);
  assert.equal(matchFullTimeFixture(fixture, [reversed], null).diagnostics.fixtureMatchStatus, "identity_mismatch");
  const wrongOpponent = { ...incomplete, away_team: { team_id: 141, team_name: "Newcastle United" } };
  assert.equal(matchFullTimeFixture(fixture, [wrongOpponent], null).diagnostics.opponentMatched, false);
  assert.equal(matchFullTimeFixture(fixture, [incomplete, { ...incomplete, match_id: 124 }], null).diagnostics.fixtureMatchStatus, "ambiguous");
  assert.ok(matchFullTimeFixture(fixture, [{ ...incomplete, date_unix: match.date_unix! - 5 * 86400 }], match.match_id!).match); // Bound ID survives schedule changes.
  assert.equal(matchFullTimeFixture(fixture, [incomplete], match.match_id!, { opponentId: 141 }).diagnostics.fixtureMatchStatus, "identity_mismatch");
  for (const score of [null, undefined, "2", NaN, Infinity, -1, 1.2, 101]) assert.equal(validFinalScore(score), false);
  assert.ok(fullTimeResult(match));
  assert.equal(fullTimeResult({ ...match, status: "FT" }), null);
  assert.equal(fullTimeResult({ ...match, status: "incomplete" }), null);
  const payload = shapePushPayload(fullTimePayload(fixture, fullTimeResult(match)!, eventId));
  assert.equal(payload.title, "FULL TIME");
  assert.equal(payload.body, "Leeds United 2 - 0 Crystal Palace");
  assert.equal(payload.destinationUrl, `/api/push/full-time/click?event=${eventId}`);
  assert.equal(payload.icon, "/images/favicon.png");

  const normal = harness();
  const report = await runFullTimeMonitor({ dryRun: false, now }, normal.deps);
  assert.equal(report.wouldSend, true);
  assert.equal(normal.calls.sends, 1);
  assert.equal(normal.calls.logs, 1);
  const totals = clone(normal.state().last_dispatch);
  assert.equal((await runFullTimeMonitor({ dryRun: false, now }, normal.deps)).skipReason, "fixture_already_reserved");
  assert.equal(normal.calls.provider, 1);
  assert.equal(normal.calls.sends, 1);
  await runFullTimeMonitor({ dryRun: false, now: new Date("2026-09-20T12:00:00Z") }, normal.deps);
  assert.deepEqual(normal.state().last_dispatch, totals);
  assert.equal(normal.state().last_provider_observation?.status, "complete");
  assert.ok(normal.state().last_completed_match);

  const concurrent = harness();
  await Promise.all([runFullTimeMonitor({ dryRun: false, now }, concurrent.deps), runFullTimeMonitor({ dryRun: false, now }, concurrent.deps)]);
  assert.equal(concurrent.calls.sends, 1);
  const dry = harness();
  assert.equal((await runFullTimeMonitor({ dryRun: true, now }, dry.deps)).wouldSend, true);
  assert.equal(dry.calls.sends + dry.calls.writes + dry.calls.reserves + dry.calls.polls, 0);
  for (const flags of [{ pushEnabled: false, fullTimePushEnabled: true }, { pushEnabled: true, fullTimePushEnabled: false }, { pushEnabled: false, fullTimePushEnabled: false }]) {
    const disabled = harness(); disabled.deps.flags = flags;
    assert.equal((await runFullTimeMonitor({ dryRun: false, now }, disabled.deps)).skipReason, "sending_disabled");
    assert.equal(disabled.calls.provider + disabled.calls.sends, 0);
    assert.equal((await runFullTimeMonitor({ dryRun: true, now }, disabled.deps)).wouldSend, false);
    assert.equal(disabled.calls.sends, 0);
  }
  const retained = harness();
  retained.deps.getMatches = async () => [{ ...match, status: "incomplete" }];
  await runFullTimeMonitor({ dryRun: false, now: new Date("2026-09-19T13:50:00Z") }, retained.deps);
  retained.deps.getFixtures = async () => []; // Official listing has advanced to the next match.
  retained.deps.getMatches = async (_kickoff, pinned) => { assert.equal(pinned, match.match_id); return [match]; };
  assert.equal((await runFullTimeMonitor({ dryRun: false, now }, retained.deps)).wouldSend, true);
  assert.equal(retained.calls.sends, 1);
  const cup = harness(); cup.deps.getFixtures = async () => [{ ...source, competition: "FA Cup" }];
  assert.equal((await runFullTimeMonitor({ dryRun: false, now }, cup.deps)).skipReason, "unsupported_competition");
  assert.equal(cup.calls.provider, 0);
  const drift = harness();
  const officialDrift = { ...source, kickoffAt: "2026-09-20T13:00:00.000Z" };
  drift.deps.getFixtures = async () => [officialDrift];
  let lookups = 0;
  drift.deps.getMatches = async (kickoff, pinned) => {
    assert.equal(kickoff, officialDrift.kickoffAt);
    assert.equal(pinned, lookups === 0 ? null : match.match_id);
    lookups++;
    return [{ ...match, status: lookups === 1 ? "incomplete" : "complete" }];
  };
  const identified = await runFullTimeMonitor({ dryRun: false, now: new Date("2026-09-20T12:50:00Z") }, drift.deps);
  assert.equal(identified.matching?.fixtureMatchStatus, "matched");
  assert.equal(drift.state().provider_fixture_id, match.match_id);
  assert.equal(drift.state().last_provider_observation?.opponentId, 127);
  const finished = await runFullTimeMonitor({ dryRun: false, now: new Date("2026-09-20T15:00:00Z") }, drift.deps);
  assert.equal(finished.wouldSend, true);
  assert.equal(drift.calls.sends, 1);
  assert.equal(lookups, 2);
  const changedIdentity = harness();
  changedIdentity.deps.getMatches = async () => [{ ...match, status: "incomplete" }];
  await runFullTimeMonitor({ dryRun: false, now }, changedIdentity.deps);
  changedIdentity.deps.getMatches = async (_kickoff, pinned) => {
    assert.equal(pinned, match.match_id);
    return [wrongOpponent];
  };
  assert.equal((await runFullTimeMonitor({ dryRun: false, now: new Date(now.getTime() + 180_000) }, changedIdentity.deps)).matching?.fixtureMatchStatus, "identity_mismatch");
  assert.equal(changedIdentity.state().provider_fixture_id, match.match_id);
  assert.equal(changedIdentity.calls.sends, 0);
  const staleObservation = harness();
  staleObservation.deps.getFixtures = async () => [officialDrift];
  const knownDrift = knownFullTimeFixture(officialDrift)!;
  await staleObservation.deps.saveState({ fixture: knownDrift, provider_fixture_id: match.match_id!,
    last_provider_observation: { at: "2026-09-19T14:00:00Z", fixtureId: knownDrift.id, providerFixtureId: match.match_id!, status: "incomplete", score: null, opponentId: 127 } });
  assert.equal((await runFullTimeMonitor({ dryRun: false, now: new Date("2026-09-20T15:00:00Z") }, staleObservation.deps)).skipReason, "unverified_drifted_complete");
  assert.equal(staleObservation.calls.sends, 0);
  const driftDry = harness();
  driftDry.deps.flags.fullTimePushEnabled = false;
  driftDry.deps.getFixtures = async () => [officialDrift];
  driftDry.deps.getMatches = async () => [{ ...match, status: "incomplete" }];
  const diagnostic = await runFullTimeMonitor({ dryRun: true, now: new Date("2026-09-20T13:00:00Z") }, driftDry.deps);
  assert.deepEqual(diagnostic.matching, { providerCandidateCount: 1, providerKickoffAt: "2026-09-19T14:00:00.000Z", kickoffDifferenceHours: -23, opponentMatched: true, homeAwayMatched: true, competitionMatched: true, fixtureMatchStatus: "matched" });
  assert.equal(diagnostic.fullTimePushEnabled, false);
  assert.equal(diagnostic.wouldSend, false);
  assert.equal(driftDry.calls.writes + driftDry.calls.sends, 0);
  const outside = harness();
  assert.equal((await runFullTimeMonitor({ dryRun: false, now: new Date("2026-09-18T12:00:00Z") }, outside.deps)).skipReason, "outside_monitoring_window");
  assert.equal(outside.calls.provider, 0);
  const none = harness(); none.deps.countSubscribers = async () => 0;
  assert.equal((await runFullTimeMonitor({ dryRun: false, now }, none.deps)).skipReason, "no_full_time_subscribers");
  assert.equal(none.calls.provider, 0);
  const rate = harness(); rate.deps.claimPoll = async () => false;
  assert.equal((await runFullTimeMonitor({ dryRun: false, now }, rate.deps)).skipReason, "poll_cadence_limited");
  assert.equal(rate.calls.provider + rate.calls.writes, 0);
  const timeout = harness(); timeout.deps.getMatches = async () => { throw Error("secret provider error"); };
  const failure = await runFullTimeMonitor({ dryRun: false, now }, timeout.deps);
  assert.equal(failure.skipReason, "provider_unavailable");
  assert.equal(JSON.stringify(failure).includes("secret"), false);
  assert.equal(timeout.calls.sends, 0);
  for (const [matches, reason] of [
    [[], "provider_match_not_found"], [[match, { ...match, match_id: 123 }], "ambiguous_provider_match"],
    [[{ ...match, status: "incomplete" }], "match_not_complete"],
    [[{ ...match, status: "surprise" }], "unexpected_provider_status"],
    [[{ ...match, score: { home: null, away: 0 } }], "invalid_final_score"],
    [[{ ...match, date_unix: match.date_unix! - 86400 }], "unverified_drifted_complete"],
  ] as [FullTimeProviderMatch[], string][]) {
    const h = harness(); h.deps.getMatches = async () => matches;
    assert.equal((await runFullTimeMonitor({ dryRun: false, now }, h.deps)).skipReason, reason);
    assert.equal(h.calls.sends + h.calls.reserves, 0);
  }
  const early = harness();
  assert.equal((await runFullTimeMonitor({ dryRun: false, now: new Date("2026-09-19T13:50:00Z") }, early.deps)).skipReason, "complete_before_kickoff");
  const target = harness(); target.deps.subscribers = async () => [
    { id: "inactive", is_active: false, notification_full_time: true },
    { id: "daily-only", is_active: true, notification_full_time: false },
  ];
  await runFullTimeMonitor({ dryRun: false, now }, target.deps);
  assert.equal(target.calls.sends, 0);
  const expired = harness(); expired.deps.send = async () => ({ sent: false, permanent: true });
  await runFullTimeMonitor({ dryRun: false, now }, expired.deps);
  assert.equal(expired.state().last_dispatch?.expired, 1);

  let evaluated = 0;
  const evaluate = async () => { evaluated++; return report; };
  assert.equal((await fullTimeCronResponse(new Request("https://leedswire.test"), undefined, evaluate)).status, 401);
  assert.equal((await fullTimeCronResponse(new Request("https://leedswire.test", { headers: { Authorization: "Bearer wrong" } }), "secret", evaluate)).status, 401);
  assert.equal(evaluated, 0);
  assert.equal((await fullTimeCronResponse(new Request("https://leedswire.test", { headers: { Authorization: "Bearer secret" } }), "secret", evaluate)).status, 200);
  const debugDeps = { authorized: async () => true, evaluate, status: async () => ({}) };
  assert.equal((await fullTimeDiagnosticResponse(request({ dryRun: true }), { ...debugDeps, authorized: async () => false })).status, 401);
  for (const value of [{}, { dryRun: false }, { dryRun: "true" }, { test: true, subscriptionId: eventId }]) {
    assert.equal((await fullTimeDiagnosticResponse(request(value), debugDeps)).status, 400);
  }
  assert.equal((await fullTimeDiagnosticResponse(request({ dryRun: true }), debugDeps)).status, 200);
  let testSends = 0;
  const testDeps = {
    authorized: async () => true, pushEnabled: true,
    getSubscription: async (id: string) => { assert.equal(id, eventId); return { id, is_active: true, notification_full_time: true }; },
    send: async (_subscription: FullTimeSubscription, data: { title: string; body: string }) => { testSends++; assert.equal(data.title, "LeedsWire Test"); assert.equal(data.body, "Full-Time alerts are connected."); return { sent: true }; },
  };
  for (const input of [{}, { test: true }, { test: true, subscriptionId: [eventId] }, { subscriptionId: eventId }, { test: true, subscriptionId: "all" }]) {
    assert.equal(fullTimeTestRequest(input), null);
    assert.equal((await fullTimeTestResponse(request(input), testDeps)).status, 400);
  }
  assert.equal((await fullTimeTestResponse(request({ test: true, subscriptionId: eventId }), { ...testDeps, authorized: async () => false })).status, 401);
  assert.equal((await fullTimeTestResponse(request({ test: true, subscriptionId: eventId }), { ...testDeps, pushEnabled: false })).status, 403);
  assert.equal(testSends, 0);
  assert.equal((await fullTimeTestResponse(request({ test: true, subscriptionId: eventId }), testDeps)).status, 200);
  assert.equal(testSends, 1);
  let clicks = 0;
  const track = async () => { clicks++; };
  const clicked = await fullTimeClickResponse(new Request(`https://leedswire.test/api/push/full-time/click?event=${eventId}`), track);
  assert.equal(clicked.headers.get("location"), "https://leedswire.test/");
  await fullTimeClickResponse(new Request("https://leedswire.test/api/push/full-time/click?event=bad&url=https://evil.test"), track);
  assert.equal(clicks, 1);
  assert.equal((await fullTimeClickResponse(new Request(`https://leedswire.test/?event=${eventId}`), async () => { throw Error(); })).headers.get("location"), "https://leedswire.test/");

  const store = fs.readFileSync("src/lib/fullTimeStore.ts", "utf8");
  assert.match(store, /is_active=eq.true&notification_full_time=eq.true/);
  assert.match(store, /on_conflict=event_type,fixture_id/);
  assert.match(store, /resolution=ignore-duplicates,return=representation/);
  assert.match(fs.readFileSync("supabase/migrations/006_push_notifications.sql", "utf8"), /unique \(event_type, fixture_id\)/);
  const migration = fs.readFileSync("supabase/migrations/009_full_time_monitor.sql", "utf8");
  assert.match(migration, /150 seconds/);
  assert.match(migration, /enable row level security/);
  assert.match(migration, /event_type = 'full_time'/);
  console.log("full-time tests passed (all providers, stores and deliveries mocked; no real push)");
}
void main();
