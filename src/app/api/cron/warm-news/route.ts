import { NextResponse } from "next/server";
import { handleWarmNewsRequest } from "@/lib/cronWarmNews";

export async function GET(request: Request) {
  const result = await handleWarmNewsRequest(
    request.url,
    fetch,
    request.headers.get("authorization"),
  );

  return NextResponse.json(result.body, { status: result.status });
}
