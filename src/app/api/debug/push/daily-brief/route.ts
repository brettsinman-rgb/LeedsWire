import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin/auth";
import { runDailyBrief } from "@/lib/dailyBriefService";
import { getDailyBriefStatus } from "@/lib/pushStore";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }
  let input: unknown;
  try {
    input = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }
  if (!input || typeof input !== "object" || (input as { dryRun?: unknown }).dryRun !== true) {
    return NextResponse.json(
      { ok: false, error: "This diagnostic endpoint only permits dryRun: true" },
      { status: 400 },
    );
  }
  try {
    return NextResponse.json(
      {
        ok: true,
        report: await runDailyBrief({ dryRun: true }),
        observability: await getDailyBriefStatus(),
      },
      { headers: { "cache-control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, error: "Daily Brief diagnostic failed" },
      { status: 503 },
    );
  }
}
