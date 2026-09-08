import { dailyBriefClickResponse } from "@/lib/dailyBriefClick";
import { getDailyBriefEventStory, recordDailyBriefClick } from "@/lib/pushStore";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  return dailyBriefClickResponse(request, {
    getStory: getDailyBriefEventStory,
    recordClick: async (eventId) => {
      await recordDailyBriefClick(eventId);
      console.info("daily_brief_push_click", { eventId });
    },
  });
}
