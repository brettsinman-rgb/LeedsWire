import "server-only";

const FOOTBALL_DATA_BASE_URL = "https://footballdata.io/api/v1";
const REQUEST_TIMEOUT_MS = 8_000;
const CURRENT_SEASON_YEAR = 20262027;

type ResponseMeta = {
  plan?: string;
  requests_used?: number;
  requests_limit?: number;
};

type ApiResponse<T> = {
  success?: boolean;
  data?: T;
  meta?: ResponseMeta;
};

type League = { league_id?: number; league_name?: string; country?: string };
type Season = { season_id?: number; year?: number };
type Team = { team_id?: number; team_name?: string; country?: string };
type Match = {
  match_id?: number;
  match_date?: string;
  date_unix?: number;
  status?: string;
  league?: {
    league_id?: number;
    name?: string;
    competition_name?: string;
  };
  season?: { season_id?: number; year?: number };
  home_team?: { team_name?: string };
  away_team?: { team_name?: string };
  score?: { home?: number | null; away?: number | null };
};

type SeasonsData = { seasons?: Season[] };
type MatchesData = { matches?: Match[] };

export type FootballDataFixture = {
  fixtureId: number;
  homeTeam: string;
  awayTeam: string;
  competition: string;
  season: string;
  kickoffAt: string;
  status: string;
  homeScore?: number;
  awayScore?: number;
};

export type FootballDataDiagnostic = {
  connected: true;
  team: { id: number; name: string };
  competition: { id: number; name: string; season: string; seasonId: number };
  recentFixture: FootballDataFixture | null;
  upcomingFixture: FootballDataFixture | null;
};

export type FootballDataDiagnosticResult = {
  diagnostic: FootballDataDiagnostic;
  usage: ResponseMeta[];
};

class FootballDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "FootballDataError";
  }
}

async function footballDataRequest<T>(
  path: string,
): Promise<{ data: T; meta: ResponseMeta }> {
  const apiKey = process.env.FOOTBALLDATA_IO_KEY;
  if (!apiKey) {
    throw new FootballDataError("Footballdata.io is not configured");
  }

  const response = await fetch(`${FOOTBALL_DATA_BASE_URL}${path}`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    cache: "no-store",
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  });
  if (!response.ok) {
    throw new FootballDataError(
      `Footballdata.io request failed (${response.status})`,
    );
  }

  const payload = (await response.json()) as ApiResponse<T>;
  if (payload.success !== true || payload.data === undefined) {
    throw new FootballDataError("Footballdata.io rejected the request");
  }

  return { data: payload.data, meta: payload.meta ?? {} };
}

function simplifyMatch(match: Match, includeScore: boolean) {
  const fixtureId = match.match_id;
  const homeTeam = match.home_team?.team_name;
  const awayTeam = match.away_team?.team_name;
  const competition = match.league?.competition_name ?? match.league?.name;
  const kickoffAt = match.match_date;
  const status = match.status;

  if (
    typeof fixtureId !== "number" ||
    !homeTeam ||
    !awayTeam ||
    !competition ||
    !kickoffAt ||
    !status
  ) {
    return null;
  }

  const fixture: FootballDataFixture = {
    fixtureId,
    homeTeam,
    awayTeam,
    competition,
    season: "2026/27",
    kickoffAt,
    status,
  };

  if (includeScore) {
    const homeScore = match.score?.home;
    const awayScore = match.score?.away;
    if (typeof homeScore !== "number" || typeof awayScore !== "number") {
      return null;
    }
    fixture.homeScore = homeScore;
    fixture.awayScore = awayScore;
  }

  return fixture;
}

export async function getFootballDataDiagnostic(): Promise<FootballDataDiagnosticResult> {
  const leaguesRequest = await footballDataRequest<League[]>(
    "/leagues?q=Premier%20League&country=England&limit=10",
  );
  const matchingLeagues = leaguesRequest.data.filter(
    (league) =>
      league.league_name === "Premier League" && league.country === "England",
  );
  if (matchingLeagues.length !== 1) {
    throw new FootballDataError("English Premier League was not uniquely identified");
  }

  const league = matchingLeagues[0];
  if (typeof league.league_id !== "number" || !league.league_name) {
    throw new FootballDataError("Premier League data was incomplete");
  }

  const seasonsRequest = await footballDataRequest<SeasonsData>(
    `/leagues/${league.league_id}/seasons`,
  );
  const matchingSeasons = (seasonsRequest.data.seasons ?? []).filter(
    (season) => season.year === CURRENT_SEASON_YEAR,
  );
  if (matchingSeasons.length !== 1) {
    throw new FootballDataError("2026/27 Premier League season was not identified");
  }

  const season = matchingSeasons[0];
  if (typeof season.season_id !== "number") {
    throw new FootballDataError("2026/27 season data was incomplete");
  }

  const teamsRequest = await footballDataRequest<Team[]>(
    "/teams?q=Leeds%20United&country=England&limit=10",
  );
  const matchingTeams = teamsRequest.data.filter(
    (team) =>
      team.team_name === "Leeds United FC" && team.country === "England",
  );
  if (matchingTeams.length !== 1) {
    throw new FootballDataError(
      "English Leeds United Football Club was not uniquely identified",
    );
  }

  const team = matchingTeams[0];
  if (typeof team.team_id !== "number" || !team.team_name) {
    throw new FootballDataError("Leeds United team data was incomplete");
  }

  const matchesRequest = await footballDataRequest<MatchesData>(
    `/teams/${team.team_id}/matches?league_id=${league.league_id}&season_id=${season.season_id}&limit=100`,
  );
  const matches = (matchesRequest.data.matches ?? [])
    .filter(
      (match) =>
        match.league?.league_id === league.league_id &&
        match.season?.season_id === season.season_id,
    )
    .sort((a, b) => (a.date_unix ?? 0) - (b.date_unix ?? 0));
  const recent = matches.findLast((match) => match.status === "complete");
  const now = Date.now() / 1000;
  const upcoming = matches.find(
    (match) => match.status === "incomplete" && (match.date_unix ?? 0) > now,
  );

  return {
    diagnostic: {
      connected: true,
      team: { id: team.team_id, name: team.team_name },
      competition: {
        id: league.league_id,
        name: league.league_name,
        season: "2026/27",
        seasonId: season.season_id,
      },
      recentFixture: recent ? simplifyMatch(recent, true) : null,
      upcomingFixture: upcoming ? simplifyMatch(upcoming, false) : null,
    },
    usage: [
      leaguesRequest.meta,
      seasonsRequest.meta,
      teamsRequest.meta,
      matchesRequest.meta,
    ],
  };
}
