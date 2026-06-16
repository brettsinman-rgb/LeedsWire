import { NextResponse, type NextRequest } from "next/server";

const legacyHost = "leedswire.vercel.app";
const productionHost = "www.leedswire.com";

export function middleware(request: NextRequest) {
  if (request.nextUrl.hostname !== legacyHost) {
    return NextResponse.next();
  }

  const redirectUrl = request.nextUrl.clone();
  redirectUrl.protocol = "https:";
  redirectUrl.hostname = productionHost;

  return NextResponse.redirect(redirectUrl, 308);
}

