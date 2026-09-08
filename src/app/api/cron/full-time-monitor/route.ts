import { fullTimeCronResponse } from "@/lib/fullTimeHttp";
import { evaluateFullTime } from "@/lib/fullTimeService";

export const dynamic = "force-dynamic";
export const maxDuration = 300;
export async function GET(request: Request) {
  return fullTimeCronResponse(request, process.env.CRON_SECRET, () => evaluateFullTime({ dryRun: false }));
}
