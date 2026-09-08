import {
  fullTimePayload, fullTimeResult, insideFullTimeWindow, knownFullTimeFixture,
  matchFullTimeFixture, selectFullTimeFixture, validFinalScore,
  type KnownFullTimeFixture, type FullTimeProviderMatch, type FullTimeResult, type FullTimeMatchingDiagnostics,
} from "./fullTime";
import type { NextFixture } from "../types/fixture";
import type { SafePushPayload } from "./pushValidation";

export type FullTimeDelivery = { attempted: number; successful: number; failed: number; expired: number; unfinished: number; at: string; eventId: string };
export type FullTimeReport = {
  dryRun: boolean; evaluatedAt: string; knownFixture: KnownFullTimeFixture | null;
  matching: FullTimeMatchingDiagnostics | null;
  providerFixtureId: number | null; providerStatus: string | null;
  score: { home: number | null; away: number | null } | null;
  insideMonitoringWindow: boolean; duplicate: boolean | null; eligibleSubscribers: number | null;
  globalPushEnabled: boolean; fullTimePushEnabled: boolean; wouldSend: boolean; skipReason: string | null;
};
export type FullTimeState = {
  fixture: KnownFullTimeFixture | null;
  provider_fixture_id: number | null;
  last_poll_at: string | null;
  evaluation?: FullTimeReport;
  last_provider_observation?: { at: string; fixtureId: string; providerFixtureId: number; status: string; score: FullTimeReport["score"]; opponentId?: number; observedNonCompleteAt?: string };
  last_completed_match?: { at: string; fixture: KnownFullTimeFixture; result: FullTimeResult };
  last_dispatch?: FullTimeDelivery;
};
export type FullTimeSubscription = { id: string; is_active: boolean; notification_full_time: boolean };
export type FullTimeDependencies<S extends FullTimeSubscription> = {
  flags: { pushEnabled: boolean; fullTimePushEnabled: boolean };
  getState: () => Promise<FullTimeState>;
  getFixtures: () => Promise<NextFixture[]>;
  getMatches: (kickoff: string, pinnedId: number | null) => Promise<FullTimeProviderMatch[]>;
  claimPoll: () => Promise<boolean>;
  isDuplicate: (fixtureId: string) => Promise<boolean>;
  countSubscribers: () => Promise<number>;
  reserve: (fixture: KnownFullTimeFixture, result: FullTimeResult, at: string, eligibleSubscribers: number) => Promise<string | null>;
  subscribers: (afterId: string | null, limit: number) => Promise<S[]>;
  send: (subscription: S, payload: Partial<SafePushPayload>) => Promise<{ sent: boolean; permanent?: boolean }>;
  saveState: (patch: Partial<FullTimeState>) => Promise<void>;
  completeEvent: (eventId: string, delivery: FullTimeDelivery) => Promise<void>;
  logDispatch: (fixture: KnownFullTimeFixture, result: FullTimeResult, delivery: FullTimeDelivery) => void;
};

export async function runFullTimeMonitor<S extends FullTimeSubscription>(
  input: { dryRun: boolean; now?: Date }, deps: FullTimeDependencies<S>,
): Promise<FullTimeReport> {
  const deadline = Date.now() + 220_000;
  const now = input.now ?? new Date();
  const state = await deps.getState();
  const report: FullTimeReport = {
    dryRun: input.dryRun, evaluatedAt: now.toISOString(), knownFixture: null,
    matching: null, providerFixtureId: null, providerStatus: null, score: null, insideMonitoringWindow: false,
    duplicate: null, eligibleSubscribers: null, globalPushEnabled: deps.flags.pushEnabled,
    fullTimePushEnabled: deps.flags.fullTimePushEnabled, wouldSend: false, skipReason: null,
  };
  if (input.dryRun) report.eligibleSubscribers = await deps.countSubscribers();
  let observation: FullTimeState["last_provider_observation"] = undefined;
  let completed: FullTimeState["last_completed_match"] = undefined;
  let delivery: FullTimeDelivery | undefined = undefined;
  async function finish(reason: string | null) {
    report.skipReason = reason;
    if (!input.dryRun) await deps.saveState({
      fixture: report.knownFixture, provider_fixture_id: report.providerFixtureId, evaluation: report,
      ...(observation ? { last_provider_observation: observation } : {}),
      ...(completed ? { last_completed_match: completed } : {}),
      ...(delivery ? { last_dispatch: delivery } : {}),
    });
    return report;
  }
  const fixtures = (await deps.getFixtures()).map(knownFullTimeFixture).filter((fixture): fixture is KnownFullTimeFixture => fixture !== null);
  const selected = selectFullTimeFixture(fixtures, state.fixture, now);
  report.knownFixture = selected.fixture;
  if (selected.ambiguous) return finish("ambiguous_known_fixture");
  if (!selected.fixture) return finish("no_known_fixture");
  const fixture = selected.fixture;
  report.providerFixtureId = state.fixture?.id === fixture.id ? state.provider_fixture_id : null;
  report.insideMonitoringWindow = insideFullTimeWindow(fixture, now);
  if (!report.insideMonitoringWindow) return finish("outside_monitoring_window");
  if (!fixture.competition || !/^(?:England )?Premier League$/i.test(fixture.competition)) return finish("unsupported_competition");
  // Do not poll once an event has been reserved, even if delivery was interrupted.
  if (report.providerFixtureId !== null) {
    report.duplicate = await deps.isDuplicate(`footballdata-io:${report.providerFixtureId}`);
    if (report.duplicate) return finish("fixture_already_reserved");
  }
  report.eligibleSubscribers ??= await deps.countSubscribers();
  if (!input.dryRun && (!deps.flags.pushEnabled || !deps.flags.fullTimePushEnabled)) return finish("sending_disabled");
  if (!input.dryRun && report.eligibleSubscribers === 0) return finish("no_full_time_subscribers");
  if (!input.dryRun && !(await deps.claimPoll())) {
    report.skipReason = "poll_cadence_limited";
    return report; // A concurrent owner must retain its freshly matched fixture and observations.
  }
  let matches: FullTimeProviderMatch[];
  try { matches = await deps.getMatches(fixture.kickoffAt, report.providerFixtureId); }
  catch { return finish("provider_unavailable"); }
  const previous = state.last_provider_observation;
  const sameBinding = previous?.fixtureId === fixture.id && previous.providerFixtureId === report.providerFixtureId;
  const observedAt = sameBinding ? previous.observedNonCompleteAt ?? (previous.status === "incomplete" ? previous.at : undefined) : undefined;
  const observedNonComplete = Boolean(observedAt && insideFullTimeWindow(fixture, new Date(observedAt)) && Date.parse(observedAt) < now.getTime());
  const matched = matchFullTimeFixture(fixture, matches, report.providerFixtureId, {
    observedNonComplete, opponentId: sameBinding ? previous.opponentId : undefined,
  });
  report.matching = matched.diagnostics;
  if (!matched.match) return finish(matched.reason);
  const match = matched.match;
  report.providerFixtureId = match.match_id!;
  report.providerStatus = ["complete", "incomplete", "suspended", "postponed", "cancelled", "abandoned"].includes(match.status ?? "") ? match.status! : "unexpected";
  report.score = { home: validFinalScore(match.score?.home) ? match.score.home : null, away: validFinalScore(match.score?.away) ? match.score.away : null };
  observation = { at: now.toISOString(), fixtureId: fixture.id, providerFixtureId: match.match_id!, status: report.providerStatus, score: report.score,
    opponentId: (fixture.isHome ? match.away_team : match.home_team)?.team_id,
    ...(match.status === "incomplete" ? { observedNonCompleteAt: now.toISOString() } : observedNonComplete ? { observedNonCompleteAt: observedAt } : {}),
  };
  report.duplicate = await deps.isDuplicate(`footballdata-io:${match.match_id}`);
  if (report.duplicate) return finish("fixture_already_reserved");
  if (match.status !== "complete") return finish(report.providerStatus === "unexpected" ? "unexpected_provider_status" : "match_not_complete");
  const result = fullTimeResult(match);
  if (!result) return finish("invalid_final_score");
  // Elapsed time never implies completion, and an early erroneous complete cannot send before kickoff.
  if (now.getTime() < Date.parse(fixture.kickoffAt)) return finish("complete_before_kickoff");
  completed = { at: now.toISOString(), fixture, result };
  if (report.eligibleSubscribers === 0) return finish("no_full_time_subscribers");
  if (!deps.flags.pushEnabled || !deps.flags.fullTimePushEnabled) return finish("sending_disabled");
  report.wouldSend = true;
  if (input.dryRun) return finish(null);
  const eventId = await deps.reserve(fixture, result, now.toISOString(), report.eligibleSubscribers);
  if (!eventId) { report.wouldSend = false; report.duplicate = true; return finish("concurrent_or_duplicate_dispatch"); }
  delivery = { at: new Date().toISOString(), eventId, attempted: 0, successful: 0, failed: 0, expired: 0, unfinished: report.eligibleSubscribers };
  // Persist the positive match and attempt before sending, for interrupted invocations.
  await deps.saveState({ fixture, provider_fixture_id: result.providerFixtureId, last_completed_match: completed, last_dispatch: delivery });
  let afterId: string | null = null;
  let failure: string | null = null;
  try {
    while (true) {
      if (Date.now() >= deadline) { failure = "dispatch_time_budget_exhausted"; break; }
      const subscriptions = await deps.subscribers(afterId, 5);
      if (!subscriptions.length) { delivery.unfinished = 0; break; }
      await Promise.all(subscriptions.map(async (subscription) => {
        if (!subscription.is_active || !subscription.notification_full_time) return;
        delivery!.attempted++;
        try {
          const sent = await deps.send(subscription, fullTimePayload(fixture, result, eventId));
          if (sent.sent) delivery!.successful++;
          else { delivery!.failed++; if (sent.permanent) delivery!.expired++; }
        } catch { delivery!.failed++; }
      }));
      delivery.unfinished = Math.max(0, report.eligibleSubscribers - delivery.attempted);
      await deps.completeEvent(eventId, delivery);
      await deps.saveState({ last_dispatch: delivery });
      if (subscriptions.length < 5) { delivery.unfinished = 0; break; }
      afterId = subscriptions.at(-1)!.id;
    }
  } catch { failure = "dispatch_interrupted"; }
  await deps.completeEvent(eventId, delivery);
  deps.logDispatch(fixture, result, delivery);
  return finish(failure ?? (delivery.successful === 0 ? "no_successful_deliveries" : null));
}
