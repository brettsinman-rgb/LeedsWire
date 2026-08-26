import "server-only";

const API_FOOTBALL_BASE_URL = "https://v3.football.api-sports.io";
const REQUEST_TIMEOUT_MS = 8_000;

type ApiFootballEnvelope<T> = {
  errors?: unknown;
  response?: T[];
};

type TeamResult = {
  team?: {
    id?: number;
    name?: string;
    country?: string;
    code?: string | null;
  };
};

type FixtureResult = {
  fixture?: {
    id?: number;
    date?: string;
    status?: {
      long?: string;
      short?: string;
    };
  };
  league?: {
    name?: string;
    country?: string;
    season?: number;
  };
  teams?: {
    home?: { name?: string };
    away?: { name?: string };
  };
  goals?: {
    home?: number | null;
    away?: number | null;
  };
};

export type SimplifiedFixture = {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  kickoffAt: string;
  statusLong: string;
  statusShort: string;
  homeScore?: number;
  awayScore?: number;
};

export type ApiFootballDiagnostic = {
  connected: true;
  team: { id: number; name: string };
  recentFixture: SimplifiedFixture | null;
  upcomingFixture: SimplifiedFixture | null;
};

export type ApiFootballRateLimit = {
  limit: string | null;
  remaining: string | null;
};

export type ApiFootballDiagnosticResult = {
  diagnostic: ApiFootballDiagnostic;
  rateLimits: ApiFootballRateLimit[];
  season: number;
};

class ApiFootballError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ApiFootballError";
  }
}

function hasApiErrors(errors: unknown) {
  if (Array.isArray(errors)) {
    return errors.length > 0;
  }

  return Boolean(errors && typeof errors === "object" && Object.keys(errors).length);
}

async function apiFootballRequest<T>(
  path: string,
): Promise<{ data: T[]; rateLimit: ApiFootballRateLimit }> {
  const apiKey = process.env.API_FOOTBALL_KEY;
  if (!apiKey) {
    throw new ApiFootballError("API-Football is not configured");
  }

  const response = await fetch(`${API_FOOTBALL_BASE_URL}${path}`, {
    headers: { "x-apisports-key": apiKey },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });

  const rateLimit = {
    limit: response.headers.get("x-ratelimit-requests-limit"),
    remaining: response.headers.get("x-ratelimit-requests-remaining"),
  };

  if (!response.ok) {
    throw new ApiFootballError(`API-Football request failed (${response.status})`);
  }

  const payload = (await response.json()) as ApiFootballEnvelope<T>;
  if (hasApiErrors(payload.errors)) {
    throw new ApiFootballError("API-Football rejected the request");
  }

  return { data: payload.response ?? [], rateLimit };
}

function simplifyFixture(fixture: FixtureResult, includeScores: boolean) {
  const fixtureId = fixture.fixture?.id;
  const homeTeam = fixture.teams?.home?.name;
  const awayTeam = fixture.teams?.away?.name;
  const competition = fixture.league?.name;
  const kickoffAt = fixture.fixture?.date;
  const statusLong = fixture.fixture?.status?.long;
  const statusShort = fixture.fixture?.status?.short;

  if (
    typeof fixtureId !== "number" ||
    !homeTeam ||
    !awayTeam ||
    !competition ||
    !kickoffAt ||
    !statusLong ||
    !statusShort
  ) {
    return null;
  }

  const simplified: SimplifiedFixture = {
    fixtureId,
    homeTeam,
    awayTeam,
    competition,
    kickoffAt,
    statusLong,
    statusShort,
  };

  if (includeScores) {
    const homeScore = fixture.goals?.home;
    const awayScore = fixture.goals?.away;
    if (typeof homeScore !== "number" || typeof awayScore !== "number") {
      return null;
    }
    simplified.homeScore = homeScore;
    simplified.awayScore = awayScore;
  }

  return simplified;
}

export async function getApiFootballDiagnostic(
  season: number,
): Promise<ApiFootballDiagnosticResult> {
  const teamLookup = await apiFootballRequest<TeamResult>("/teams?search=Leeds");
  const matchingTeams = teamLookup.data.filter(
    ({ team }) =>
      team?.name === "Leeds" && team.country === "England" && team.code === "LEE",
  );

  if (matchingTeams.length !== 1) {
    throw new ApiFootballError(
      "English Leeds United Football Club was not uniquely identified",
    );
  }

  const team = matchingTeams[0].team;
  if (typeof team?.id !== "number" || !team.name) {
    throw new ApiFootballError("Leeds United team data was incomplete");
  }

  const fixturesLookup = await apiFootballRequest<FixtureResult>(
    `/fixtures?team=${team.id}&season=${season}`,
  );
  const fixtures = fixturesLookup.data
    .filter((fixture) => fixture.league?.country === "England")
    .sort((a, b) =>
      (a.fixture?.date ?? "").localeCompare(b.fixture?.date ?? ""),
    );
  const finishedStatuses = new Set(["FT", "AET", "PEN"]);
  const upcomingStatuses = new Set(["TBD", "NS"]);
  const recent = fixtures.findLast((fixture) =>
    finishedStatuses.has(fixture.fixture?.status?.short ?? ""),
  );
  const upcoming = fixtures.find((fixture) =>
    upcomingStatuses.has(fixture.fixture?.status?.short ?? ""),
  );

  return {
    diagnostic: {
      connected: true,
      team: { id: team.id, name: "Leeds United" },
      recentFixture: recent ? simplifyFixture(recent, true) : null,
      upcomingFixture: upcoming ? simplifyFixture(upcoming, false) : null,
    },
    rateLimits: [teamLookup.rateLimit, fixturesLookup.rateLimit],
    season,
  };
}
