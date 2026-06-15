import { NextResponse } from "next/server";
import {
  isCreativeVariant,
  isManagedAdPlacement,
  managedAdPlacements,
  type AdCreative,
} from "@/lib/adCreatives";

type RouteContext = {
  params: Promise<{
    creativeId: string;
    path: string[];
  }>;
};

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    return undefined;
  }

  return { url, serviceKey };
}

function headers(serviceKey: string) {
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
  };
}

function isSafeAssetPath(parts: string[]) {
  return (
    parts.length > 0 &&
    parts.every(
      (part) =>
        part &&
        part !== "." &&
        part !== ".." &&
        !part.startsWith(".") &&
        !part.includes("/") &&
        !part.includes("\\"),
    )
  );
}

function contentTypeForPath(path: string) {
  const extension = path.split(".").pop()?.toLowerCase();

  switch (extension) {
    case "html":
      return "text/html; charset=utf-8";
    case "css":
      return "text/css; charset=utf-8";
    case "js":
      return "application/javascript; charset=utf-8";
    case "json":
      return "application/json; charset=utf-8";
    case "png":
      return "image/png";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "webp":
      return "image/webp";
    case "gif":
      return "image/gif";
    case "svg":
      return "image/svg+xml";
    case "woff":
      return "font/woff";
    case "woff2":
      return "font/woff2";
    case "ttf":
      return "font/ttf";
    case "mp4":
      return "video/mp4";
    case "webm":
      return "video/webm";
    default:
      return "application/octet-stream";
  }
}

function legacySanitizedPath(path: string) {
  return path
    .split("/")
    .filter(Boolean)
    .map(
      (segment) =>
        segment
          .toLowerCase()
          .replace(/[^a-z0-9._-]+/g, "-")
          .replace(/^-+|-+$/g, "")
          .slice(0, 80) || "asset",
    )
    .join("/");
}

function adHtml5Csp() {
  return [
    "default-src 'none'",
    "base-uri 'none'",
    "object-src 'none'",
    "form-action 'none'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data:",
    "media-src 'self' data: blob: https:",
    "connect-src 'self' https:",
  ].join("; ");
}

async function getCreative(creativeId: string) {
  const config = getSupabaseConfig();

  if (!config) {
    return undefined;
  }

  const response = await fetch(
    `${config.url}/rest/v1/ad_creatives?select=id,placement,creative_variant,creative_type&id=eq.${creativeId}&limit=1`,
    {
      headers: headers(config.serviceKey),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    return undefined;
  }

  const [creative] = (await response.json()) as Pick<
    AdCreative,
    "id" | "placement" | "creative_variant" | "creative_type"
  >[];

  return { creative, config };
}

export async function GET(_request: Request, context: RouteContext) {
  const params = await context.params;
  const assetPathParts = params.path.map(decodeURIComponent);

  if (!params.creativeId || !isSafeAssetPath(assetPathParts)) {
    return NextResponse.json({ ok: false, error: "Invalid HTML5 asset path." }, { status: 400 });
  }

  const result = await getCreative(params.creativeId);
  const creative = result?.creative;

  if (
    !result ||
    !creative ||
    creative.creative_type !== "html5" ||
    !isManagedAdPlacement(creative.placement) ||
    !isCreativeVariant(creative.creative_variant)
  ) {
    return NextResponse.json({ ok: false, error: "HTML5 creative not found." }, { status: 404 });
  }

  const slot = managedAdPlacements.find(
    (placement) =>
      placement.placement === creative.placement &&
      placement.variant === creative.creative_variant,
  );

  if (!slot) {
    return NextResponse.json({ ok: false, error: "HTML5 creative slot not found." }, { status: 404 });
  }

  const relativePath = assetPathParts.join("/");
  const objectPath = `html5/${slot.folder}/${creative.id}/${relativePath}`;
  let storageResponse = await fetch(
    `${result.config.url}/storage/v1/object/ads/${objectPath}`,
    {
      headers: headers(result.config.serviceKey),
      cache: "no-store",
    },
  );

  if (!storageResponse.ok) {
    const fallbackPath = legacySanitizedPath(relativePath);

    if (fallbackPath && fallbackPath !== relativePath) {
      storageResponse = await fetch(
        `${result.config.url}/storage/v1/object/ads/html5/${slot.folder}/${creative.id}/${fallbackPath}`,
        {
          headers: headers(result.config.serviceKey),
          cache: "no-store",
        },
      );
    }
  }

  if (!storageResponse.ok || !storageResponse.body) {
    return NextResponse.json({ ok: false, error: "HTML5 asset not found." }, { status: 404 });
  }

  return new Response(storageResponse.body, {
    status: 200,
    headers: {
      "content-type": contentTypeForPath(relativePath),
      "cache-control": "public, max-age=300, stale-while-revalidate=3600",
      "content-security-policy": adHtml5Csp(),
      "x-content-type-options": "nosniff",
    },
  });
}
