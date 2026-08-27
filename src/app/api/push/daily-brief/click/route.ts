import { NextResponse } from "next/server";
import {
  getDailyBriefEventDestination,
  recordDailyBriefClick,
} from "@/lib/pushStore";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const eventId = new URL(request.url).searchParams.get("event") ?? "";
  if (!UUID.test(eventId)) return NextResponse.redirect(new URL("/", request.url));
  try {
    const destination = await getDailyBriefEventDestination(eventId);
    if (!destination?.startsWith("https://")) {
      return NextResponse.redirect(new URL("/", request.url));
    }
    await recordDailyBriefClick(eventId);
    return NextResponse.redirect(destination, { status: 307 });
  } catch {
    return NextResponse.redirect(new URL("/", request.url));
  }
}
