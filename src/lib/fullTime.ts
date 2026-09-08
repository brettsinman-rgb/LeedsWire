import { createHash } from "node:crypto";
import { normalizeDecodedText } from "./text";
import type { NextFixture } from "../types/fixture";
import type { SafePushPayload } from "./pushValidation";

export const FULL_TIME_WINDOW_BEFORE_MS = 15 * 60_000;
export const FULL_TIME_WINDOW_AFTER_MS = 3 * 60 * 60_000;
export const FULL_TIME_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
export type KnownFullTimeFixture = Pick<NextFixture, "homeTeam" | "awayTeam" | "opponent" | "competition" | "kickoffAt" | "isHome"> & { id: string };
export type FullTimeProviderMatch = {
  match_id?: number;
  date_unix?: number;
  status?: string;
  league?: { league_id?: number; competition_name?: string; name?: string };
  season?: { year?: number };
  home_team?: { team_id?: number; team_name?: string };
  away_team?: { team_id?: number; team_name?: string };
  score?: { home?: unknown; away?: unknown };
};
export type FullTimeResult = {
  providerFixtureId: number;
  fixtureId: string;
  homeScore: number;
  awayScore: number;
};

function teamName(value: string) {
  const normalized = normalizeDecodedText(value).toLowerCase().replace(/\b(fc|afc)\b/g, "").replace(/[^a-z0-9]/g, "");
  return normalized === "leeds" ? "leedsunited" : normalized;
}
export function knownFullTimeFixture(fixture: NextFixture): KnownFullTimeFixture | null {
  const home = teamName(fixture.homeTeam);
  const away = teamName(fixture.awayTeam);
  if ((home === "leedsunited") === (away === "leedsunited") || !Number.isFinite(Date.parse(fixture.kickoffAt))) return null;
  const identity = `${home}|${away}|${fixture.kickoffAt}|${fixture.competition ?? ""}`;
  return {
    id: createHash("sha256").update(identity).digest("hex"),
    homeTeam: fixture.homeTeam, awayTeam: fixture.awayTeam,
    opponent: home === "leedsunited" ? fixture.awayTeam : fixture.homeTeam,
    competition: fixture.competition, kickoffAt: fixture.kickoffAt, isHome: home === "leedsunited",
  };
}
export function insideFullTimeWindow(fixture: KnownFullTimeFixture, now: Date) {
  const elapsed = now.getTime() - Date.parse(fixture.kickoffAt);
  return elapsed >= -FULL_TIME_WINDOW_BEFORE_MS && elapsed <= FULL_TIME_WINDOW_AFTER_MS;
}
export function selectFullTimeFixture(fixtures: KnownFullTimeFixture[], retained: KnownFullTimeFixture | null, now: Date) {
  const unique = new Map(fixtures.map((fixture) => [fixture.id, fixture]));
  // Prefer current official timing if a previously retained fixture has been rescheduled.
  if (retained && !fixtures.some((fixture) => fixture.homeTeam === retained.homeTeam && fixture.awayTeam === retained.awayTeam &&
    Math.abs(Date.parse(fixture.kickoffAt) - Date.parse(retained.kickoffAt)) < 24 * 60 * 60_000)) unique.set(retained.id, retained);
  const active = [...unique.values()].filter((fixture) => insideFullTimeWindow(fixture, now));
  return {
    fixture: active.length === 1 ? active[0] : active.length > 1 ? null :
      [...unique.values()].filter((fixture) => Date.parse(fixture.kickoffAt) > now.getTime()).sort((a, b) => Date.parse(a.kickoffAt) - Date.parse(b.kickoffAt))[0] ?? null,
    ambiguous: active.length > 1,
  };
}
export function fullTimeSearchRange(kickoffAt: string) {
  const day = Date.parse(new Date(kickoffAt).toISOString().slice(0, 10));
  return {
    from: new Date(day - 2 * 86400_000).toISOString().slice(0, 10),
    to: new Date(day + 2 * 86400_000).toISOString().slice(0, 10),
  };
}
export type FullTimeMatchingDiagnostics = {
  providerCandidateCount: number;
  providerKickoffAt: string | null;
  kickoffDifferenceHours: number | null;
  opponentMatched: boolean;
  homeAwayMatched: boolean;
  competitionMatched: boolean;
  fixtureMatchStatus: "matched" | "no_candidate" | "ambiguous" | "identity_mismatch";
};
export function matchFullTimeFixture(
  known: KnownFullTimeFixture, matches: FullTimeProviderMatch[], pinnedId: number | null,
  context: { observedNonComplete?: boolean; opponentId?: number } = {},
) {
  const range = fullTimeSearchRange(known.kickoffAt);
  const checks = (match: FullTimeProviderMatch) => {
    const leeds = known.isHome ? match.home_team : match.away_team;
    const opponent = known.isHome ? match.away_team : match.home_team;
    const homeAwayMatched = leeds?.team_id === 193 && typeof leeds.team_name === "string" && teamName(leeds.team_name) === "leedsunited" && opponent?.team_id !== 193;
    const opponentMatched = typeof opponent?.team_name === "string" && teamName(opponent.team_name) === teamName(known.opponent) &&
      Number.isSafeInteger(opponent.team_id) && opponent.team_id! > 0 &&
      (context.opponentId === undefined || opponent.team_id === context.opponentId);
    const competitionMatched = /^(?:England )?Premier League$/i.test(known.competition ?? "") && match.league?.league_id === 15;
    return { homeAwayMatched, opponentMatched, competitionMatched };
  };
  const validRecords = matches.filter((match) => match && Number.isSafeInteger(match.match_id) && match.match_id! > 0);
  const inRange = validRecords.filter((match) => {
    if (typeof match.date_unix !== "number" || !Number.isFinite(match.date_unix)) return false;
    const time = match.date_unix * 1000;
    return time >= Date.parse(range.from) && time < Date.parse(range.to) + 86400_000;
  });
  // A bound ID is never swapped for another record, or discarded because its schedule changes.
  const pool = pinnedId === null ? inRange : validRecords.filter((match) => match.match_id === pinnedId);
  const candidates = pool.filter((match) => {
    const identity = checks(match);
    return identity.homeAwayMatched && identity.opponentMatched && identity.competitionMatched && match.season?.year === 20262027;
  });
  const inspected = candidates.length === 1 ? candidates[0] : pool.length === 1 ? pool[0] : null;
  const timestamp = inspected?.date_unix;
  const date = typeof timestamp === "number" ? new Date(timestamp * 1000) : null;
  const providerKickoffAt = date && Number.isFinite(date.getTime()) ? date.toISOString() : null;
  const diagnostics: FullTimeMatchingDiagnostics = {
    providerCandidateCount: candidates.length, providerKickoffAt,
    kickoffDifferenceHours: providerKickoffAt ? (Date.parse(providerKickoffAt) - Date.parse(known.kickoffAt)) / 3600_000 : null,
    ...(inspected ? checks(inspected) : { opponentMatched: candidates.length > 0, homeAwayMatched: candidates.length > 0, competitionMatched: candidates.length > 0 }),
    fixtureMatchStatus: "no_candidate",
  };
  const reject = (reason: string, status: FullTimeMatchingDiagnostics["fixtureMatchStatus"]) => {
    diagnostics.fixtureMatchStatus = status;
    return { match: null, reason, diagnostics };
  };
  if (pinnedId !== null && !pool.length) return reject("provider_fixture_changed", "identity_mismatch");
  if (!candidates.length) return reject(pool.length ? "provider_identity_mismatch" : "provider_match_not_found", pool.length ? "identity_mismatch" : "no_candidate");
  if (candidates.length !== 1) return reject("ambiguous_provider_match", "ambiguous");
  if (!providerKickoffAt) return reject("invalid_provider_kickoff", "identity_mismatch");
  // A date-drifted complete first seen now is indistinguishable from an old result.
  // Require a non-complete observation of this binding during the official window.
  if (candidates[0].status === "complete" && Math.abs(diagnostics.kickoffDifferenceHours!) > 0.25 && !context.observedNonComplete) {
    return reject("unverified_drifted_complete", "identity_mismatch");
  }
  diagnostics.fixtureMatchStatus = "matched";
  return { match: candidates[0], reason: null, diagnostics };
}
export function validFinalScore(score: unknown): score is number {
  return typeof score === "number" && Number.isSafeInteger(score) && score >= 0 && score <= 100;
}
export function fullTimeResult(match: FullTimeProviderMatch): FullTimeResult | null {
  if (match.status !== "complete" || !Number.isSafeInteger(match.match_id) || match.match_id! <= 0 ||
    !validFinalScore(match.score?.home) || !validFinalScore(match.score?.away)) return null;
  return { providerFixtureId: match.match_id!, fixtureId: `footballdata-io:${match.match_id}`, homeScore: match.score.home, awayScore: match.score.away };
}
export function fullTimePayload(known: KnownFullTimeFixture, result: FullTimeResult, eventId: string): Partial<SafePushPayload> {
  return { title: "FULL TIME", body: `${known.homeTeam} ${result.homeScore} - ${result.awayScore} ${known.awayTeam}`,
    destinationUrl: FULL_TIME_UUID.test(eventId) ? `/api/push/full-time/click?event=${encodeURIComponent(eventId)}` : "/",
    fixtureId: result.fixtureId, tag: `leedswire-full-time-${result.providerFixtureId}` };
}
export const FULL_TIME_TEST_PAYLOAD = {
  title: "LeedsWire Test", body: "Full-Time alerts are connected.", destinationUrl: "/", tag: "leedswire-full-time-test",
};
export function fullTimeTestRequest(value: unknown): string | null {
  if (!value || typeof value !== "object") return null;
  const input = value as Record<string, unknown>;
  return input.test === true && typeof input.subscriptionId === "string" && FULL_TIME_UUID.test(input.subscriptionId) ? input.subscriptionId : null;
}
