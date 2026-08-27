import { NextResponse } from "next/server";
import { runDailyBrief } from "@/lib/dailyBriefService";
import { isCronBearerAuthorized } from "@/lib/cronAuth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  if (!isCronBearerAuthorized(
    request.headers.get("authorization"),
    process.env.CRON_SECRET,
  )) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  try {
    return NextResponse.json(
      { ok: true, report: await runDailyBrief({ dryRun: false }) },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Daily Brief evaluation failed" },
      { status: 503 },
    );
  }
}
