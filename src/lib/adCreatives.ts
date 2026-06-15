import type { AdCampaign, AdPlacementId } from "../config/ads.config";
import { unzipSync } from "fflate";
import { html5CreativeRouteSrc } from "./adHtml5";

export type ManagedAdPlacement =
  | "homepage-top"
  | "homepage-mid"
  | "homepage-bottom"
  | "sideskin-left"
  | "sideskin-right"
  | "top-sponsor-background"
  | "popup";

export type CreativeVariant = "desktop" | "mobile" | "left" | "right" | "default";
export type UploadedCreativeType = "image" | "html5";

export type AdCreative = {
  id: string;
  placement: ManagedAdPlacement;
  creative_variant: CreativeVariant;
  name: string;
  file_url: string;
  creative_type?: UploadedCreativeType;
  entry_url?: string | null;
  original_filename?: string | null;
  click_url?: string | null;
  is_active: boolean;
  uploaded_at: string;
  uploaded_by?: string | null;
  start_date?: string | null;
  end_date?: string | null;
  width?: number | null;
  height?: number | null;
};

export type CreativeAction =
  | "upload"
  | "upload_and_activate"
  | "delete"
  | "activate"
  | "deactivate";

export type AdCreativeErrorCode =
  | "MISSING_SUPABASE_ENV"
  | "MISSING_CREATIVE_TABLE"
  | "INVALID_CREATIVE"
  | "INVALID_CLICK_URL"
  | "STORAGE_UPLOAD_FAILED"
  | "CREATIVE_READ_FAILED"
  | "CREATIVE_WRITE_FAILED";

export class AdCreativeError extends Error {
  code: AdCreativeErrorCode;
  status?: number;
  details?: string;

  constructor({
    code,
    message,
    status,
    details,
  }: {
    code: AdCreativeErrorCode;
    message: string;
    status?: number;
    details?: string;
  }) {
    super(message);
    this.name = "AdCreativeError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

export const managedAdPlacements = [
  {
    placement: "homepage-top",
    variant: "desktop",
    label: "Homepage Top Billboard Desktop",
    groupLabel: "Homepage Top Billboard",
    sizeLabel: "970x250",
    width: 970,
    height: 250,
    folder: "homepage-top",
  },
  {
    placement: "homepage-top",
    variant: "mobile",
    label: "Homepage Top Billboard Mobile",
    groupLabel: "Homepage Top Billboard",
    sizeLabel: "300x100",
    width: 300,
    height: 100,
    folder: "homepage-top/mobile",
  },
  {
    placement: "homepage-mid",
    variant: "desktop",
    label: "Homepage Mid Billboard Desktop",
    groupLabel: "Homepage Mid Billboard",
    sizeLabel: "970x250",
    width: 970,
    height: 250,
    folder: "homepage-mid",
  },
  {
    placement: "homepage-mid",
    variant: "mobile",
    label: "Homepage Mid Billboard Mobile",
    groupLabel: "Homepage Mid Billboard",
    sizeLabel: "300x600",
    width: 300,
    height: 600,
    folder: "homepage-mid/mobile",
  },
  {
    placement: "homepage-bottom",
    variant: "desktop",
    label: "Homepage Bottom Billboard Desktop",
    groupLabel: "Homepage Bottom Billboard",
    sizeLabel: "970x250",
    width: 970,
    height: 250,
    folder: "homepage-bottom",
  },
  {
    placement: "homepage-bottom",
    variant: "mobile",
    label: "Homepage Bottom Billboard Mobile",
    groupLabel: "Homepage Bottom Billboard",
    sizeLabel: "300x250",
    width: 300,
    height: 250,
    folder: "homepage-bottom/mobile",
  },
  {
    placement: "sideskin-left",
    variant: "left",
    label: "Left Side Skin",
    groupLabel: "Side Skins",
    sizeLabel: "160x1080",
    width: 160,
    height: 1080,
    folder: "side-skin-left",
  },
  {
    placement: "sideskin-right",
    variant: "right",
    label: "Right Side Skin",
    groupLabel: "Side Skins",
    sizeLabel: "160x1080",
    width: 160,
    height: 1080,
    folder: "side-skin-right",
  },
  {
    placement: "top-sponsor-background",
    variant: "default",
    label: "Sponsor Background",
    groupLabel: "Sponsor Background",
    sizeLabel: "1920x1080",
    width: 1920,
    height: 1080,
    folder: "sponsor-background",
  },
  {
    placement: "popup",
    variant: "default",
    label: "Popup",
    groupLabel: "Popup",
    sizeLabel: "1200x1200",
    width: 1200,
    height: 1200,
    folder: "popup",
  },
] as const satisfies Array<{
  placement: ManagedAdPlacement;
  variant: CreativeVariant;
  label: string;
  groupLabel: string;
  sizeLabel: string;
  width: number;
  height: number;
  folder: string;
}>;

const managedPlacementSet = new Set<string>(
  managedAdPlacements.map((item) => item.placement),
);
const creativeSlotKey = (placement: ManagedAdPlacement, variant: CreativeVariant) =>
  `${placement}:${variant}`;
const creativeSlotMap = new Map(
  managedAdPlacements.map((item) => [
    creativeSlotKey(item.placement, item.variant),
    item,
  ]),
);
const CACHE_MS = 60_000;
const MAX_FILE_SIZE = 10 * 1024 * 1024;
const HTML5_STORAGE_PREFIX = "html5";
const allowedMimeTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
]);
const allowedExtensions = new Set(["jpg", "jpeg", "png", "webp", "gif"]);
const allowedHtml5Extensions = new Set([
  "html",
  "css",
  "js",
  "json",
  "png",
  "jpg",
  "jpeg",
  "webp",
  "gif",
  "svg",
  "woff",
  "woff2",
  "ttf",
  "mp4",
  "webm",
]);
const dangerousHtml5Extensions = new Set([
  "php",
  "exe",
  "sh",
  "bat",
  "cmd",
  "py",
  "rb",
  "jar",
  "pl",
  "cgi",
  "asp",
  "aspx",
  "jsp",
]);

let cachedCreatives:
  | {
      rows: AdCreative[];
      expiresAt: number;
    }
  | undefined;

function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    const missing = [
      !url ? "SUPABASE_URL" : null,
      !serviceKey ? "SUPABASE_SERVICE_ROLE_KEY" : null,
    ].filter(Boolean);

    throw new AdCreativeError({
      code: "MISSING_SUPABASE_ENV",
      message: `Missing Supabase environment variable${missing.length === 1 ? "" : "s"}: ${missing.join(", ")}.`,
      details:
        "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and Vercel.",
    });
  }

  return { url, serviceKey };
}

function headers(serviceKey: string) {
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
  };
}

function isMissingTableResponse(status: number, body: string) {
  return (
    status === 404 ||
    body.includes("PGRST205") ||
    body.includes("42P01") ||
    body.toLowerCase().includes("relation") ||
    body.toLowerCase().includes("does not exist") ||
    body.toLowerCase().includes("schema cache")
  );
}

async function createCreativeError({
  response,
  code,
  action,
}: {
  response: Response;
  code: Exclude<AdCreativeErrorCode, "MISSING_SUPABASE_ENV" | "INVALID_CREATIVE" | "INVALID_CLICK_URL">;
  action: string;
}) {
  const body = await response.text().catch(() => "");

  if (isMissingTableResponse(response.status, body)) {
    return new AdCreativeError({
      code: "MISSING_CREATIVE_TABLE",
      message:
        "Missing Supabase ad creative tables. Run supabase/migrations/002_ad_creatives.sql.",
      status: response.status,
      details: body.slice(0, 500),
    });
  }

  return new AdCreativeError({
    code,
    message: `Supabase creative ${action} failed with status ${response.status}.`,
    status: response.status,
    details: body.slice(0, 500),
  });
}

function devLog(message: string, error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[LeedsWire creatives] ${message}`, error);
  }
}

export function clearAdCreativesCache() {
  cachedCreatives = undefined;
}

export function isManagedAdPlacement(value: string): value is ManagedAdPlacement {
  return managedPlacementSet.has(value);
}

export function isCreativeVariant(value: string): value is CreativeVariant {
  return (
    value === "desktop" ||
    value === "mobile" ||
    value === "left" ||
    value === "right" ||
    value === "default"
  );
}

export function isUploadedCreativeType(value: string): value is UploadedCreativeType {
  return value === "image" || value === "html5";
}

function getCreativeSlot(placement: ManagedAdPlacement, variant: CreativeVariant) {
  return creativeSlotMap.get(creativeSlotKey(placement, variant));
}

export function isValidClickUrl(value?: string | null) {
  if (!value) {
    return true;
  }

  try {
    const url = new URL(value);

    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}

function validateImageUploadFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (!extension || !allowedExtensions.has(extension)) {
    throw new AdCreativeError({
      code: "INVALID_CREATIVE",
      message: "Creative must be a JPG, PNG, WebP or GIF file.",
    });
  }

  if (!allowedMimeTypes.has(file.type)) {
    throw new AdCreativeError({
      code: "INVALID_CREATIVE",
      message: "Creative file type is not supported.",
    });
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new AdCreativeError({
      code: "INVALID_CREATIVE",
      message: "Creative must be 10MB or smaller.",
    });
  }
}

function validateZipUploadFile(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();

  if (extension !== "zip") {
    throw new AdCreativeError({
      code: "INVALID_CREATIVE",
      message: "HTML5 creative must be a ZIP file.",
    });
  }

  if (
    file.type &&
    !["application/zip", "application/x-zip-compressed", "multipart/x-zip"].includes(
      file.type,
    )
  ) {
    throw new AdCreativeError({
      code: "INVALID_CREATIVE",
      message: "HTML5 creative ZIP file type is not supported.",
    });
  }

  if (file.size > MAX_FILE_SIZE) {
    throw new AdCreativeError({
      code: "INVALID_CREATIVE",
      message: "HTML5 creative ZIP must be 10MB or smaller.",
    });
  }
}

function normalizeClickUrl(value?: string | null) {
  const trimmed = value?.trim();

  if (!trimmed) {
    return null;
  }

  if (!isValidClickUrl(trimmed)) {
    throw new AdCreativeError({
      code: "INVALID_CLICK_URL",
      message: "Click URL must start with http:// or https://.",
    });
  }

  return trimmed;
}

function sanitizeFileName(value: string) {
  const extension = value.split(".").pop()?.toLowerCase() ?? "jpg";
  const base = value
    .replace(/\.[^.]+$/, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);

  return `${base || "creative"}-${Date.now()}.${extension}`;
}

function sanitizePathSegment(value: string) {
  return value
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80) || "asset";
}

function sanitizeRelativePath(value: string) {
  return value
    .split("/")
    .filter(Boolean)
    .map((segment) => sanitizePathSegment(segment))
    .join("/");
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

function isUnsafeZipPath(path: string) {
  return (
    path.startsWith("/") ||
    path.startsWith("\\") ||
    path.includes("\\") ||
    path.split("/").some((segment) => segment === ".." || segment.startsWith("."))
  );
}

function isMacMetadataZipPath(path: string) {
  if (
    path.startsWith("/") ||
    path.startsWith("\\") ||
    path.includes("\\") ||
    path.split("/").some((segment) => segment === "..")
  ) {
    return false;
  }

  const parts = path.split("/").filter(Boolean);

  return parts.some(
    (part) =>
      part === "__MACOSX" ||
      part === ".DS_Store" ||
      (part.startsWith("._") && part.length > 2),
  );
}

function normalizeHtml5ZipEntries(fileMap: Record<string, Uint8Array>) {
  const entries = Object.entries(fileMap).filter(
    ([path]) => !path.endsWith("/") && !isMacMetadataZipPath(path),
  );

  if (entries.length === 0) {
    throw new AdCreativeError({
      code: "INVALID_CREATIVE",
      message: "HTML5 ZIP is empty.",
    });
  }

  for (const [path] of entries) {
    if (isUnsafeZipPath(path)) {
      throw new AdCreativeError({
        code: "INVALID_CREATIVE",
        message: `Unsafe ZIP path: ${path}`,
      });
    }

    const extension = path.split(".").pop()?.toLowerCase();

    if (!extension) {
      throw new AdCreativeError({
        code: "INVALID_CREATIVE",
        message: "HTML5 ZIP contains a file without an extension.",
      });
    }

    if (
      dangerousHtml5Extensions.has(extension) ||
      !allowedHtml5Extensions.has(extension)
    ) {
      throw new AdCreativeError({
        code: "INVALID_CREATIVE",
        message: `HTML5 ZIP contains an unsupported file type: .${extension}.`,
      });
    }
  }

  const paths = entries.map(([path]) => path);
  const rootIndex = paths.find((path) => path.toLowerCase() === "index.html");
  const firstLevelIndex = paths.find((path) => {
    const parts = path.split("/");

    return parts.length === 2 && parts[1].toLowerCase() === "index.html";
  });
  const entryPath = rootIndex ?? firstLevelIndex;

  if (!entryPath) {
    throw new AdCreativeError({
      code: "INVALID_CREATIVE",
      message: "HTML5 ZIP must include index.html at root or inside a first-level folder.",
    });
  }

  const prefix =
    !rootIndex && firstLevelIndex ? `${firstLevelIndex.split("/")[0]}/` : "";
  const normalizedEntries = entries
    .filter(([path]) => !prefix || path.startsWith(prefix))
    .map(([path, data]) => ({
      relativePath: sanitizeRelativePath(prefix ? path.slice(prefix.length) : path),
      data,
    }))
    .filter((entry) => entry.relativePath);

  return {
    entries: normalizedEntries,
    entryRelativePath: "index.html",
  };
}

function publicStorageUrl(url: string, objectPath: string) {
  return `${url}/storage/v1/object/public/ads/${objectPath}`;
}

async function uploadStorageObject({
  config,
  objectPath,
  body,
  contentType,
}: {
  config: { url: string; serviceKey: string };
  objectPath: string;
  body: BodyInit;
  contentType: string;
}) {
  const storageResponse = await fetch(
    `${config.url}/storage/v1/object/ads/${objectPath}`,
    {
      method: "POST",
      headers: {
        apikey: config.serviceKey,
        authorization: `Bearer ${config.serviceKey}`,
        "content-type": contentType,
        "x-upsert": "false",
      },
      body,
      cache: "no-store",
    },
  );

  if (!storageResponse.ok) {
    throw await createCreativeError({
      response: storageResponse,
      code: "STORAGE_UPLOAD_FAILED",
      action: "storage upload",
    });
  }
}

type SupabaseStorageListItem = {
  name?: string;
  id?: string | null;
  metadata?: unknown;
};

async function listStorageObjectPaths({
  config,
  prefix,
}: {
  config: { url: string; serviceKey: string };
  prefix: string;
}) {
  const response = await fetch(`${config.url}/storage/v1/object/list/ads`, {
    method: "POST",
    headers: headers(config.serviceKey),
    body: JSON.stringify({
      prefix,
      limit: 1000,
      offset: 0,
      sortBy: { column: "name", order: "asc" },
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await createCreativeError({
      response,
      code: "CREATIVE_READ_FAILED",
      action: "storage list",
    });
  }

  const items = (await response.json()) as SupabaseStorageListItem[];
  const files: string[] = [];

  for (const item of items) {
    if (!item.name) {
      continue;
    }

    const path = `${prefix}/${item.name}`;

    if (item.id || item.metadata) {
      files.push(path);
    } else {
      files.push(
        ...(await listStorageObjectPaths({
          config,
          prefix: path,
        })),
      );
    }
  }

  return files;
}

async function deleteStorageObjects({
  config,
  prefixes,
}: {
  config: { url: string; serviceKey: string };
  prefixes: string[];
}) {
  if (prefixes.length === 0) {
    return;
  }

  const response = await fetch(`${config.url}/storage/v1/object/ads`, {
    method: "DELETE",
    headers: headers(config.serviceKey),
    body: JSON.stringify({ prefixes }),
    cache: "no-store",
  });

  if (!response.ok) {
    throw await createCreativeError({
      response,
      code: "CREATIVE_WRITE_FAILED",
      action: "storage delete",
    });
  }
}

export async function getAdCreatives(options: { refresh?: boolean } = {}) {
  const now = Date.now();

  if (!options.refresh && cachedCreatives && cachedCreatives.expiresAt > now) {
    return cachedCreatives.rows;
  }

  try {
    const config = getSupabaseConfig();
    const response = await fetch(
      `${config.url}/rest/v1/ad_creatives?select=id,placement,creative_variant,name,file_url,creative_type,entry_url,original_filename,click_url,is_active,uploaded_at,uploaded_by,start_date,end_date,width,height&order=uploaded_at.desc`,
      {
        headers: headers(config.serviceKey),
        next: { revalidate: 60 },
      } as RequestInit & { next: { revalidate: number } },
    );

    if (!response.ok) {
      throw await createCreativeError({
        response,
        code: "CREATIVE_READ_FAILED",
        action: "read",
      });
    }

    const rows = ((await response.json()) as AdCreative[])
      .filter((row) => isManagedAdPlacement(row.placement))
      .map((row) => ({
        ...row,
        creative_variant: isCreativeVariant(row.creative_variant)
          ? row.creative_variant
          : row.placement === "sideskin-left"
            ? "left"
            : row.placement === "sideskin-right"
              ? "right"
              : "default",
      }));

    cachedCreatives = { rows, expiresAt: now + CACHE_MS };
    return rows;
  } catch (error) {
    devLog("failed to read ad creatives; falling back to built-in creatives", error);
    cachedCreatives = { rows: [], expiresAt: now + CACHE_MS };
    return [];
  }
}

export async function getActiveCreativeForPlacement(
  placement: ManagedAdPlacement,
  options: { refresh?: boolean; variant?: CreativeVariant } = {},
) {
  const creatives = await getAdCreatives(options);
  const now = Date.now();
  const variant = options.variant ?? "default";

  return creatives.find((creative) => {
    if (
      creative.placement !== placement ||
      creative.creative_variant !== variant ||
      !creative.is_active
    ) {
      return false;
    }

    const startsAt = creative.start_date ? Date.parse(creative.start_date) : Number.NaN;
    const endsAt = creative.end_date ? Date.parse(creative.end_date) : Number.NaN;

    if (!Number.isNaN(startsAt) && now < startsAt) {
      return false;
    }

    if (!Number.isNaN(endsAt) && now > endsAt) {
      return false;
    }

    return true;
  });
}

export async function getActiveCreativeCampaignForPlacement(
  placementId: AdPlacementId,
  variant: CreativeVariant = "default",
) {
  if (!isManagedAdPlacement(placementId)) {
    return null;
  }

  const creative = await getActiveCreativeForPlacement(placementId, { variant });

  if (!creative) {
    return null;
  }

  return creativeToCampaign(creative, placementId);
}

export function creativeToCampaign(
  creative: AdCreative,
  placementId: AdPlacementId = creative.placement as AdPlacementId,
): AdCampaign {
  return {
    id: creative.id,
    placementId,
    campaignType: "paid",
    priority: 1_000,
    enabled: creative.is_active,
    creativeType: creative.creative_type === "html5" ? "html5" : "image",
    desktopSrc:
      creative.creative_type === "html5"
        ? html5CreativeRouteSrc(creative.id)
        : creative.file_url,
    mobileSrc:
      creative.creative_type === "html5"
        ? html5CreativeRouteSrc(creative.id)
        : creative.file_url,
    clickUrl: creative.click_url ?? undefined,
    startDate: creative.start_date ?? undefined,
    endDate: creative.end_date ?? undefined,
    label: creative.name,
  };
}

async function writeCreativeAudit({
  creativeId,
  action,
  performedBy,
}: {
  creativeId: string;
  action: CreativeAction;
  performedBy: string;
}) {
  try {
    const config = getSupabaseConfig();
    const response = await fetch(`${config.url}/rest/v1/ad_creative_audit`, {
      method: "POST",
      headers: headers(config.serviceKey),
      body: JSON.stringify({
        creative_id: creativeId,
        action,
        performed_by: performedBy,
        timestamp: new Date().toISOString(),
      }),
      cache: "no-store",
    });

    if (!response.ok) {
      devLog(
        "failed to write creative audit",
        await createCreativeError({
          response,
          code: "CREATIVE_WRITE_FAILED",
          action: "audit write",
        }),
      );
    }
  } catch (error) {
    devLog("failed to write creative audit", error);
  }
}

export async function uploadAdCreative({
  placement,
  creativeVariant,
  file,
  creativeType = "image",
  name,
  clickUrl,
  startDate,
  endDate,
  uploadedBy,
}: {
  placement: ManagedAdPlacement;
  creativeVariant: CreativeVariant;
  file: File;
  creativeType?: UploadedCreativeType;
  name?: string;
  clickUrl?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  uploadedBy: string;
}) {
  if (!isManagedAdPlacement(placement)) {
    throw new AdCreativeError({
      code: "INVALID_CREATIVE",
      message: "Unknown advertising placement.",
    });
  }

  const slot = getCreativeSlot(placement, creativeVariant);

  if (!slot) {
    throw new AdCreativeError({
      code: "INVALID_CREATIVE",
      message: "Unknown creative placement variant.",
    });
  }

  if (!isUploadedCreativeType(creativeType)) {
    throw new AdCreativeError({
      code: "INVALID_CREATIVE",
      message: "Creative type must be image or HTML5.",
    });
  }

  const safeClickUrl = normalizeClickUrl(clickUrl);
  const config = getSupabaseConfig();
  const creativeId = crypto.randomUUID();
  let fileUrl = "";
  let entryUrl: string | null = null;

  if (creativeType === "html5") {
    validateZipUploadFile(file);
    const zipBuffer = new Uint8Array(await file.arrayBuffer());
    let zipEntries: ReturnType<typeof normalizeHtml5ZipEntries>;

    try {
      zipEntries = normalizeHtml5ZipEntries(unzipSync(zipBuffer));
    } catch (error) {
      if (error instanceof AdCreativeError) {
        throw error;
      }

      throw new AdCreativeError({
        code: "INVALID_CREATIVE",
        message: "HTML5 ZIP could not be read.",
      });
    }

    const html5Folder = `${HTML5_STORAGE_PREFIX}/${slot.folder}/${creativeId}`;

    for (const entry of zipEntries.entries) {
      const contentType = contentTypeForPath(entry.relativePath);
      const bytes = new Uint8Array(entry.data.length);

      bytes.set(entry.data);

      await uploadStorageObject({
        config,
        objectPath: `${html5Folder}/${entry.relativePath}`,
        body: new Blob([bytes.buffer], { type: contentType }),
        contentType,
      });
    }

    entryUrl = publicStorageUrl(
      config.url,
      `${html5Folder}/${zipEntries.entryRelativePath}`,
    );
    fileUrl = entryUrl;
  } else {
    validateImageUploadFile(file);
    const folder = slot.folder;
    const objectPath = `${folder}/${sanitizeFileName(file.name)}`;

    await uploadStorageObject({
      config,
      objectPath,
      body: file,
      contentType: file.type,
    });

    fileUrl = publicStorageUrl(config.url, objectPath);
  }

  const deactivateResponse = await fetch(
    `${config.url}/rest/v1/ad_creatives?placement=eq.${placement}&creative_variant=eq.${creativeVariant}&is_active=eq.true`,
    {
      method: "PATCH",
      headers: headers(config.serviceKey),
      body: JSON.stringify({ is_active: false }),
      cache: "no-store",
    },
  );

  if (!deactivateResponse.ok) {
    throw await createCreativeError({
      response: deactivateResponse,
      code: "CREATIVE_WRITE_FAILED",
      action: "deactivate previous creatives before upload",
    });
  }

  const insertResponse = await fetch(`${config.url}/rest/v1/ad_creatives`, {
    method: "POST",
    headers: {
      ...headers(config.serviceKey),
      prefer: "return=representation",
    },
    body: JSON.stringify({
      id: creativeId,
      placement,
      creative_variant: creativeVariant,
      name: name?.trim() || file.name,
      file_url: fileUrl,
      creative_type: creativeType,
      entry_url: entryUrl,
      original_filename: file.name,
      click_url: safeClickUrl,
      is_active: true,
      uploaded_at: new Date().toISOString(),
      uploaded_by: uploadedBy,
      start_date: startDate || null,
      end_date: endDate || null,
      width: slot.width,
      height: slot.height,
    }),
    cache: "no-store",
  });

  if (!insertResponse.ok) {
    throw await createCreativeError({
      response: insertResponse,
      code: "CREATIVE_WRITE_FAILED",
      action: "insert",
    });
  }

  const [creative] = (await insertResponse.json()) as AdCreative[];

  await writeCreativeAudit({
    creativeId: creative.id,
    action: "upload_and_activate",
    performedBy: uploadedBy,
  });
  clearAdCreativesCache();

  return creative;
}

export async function setCreativeActive({
  creativeId,
  active,
  performedBy,
}: {
  creativeId: string;
  active: boolean;
  performedBy: string;
}) {
  const config = getSupabaseConfig();
  const readResponse = await fetch(
    `${config.url}/rest/v1/ad_creatives?select=id,placement,creative_variant&id=eq.${creativeId}&limit=1`,
    {
      headers: headers(config.serviceKey),
      cache: "no-store",
    },
  );

  if (!readResponse.ok) {
    throw await createCreativeError({
      response: readResponse,
      code: "CREATIVE_READ_FAILED",
      action: "read creative",
    });
  }

  const [creative] = (await readResponse.json()) as Pick<
    AdCreative,
    "id" | "placement" | "creative_variant"
  >[];

  if (
    !creative ||
    !isManagedAdPlacement(creative.placement) ||
    !isCreativeVariant(creative.creative_variant)
  ) {
    throw new AdCreativeError({
      code: "INVALID_CREATIVE",
      message: "Creative not found.",
    });
  }

  if (active) {
    const deactivateResponse = await fetch(
      `${config.url}/rest/v1/ad_creatives?placement=eq.${creative.placement}&creative_variant=eq.${creative.creative_variant}&is_active=eq.true`,
      {
        method: "PATCH",
        headers: headers(config.serviceKey),
        body: JSON.stringify({ is_active: false }),
        cache: "no-store",
      },
    );

    if (!deactivateResponse.ok) {
      throw await createCreativeError({
        response: deactivateResponse,
        code: "CREATIVE_WRITE_FAILED",
        action: "deactivate previous creatives",
      });
    }
  }

  const updateResponse = await fetch(
    `${config.url}/rest/v1/ad_creatives?id=eq.${creativeId}`,
    {
      method: "PATCH",
      headers: {
        ...headers(config.serviceKey),
        prefer: "return=representation",
      },
      body: JSON.stringify({ is_active: active }),
      cache: "no-store",
    },
  );

  if (!updateResponse.ok) {
    throw await createCreativeError({
      response: updateResponse,
      code: "CREATIVE_WRITE_FAILED",
      action: active ? "activate" : "deactivate",
    });
  }

  const [updated] = (await updateResponse.json()) as AdCreative[];

  await writeCreativeAudit({
    creativeId,
    action: active ? "activate" : "deactivate",
    performedBy,
  });
  clearAdCreativesCache();

  return updated;
}

export async function deleteAdCreative({
  creativeId,
  performedBy,
}: {
  creativeId: string;
  performedBy: string;
}) {
  const config = getSupabaseConfig();
  const readResponse = await fetch(
    `${config.url}/rest/v1/ad_creatives?select=id,placement,creative_variant,creative_type&id=eq.${creativeId}&limit=1`,
    {
      headers: headers(config.serviceKey),
      cache: "no-store",
    },
  );

  if (!readResponse.ok) {
    throw await createCreativeError({
      response: readResponse,
      code: "CREATIVE_READ_FAILED",
      action: "read creative before delete",
    });
  }

  const [creative] = (await readResponse.json()) as Pick<
    AdCreative,
    "id" | "placement" | "creative_variant" | "creative_type"
  >[];

  const deleteResponse = await fetch(
    `${config.url}/rest/v1/ad_creatives?id=eq.${creativeId}`,
    {
      method: "DELETE",
      headers: headers(config.serviceKey),
      cache: "no-store",
    },
  );

  if (!deleteResponse.ok) {
    throw await createCreativeError({
      response: deleteResponse,
      code: "CREATIVE_WRITE_FAILED",
      action: "delete",
    });
  }

  await writeCreativeAudit({
    creativeId,
    action: "delete",
    performedBy,
  });

  if (creative?.creative_type === "html5" && isManagedAdPlacement(creative.placement)) {
    const slot = getCreativeSlot(creative.placement, creative.creative_variant);

    if (slot) {
      const folder = `${HTML5_STORAGE_PREFIX}/${slot.folder}/${creativeId}`;

      try {
        const paths = await listStorageObjectPaths({ config, prefix: folder });

        await deleteStorageObjects({ config, prefixes: paths });
      } catch (error) {
        devLog(
          "failed to delete HTML5 creative folder",
          error,
        );
      }
    }
  }

  clearAdCreativesCache();

  return { id: creativeId };
}
