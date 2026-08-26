import "server-only";

export type MatchStatus = {
  fixtureId: string;
  status: string;
  homeTeam: string;
  awayTeam: string;
  homeScore: number | null;
  awayScore: number | null;
};

export interface MatchStatusProvider {
  getMatchStatus(fixtureId: string): Promise<MatchStatus | null>;
}

// Phase 1 defines the provider boundary only. Automatic status detection is disabled.
