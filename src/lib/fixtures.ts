import "server-only";

import { unstable_cache } from "next/cache";
import { LEEDS_FIXTURES_SOURCE_URL, parseFixtures } from "@/lib/fixtureParser";
import type { NextFixture } from "@/types/fixture";

const FIXTURE_REVALIDATE_SECONDS = 6 * 60 * 60;
const FETCH_TIMEOUT_MS = 8_000;
const DIAGNOSTIC_THROTTLE_MS = 6 * 60 * 60 * 1000;

let lastDiagnosticAt = 0;

function logFixtureDiagnostic(message: string, error?: unknown) {
  const now = Date.now();

  if (now - lastDiagnosticAt < DIAGNOSTIC_THROTTLE_MS) {
    return;
  }

  lastDiagnosticAt = now;
  console.warn(`[LeedsWire fixtures] ${message}`, {
    error: error instanceof Error ? error.message : undefined,
  });
}

async function fetchFixtureList(): Promise<NextFixture[]> {
  try {
    const response = await fetch(LEEDS_FIXTURES_SOURCE_URL, {
      cache: "no-store",
      headers: {
        accept: "text/html",
        "user-agent":
          "LeedsWire Fixture Service/1.0 (+https://leedswire.com)",
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });

    if (!response.ok) {
      logFixtureDiagnostic(
        `Official fixtures request returned ${response.status}`,
      );
      return [];
    }

    const fetchedAt = new Date();
    const fixtures = parseFixtures(await response.text(), fetchedAt);

    if (fixtures.length === 0) {
      logFixtureDiagnostic("No valid men's fixtures found");
    }

    return fixtures;
  } catch (error) {
    logFixtureDiagnostic("Official fixtures request failed", error);
    return [];
  }
}

const getCachedFixtureList = unstable_cache(
  fetchFixtureList,
  ["leeds-men-fixtures"],
  {
    revalidate: FIXTURE_REVALIDATE_SECONDS,
    tags: ["leeds-next-fixture"],
  },
);

export async function getNextFixture(): Promise<NextFixture | null> {
  const now = Date.now();
  const fixtures = (await getCachedFixtureList())
    .filter((fixture) => Date.parse(fixture.kickoffAt) > now)
    .sort(
      (first, second) =>
        Date.parse(first.kickoffAt) - Date.parse(second.kickoffAt),
    );

  if (fixtures.length === 0) {
    logFixtureDiagnostic("No valid future men's fixture found");
  }

  return fixtures[0] ?? null;
}
