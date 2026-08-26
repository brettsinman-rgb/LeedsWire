import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin/auth";
import { getFootballDataDiagnostic } from "@/lib/footballDataIo";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production" && !(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { diagnostic } = await getFootballDataDiagnostic();
    return NextResponse.json(diagnostic, {
      headers: { "cache-control": "no-store" },
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "football-data.org request failed";
    return NextResponse.json(
      { connected: false, error: message },
      { status: 502, headers: { "cache-control": "no-store" } },
    );
  }
}
