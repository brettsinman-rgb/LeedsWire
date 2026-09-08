import { fullTimeClickResponse } from "@/lib/fullTimeHttp";
import { getFullTimeClickEvent, recordFullTimeClick } from "@/lib/fullTimeStore";

export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  return fullTimeClickResponse(request, async (id) => {
    const event = await getFullTimeClickEvent(id);
    if (!event) return;
    await recordFullTimeClick(id);
    console.info("full_time_push_click", { fixtureId: event.fixture_id,
      homeTeam: event.home_team, awayTeam: event.away_team, homeScore: event.home_score, awayScore: event.away_score });
  });
}
