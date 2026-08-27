import { NextResponse } from "next/server";
import { runDailyBrief } from "@/lib/dailyBriefService";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
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
