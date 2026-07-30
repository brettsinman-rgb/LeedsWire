import { getNextFixture } from "@/lib/fixtures";
import type { NextFixtureResponse } from "@/types/fixture";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const response: NextFixtureResponse = {
    fixture: await getNextFixture(),
  };

  return Response.json(response, {
    headers: {
      "Cache-Control": "private, no-store",
    },
  });
}
