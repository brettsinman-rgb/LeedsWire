import assert from "node:assert/strict";
import {
  LEEDS_FIXTURES_SOURCE_URL,
  parseNextFixture,
} from "../src/lib/fixtureParser";

type FixtureSample = {
  kickoffAt: string;
  homeTeam: string;
  awayTeam: string;
  competition?: string;
  venue?: string;
  homeCrestUrl?: string;
  awayCrestUrl?: string;
  matchCentreUrl?: string;
};

function fixtureRecord(sample: FixtureSample) {
  return {
    fixtureProps: {
      id: `${sample.homeTeam}-${sample.awayTeam}`,
      matchLocation: sample.venue,
      leagueTitle: sample.competition,
      home: {
        clubName: sample.homeTeam,
        clubCrest: sample.homeCrestUrl
          ? ["$", "image", null, { url: sample.homeCrestUrl }]
          : null,
      },
      away: {
        clubName: sample.awayTeam,
        clubCrest: sample.awayCrestUrl
          ? ["$", "image", null, { url: sample.awayCrestUrl }]
          : null,
      },
      ctaLinks: {
        coreCtas: sample.matchCentreUrl
          ? [{ text: "Match Centre", url: sample.matchCentreUrl }]
          : [],
      },
    },
    locale: "en",
    kickOffUtc: sample.kickoffAt,
  };
}

function flightHtml(samples: FixtureSample[]) {
  const payload = samples
    .map((sample, index) => `${index}:${JSON.stringify(fixtureRecord(sample))}`)
    .join("\n");
  const flightCall = JSON.stringify([1, payload]);

  return `<html><body><script>self.__next_f.push(${flightCall})</script></body></html>`;
}

const now = new Date("2026-08-01T12:00:00.000Z");
const fetchedAt = new Date("2026-08-01T12:01:00.000Z");
const leedsCrest =
  "https://images.ctfassets.net/example/leeds-united-crest.png";
const forestCrest =
  "https://images.ctfassets.net/example/nottingham-forest-crest.png";

const nextFixture = parseNextFixture(
  flightHtml([
    {
      kickoffAt: "2026-08-30T13:00:00.000Z",
      homeTeam: "Leeds United",
      awayTeam: "Brentford",
      competition: "Premier League",
    },
    {
      kickoffAt: "2026-07-30T23:30:00.000Z",
      homeTeam: "Sunderland",
      awayTeam: "Leeds United",
      competition: "Friendly",
    },
    {
      kickoffAt: "2026-08-22T14:00:00.000Z",
      homeTeam: "Nottingham Forest",
      awayTeam: "Leeds United",
      competition: "Premier League",
      venue: "The City Ground, Nottingham",
      homeCrestUrl: forestCrest,
      awayCrestUrl: leedsCrest,
      matchCentreUrl:
        "/en/matches/mens/nottingham-forest-v-leeds-united-20260822",
    },
  ]),
  { now, fetchedAt },
);

assert.ok(nextFixture, "finds a valid future Leeds United fixture");
assert.equal(
  nextFixture.kickoffAt,
  "2026-08-22T14:00:00.000Z",
  "sorts future fixtures chronologically",
);
assert.equal(nextFixture.homeTeam, "Nottingham Forest");
assert.equal(nextFixture.awayTeam, "Leeds United");
assert.equal(nextFixture.opponent, "Nottingham Forest");
assert.equal(nextFixture.isHome, false);
assert.equal(nextFixture.competition, "Premier League");
assert.equal(nextFixture.venue, "The City Ground, Nottingham");
assert.equal(nextFixture.leedsCrestUrl, leedsCrest);
assert.equal(nextFixture.opponentCrestUrl, forestCrest);
assert.equal(
  nextFixture.matchCentreUrl,
  "https://www.leedsunited.com/en/matches/mens/nottingham-forest-v-leeds-united-20260822",
);
assert.equal(nextFixture.sourceUrl, LEEDS_FIXTURES_SOURCE_URL);
assert.equal(nextFixture.lastFetchedAt, fetchedAt.toISOString());

assert.equal(
  parseNextFixture(
    flightHtml([
      {
        kickoffAt: "2026-08-22T14:00:00.000Z",
        homeTeam: "Nottingham Forest",
        awayTeam: "Sunderland",
      },
      {
        kickoffAt: "not-a-date",
        homeTeam: "Leeds United",
        awayTeam: "Brentford",
      },
    ]),
    { now },
  ),
  null,
  "rejects non-Leeds and malformed fixture records",
);

const sanitizedFixture = parseNextFixture(
  flightHtml([
    {
      kickoffAt: "2026-08-22T14:00:00.000Z",
      homeTeam: "Leeds United",
      awayTeam: "<b>Nottingham Forest</b>",
      homeCrestUrl: "http://example.com/leeds.png",
      awayCrestUrl: "https://example.com/forest.png",
      matchCentreUrl: "https://example.com/unapproved-match-centre",
    },
  ]),
  { now },
);

assert.ok(sanitizedFixture);
assert.equal(sanitizedFixture.opponent, "Nottingham Forest");
assert.equal(
  sanitizedFixture.leedsCrestUrl,
  null,
  "rejects non-HTTPS crest URLs",
);
assert.equal(
  sanitizedFixture.matchCentreUrl,
  null,
  "rejects Match Centre links outside approved Leeds United domains",
);

assert.equal(
  parseNextFixture("<html><body>Fixture markup changed</body></html>", {
    now,
  }),
  null,
  "fails safely when the Flight fixture data is absent",
);

console.log("fixture parser tests passed");
