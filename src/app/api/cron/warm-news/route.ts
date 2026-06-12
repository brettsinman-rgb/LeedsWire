import { NextResponse } from "next/server";
import { handleWarmNewsRequest } from "@/lib/cronWarmNews";

export async function GET(request: Request) {
  const result = await handleWarmNewsRequest(request.url);

  return NextResponse.json(result.body, { status: result.status });
}
