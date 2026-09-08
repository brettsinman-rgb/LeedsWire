import { hasAdminSession } from "@/lib/admin/auth";
import { fullTimeDiagnosticResponse } from "@/lib/fullTimeHttp";
import { evaluateFullTime } from "@/lib/fullTimeService";
import { getFullTimeState } from "@/lib/fullTimeStore";

export const dynamic = "force-dynamic";
export const maxDuration = 60;
export async function POST(request: Request) {
  return fullTimeDiagnosticResponse(request, {
    authorized: hasAdminSession, evaluate: () => evaluateFullTime({ dryRun: true }), status: getFullTimeState,
  });
}
