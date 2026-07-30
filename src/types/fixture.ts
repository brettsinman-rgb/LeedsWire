export type NextFixture = {
  homeTeam: string;
  awayTeam: string;
  opponent: string;
  competition: string | null;
  kickoffAt: string;
  venue: string | null;
  isHome: boolean;
  leedsCrestUrl: string | null;
  opponentCrestUrl: string | null;
  matchCentreUrl: string | null;
  sourceUrl: string;
  lastFetchedAt: string;
};

export type NextFixtureResponse = {
  fixture: NextFixture | null;
};
