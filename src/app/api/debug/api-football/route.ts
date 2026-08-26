import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin/auth";
import { getApiFootballDiagnostic } from "@/lib/apiFootball";

export const dynamic = "force-dynamic";

// The live free-plan check confirmed that 2024 is the newest accessible season.
const DIAGNOSTIC_SEASON = 2024;

export async function GET() {
  if (process.env.NODE_ENV === "production" && !(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { diagnostic } = await getApiFootballDiagnostic(DIAGNOSTIC_SEASON);
    return NextResponse.json(diagnostic, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "API-Football request failed";
    return NextResponse.json(
      { connected: false, error: message },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
