import {
  adSettingKeys,
  getAdControlSettingsFromValues,
  type AdControlSettings,
  type AdSettingKey,
} from "../config/adControls";

export type AdSettingsSource = "supabase" | "fallback";

export type AdSettingsResult = {
  settings: AdControlSettings;
  source: AdSettingsSource;
  warning?: string;
  updatedAt?: string;
};

export type AdSettingsAuditEntry = {
  id?: string;
  setting_key: AdSettingKey;
  old_value?: boolean | null;
  new_value: boolean;
  updated_by?: string | null;
  updated_at: string;
};

type SupabaseSettingRow = {
  setting_key: AdSettingKey;
  setting_value: boolean;
  updated_at?: string;
};

export type AdSettingsErrorCode =
  | "MISSING_SUPABASE_ENV"
  | "MISSING_SUPABASE_TABLE"
  | "SUPABASE_READ_FAILED"
  | "SUPABASE_UPDATE_FAILED"
  | "SUPABASE_AUDIT_FAILED";

export class AdSettingsError extends Error {
  code: AdSettingsErrorCode;
  status?: number;
  details?: string;

  constructor({
    code,
    message,
    status,
    details,
  }: {
    code: AdSettingsErrorCode;
    message: string;
    status?: number;
    details?: string;
  }) {
    super(message);
    this.name = "AdSettingsError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

const CACHE_MS = 45_000;
const allowedSettingKeySet = new Set<string>(adSettingKeys);
let cachedSettings:
  | {
      result: AdSettingsResult;
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

    return {
      missingEnv: missing as string[],
    };
  }

  return { url, serviceKey };
}

function hasSupabaseCredentials(
  config: ReturnType<typeof getSupabaseConfig>,
): config is { url: string; serviceKey: string } {
  return Boolean(config && "url" in config && "serviceKey" in config);
}

function missingEnvError(config: { missingEnv: string[] }) {
  return new AdSettingsError({
    code: "MISSING_SUPABASE_ENV",
    message: `Missing Supabase environment variable${config.missingEnv.length === 1 ? "" : "s"}: ${config.missingEnv.join(", ")}.`,
    details:
      "Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and in Vercel, then restart the dev server.",
  });
}

function headers(serviceKey: string) {
  return {
    apikey: serviceKey,
    authorization: `Bearer ${serviceKey}`,
    "content-type": "application/json",
  };
}

function fallbackSettings(warning?: string): AdSettingsResult {
  return {
    settings: getAdControlSettingsFromValues({}),
    source: "fallback",
    warning,
  };
}

function logSupabaseError(message: string, error: unknown) {
  if (process.env.NODE_ENV === "development") {
    console.warn(`[LeedsWire ads] ${message}`, error);
  }
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

async function createSupabaseError({
  response,
  code,
  action,
}: {
  response: Response;
  code: Exclude<AdSettingsErrorCode, "MISSING_SUPABASE_ENV">;
  action: string;
}) {
  const body = await response.text().catch(() => "");

  if (isMissingTableResponse(response.status, body)) {
    return new AdSettingsError({
      code: "MISSING_SUPABASE_TABLE",
      message:
        "Missing Supabase table: ad_settings or ad_settings_audit has not been created.",
      status: response.status,
      details:
        "Run supabase/migrations/001_ad_settings.sql in Supabase, then retry the admin toggle.",
    });
  }

  return new AdSettingsError({
    code,
    message: `Supabase ${action} failed with status ${response.status}.`,
    status: response.status,
    details: body.slice(0, 500),
  });
}

export function isAllowedAdSettingKey(value: string): value is AdSettingKey {
  return allowedSettingKeySet.has(value);
}

export function clearAdSettingsCache() {
  cachedSettings = undefined;
}

export async function getAdvertisingSettings(options: { refresh?: boolean } = {}) {
  const now = Date.now();

  if (!options.refresh && cachedSettings && cachedSettings.expiresAt > now) {
    return cachedSettings.result;
  }

  const config = getSupabaseConfig();

  if (!hasSupabaseCredentials(config)) {
    const result = fallbackSettings(
      config
        ? missingEnvError(config).message
        : "Supabase settings are not configured. Falling back to environment/default values.",
    );
    cachedSettings = { result, expiresAt: now + CACHE_MS };
    return result;
  }

  try {
    const keys = adSettingKeys.join(",");
    const response = await fetch(
      `${config.url}/rest/v1/ad_settings?select=setting_key,setting_value,updated_at&setting_key=in.(${keys})`,
      {
        headers: headers(config.serviceKey),
        next: { revalidate: 45 },
      } as RequestInit & { next: { revalidate: number } },
    );

    if (!response.ok) {
      throw await createSupabaseError({
        response,
        code: "SUPABASE_READ_FAILED",
        action: "settings fetch",
      });
    }

    const rows = (await response.json()) as SupabaseSettingRow[];
    const values = Object.fromEntries(
      rows.map((row) => [row.setting_key, row.setting_value]),
    ) as Partial<Record<AdSettingKey, boolean>>;
    const updatedAt = rows
      .map((row) => row.updated_at)
      .filter((value): value is string => Boolean(value))
      .sort()
      .at(-1);
    const result: AdSettingsResult = {
      settings: getAdControlSettingsFromValues(values),
      source: "supabase",
      updatedAt,
    };

    cachedSettings = { result, expiresAt: now + CACHE_MS };
    return result;
  } catch (error) {
    logSupabaseError("failed to read ad settings; ads left enabled by fallback", error);
    const result = fallbackSettings(
      "Supabase is unavailable. Ads are using safe fallback values.",
    );
    cachedSettings = { result, expiresAt: now + CACHE_MS };
    return result;
  }
}

async function readSingleSetting(key: AdSettingKey) {
  const config = getSupabaseConfig();

  if (!hasSupabaseCredentials(config)) {
    throw missingEnvError(config);
  }

  const response = await fetch(
    `${config.url}/rest/v1/ad_settings?select=setting_key,setting_value,updated_at&setting_key=eq.${key}&limit=1`,
    {
      headers: headers(config.serviceKey),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw await createSupabaseError({
      response,
      code: "SUPABASE_READ_FAILED",
      action: "setting read",
    });
  }

  const rows = (await response.json()) as SupabaseSettingRow[];
  return rows[0];
}

export async function updateAdvertisingSetting({
  key,
  value,
  updatedBy,
}: {
  key: AdSettingKey;
  value: boolean;
  updatedBy: string;
}) {
  const config = getSupabaseConfig();

  if (!hasSupabaseCredentials(config)) {
    throw missingEnvError(config);
  }

  const previous = await readSingleSetting(key);
  const now = new Date().toISOString();
  const response = await fetch(
    `${config.url}/rest/v1/ad_settings?setting_key=eq.${key}`,
    {
      method: "PATCH",
      headers: {
        ...headers(config.serviceKey),
        prefer: "return=representation",
      },
      body: JSON.stringify({
        setting_value: value,
        updated_at: now,
      }),
      cache: "no-store",
    },
  );

  if (!response.ok) {
    throw await createSupabaseError({
      response,
      code: "SUPABASE_UPDATE_FAILED",
      action: "setting update",
    });
  }

  await writeAdSettingsAudit({
    key,
    oldValue: previous?.setting_value,
    newValue: value,
    updatedBy,
  });

  clearAdSettingsCache();

  return {
    key,
    value,
    updatedAt: now,
  };
}

export async function writeAdSettingsAudit({
  key,
  oldValue,
  newValue,
  updatedBy,
}: {
  key: AdSettingKey;
  oldValue?: boolean;
  newValue: boolean;
  updatedBy: string;
}) {
  const config = getSupabaseConfig();

  if (!hasSupabaseCredentials(config)) {
    return;
  }

  const response = await fetch(`${config.url}/rest/v1/ad_settings_audit`, {
    method: "POST",
    headers: headers(config.serviceKey),
    body: JSON.stringify({
      setting_key: key,
      old_value: oldValue,
      new_value: newValue,
      updated_by: updatedBy,
      updated_at: new Date().toISOString(),
    }),
    cache: "no-store",
  });

  if (!response.ok) {
    logSupabaseError(
      "failed to write ad settings audit",
      await createSupabaseError({
        response,
        code: "SUPABASE_AUDIT_FAILED",
        action: "audit write",
      }),
    );
  }
}

export async function getAdSettingsAudit(limit = 10) {
  const config = getSupabaseConfig();

  if (!hasSupabaseCredentials(config)) {
    return [];
  }

  try {
    const response = await fetch(
      `${config.url}/rest/v1/ad_settings_audit?select=id,setting_key,old_value,new_value,updated_by,updated_at&order=updated_at.desc&limit=${limit}`,
      {
        headers: headers(config.serviceKey),
        next: { revalidate: 45 },
      } as RequestInit & { next: { revalidate: number } },
    );

    if (!response.ok) {
      throw await createSupabaseError({
        response,
        code: "SUPABASE_READ_FAILED",
        action: "audit fetch",
      });
    }

    return (await response.json()) as AdSettingsAuditEntry[];
  } catch (error) {
    logSupabaseError("failed to read ad settings audit", error);
    return [];
  }
}
