import type { NextFixture } from "@/types/fixture";

export const LEEDS_FIXTURES_SOURCE_URL =
  "https://www.leedsunited.com/en/matches/mens/fixtures";

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const cleaned = value
    .replace(/<[^>]*>/g, "")
    .replace(/[\u0000-\u001f\u007f]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return cleaned || null;
}

function isLeedsUnited(value: string) {
  return value.toLowerCase().replace(/[^a-z]/g, "") === "leedsunited";
}

function safeHttpsUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value);
    return url.protocol === "https:" ? url.toString() : null;
  } catch {
    return null;
  }
}

function safeMatchCentreUrl(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  try {
    const url = new URL(value, LEEDS_FIXTURES_SOURCE_URL);
    const approvedHost =
      url.hostname === "leedsunited.com" ||
      url.hostname.endsWith(".leedsunited.com");

    return url.protocol === "https:" && approvedHost ? url.toString() : null;
  } catch {
    return null;
  }
}

function findUrl(value: unknown): string | null {
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = findUrl(item);
      if (found) {
        return found;
      }
    }

    return null;
  }

  if (!isRecord(value)) {
    return null;
  }

  const directUrl = safeHttpsUrl(value.url);
  if (directUrl) {
    return directUrl;
  }

  for (const item of Object.values(value)) {
    const found = findUrl(item);
    if (found) {
      return found;
    }
  }

  return null;
}

function findMatchCentreUrl(value: unknown): string | null {
  if (!isRecord(value)) {
    return null;
  }

  const ctaLinks = isRecord(value.ctaLinks) ? value.ctaLinks : null;
  const coreCtas = ctaLinks?.coreCtas;

  if (!Array.isArray(coreCtas)) {
    return null;
  }

  const matchCentre = coreCtas.find(
    (cta) =>
      isRecord(cta) &&
      cleanText(cta.text)?.toLowerCase() === "match centre",
  );

  return isRecord(matchCentre) ? safeMatchCentreUrl(matchCentre.url) : null;
}

function extractBalancedObject(
  value: string,
  startIndex: number,
): { json: string; endIndex: number } | null {
  if (value[startIndex] !== "{") {
    return null;
  }

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let index = startIndex; index < value.length; index += 1) {
    const character = value[index];

    if (inString) {
      if (escaped) {
        escaped = false;
      } else if (character === "\\") {
        escaped = true;
      } else if (character === '"') {
        inString = false;
      }
      continue;
    }

    if (character === '"') {
      inString = true;
    } else if (character === "{") {
      depth += 1;
    } else if (character === "}") {
      depth -= 1;

      if (depth === 0) {
        return {
          json: value.slice(startIndex, index + 1),
          endIndex: index + 1,
        };
      }
    }
  }

  return null;
}

function extractFlightPayloads(html: string) {
  const payloads: string[] = [];
  const pattern =
    /<script[^>]*>\s*self\.__next_f\.push\(([\s\S]*?)\)\s*<\/script>/g;

  for (const match of html.matchAll(pattern)) {
    try {
      const parsed = JSON.parse(match[1]) as unknown;

      if (
        Array.isArray(parsed) &&
        parsed.length > 1 &&
        typeof parsed[1] === "string"
      ) {
        payloads.push(parsed[1]);
      }
    } catch {
      // Ignore unrelated or malformed Flight chunks.
    }
  }

  return payloads;
}

function parsePayloadFixtures(payload: string, lastFetchedAt: string) {
  const fixtures: NextFixture[] = [];
  const marker = '"fixtureProps":';
  let markerIndex = payload.indexOf(marker);

  while (markerIndex !== -1) {
    const objectStart = payload.indexOf("{", markerIndex + marker.length);
    const extracted =
      objectStart === -1
        ? null
        : extractBalancedObject(payload, objectStart);

    if (!extracted) {
      markerIndex = payload.indexOf(marker, markerIndex + marker.length);
      continue;
    }

    const nextMarkerIndex = payload.indexOf(marker, extracted.endIndex);
    const fixtureTail = payload.slice(
      extracted.endIndex,
      nextMarkerIndex === -1 ? payload.length : nextMarkerIndex,
    );
    const kickoffMatch = fixtureTail.match(/"kickOffUtc":"([^"]+)"/);

    try {
      const fixtureProps = JSON.parse(extracted.json) as unknown;
      const kickoffAt = kickoffMatch?.[1] ?? "";
      const kickoffTime = Date.parse(kickoffAt);

      if (!isRecord(fixtureProps) || !Number.isFinite(kickoffTime)) {
        markerIndex = nextMarkerIndex;
        continue;
      }

      const home = isRecord(fixtureProps.home) ? fixtureProps.home : null;
      const away = isRecord(fixtureProps.away) ? fixtureProps.away : null;
      const homeTeam = cleanText(home?.clubName);
      const awayTeam = cleanText(away?.clubName);

      if (
        !home ||
        !away ||
        !homeTeam ||
        !awayTeam ||
        (!isLeedsUnited(homeTeam) && !isLeedsUnited(awayTeam))
      ) {
        markerIndex = nextMarkerIndex;
        continue;
      }

      const isHome = isLeedsUnited(homeTeam);
      const leeds = isHome ? home : away;
      const opponent = isHome ? away : home;
      const opponentName = isHome ? awayTeam : homeTeam;

      fixtures.push({
        homeTeam,
        awayTeam,
        opponent: opponentName,
        competition: cleanText(fixtureProps.leagueTitle),
        kickoffAt: new Date(kickoffTime).toISOString(),
        venue: cleanText(fixtureProps.matchLocation),
        isHome,
        leedsCrestUrl: findUrl(leeds.clubCrest),
        opponentCrestUrl: findUrl(opponent.clubCrest),
        matchCentreUrl: findMatchCentreUrl(fixtureProps),
        sourceUrl: LEEDS_FIXTURES_SOURCE_URL,
        lastFetchedAt,
      });
    } catch {
      // Reject this record without preventing other fixtures from parsing.
    }

    markerIndex = nextMarkerIndex;
  }

  return fixtures;
}

export function parseNextFixture(
  html: string,
  options: { now?: Date; fetchedAt?: Date } = {},
): NextFixture | null {
  const now = options.now?.getTime() ?? Date.now();
  const fixtures = parseFixtures(html, options.fetchedAt).filter(
    (fixture) => Date.parse(fixture.kickoffAt) > now,
  );

  fixtures.sort(
    (first, second) =>
      Date.parse(first.kickoffAt) - Date.parse(second.kickoffAt),
  );

  return fixtures[0] ?? null;
}

export function parseFixtures(
  html: string,
  fetchedAt: Date = new Date(),
): NextFixture[] {
  const lastFetchedAt = fetchedAt.toISOString();

  return extractFlightPayloads(html).flatMap((payload) =>
    parsePayloadFixtures(payload, lastFetchedAt),
  );
}
