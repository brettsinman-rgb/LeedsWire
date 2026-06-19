import { NextResponse } from "next/server";
import { hasAdminSession } from "@/lib/admin/auth";
import { getSourcesDiagnostics } from "@/lib/sourceDiagnostics";

export const dynamic = "force-dynamic";

export async function GET() {
  if (process.env.NODE_ENV === "production" && !(await hasAdminSession())) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json(await getSourcesDiagnostics(), {
    headers: { "cache-control": "no-store" },
  });
}
