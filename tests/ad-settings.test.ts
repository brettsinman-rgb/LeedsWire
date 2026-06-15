import assert from "node:assert/strict";
import {
  AdSettingsError,
  clearAdSettingsCache,
  getAdSettingsAudit,
  getAdvertisingSettings,
  isAllowedAdSettingKey,
  updateAdvertisingSetting,
} from "../src/lib/adSettings";

const originalFetch = global.fetch;
const originalUrl = process.env.SUPABASE_URL;
const originalKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function setSupabaseEnv() {
  process.env.SUPABASE_URL = "https://example.supabase.co";
  process.env.SUPABASE_SERVICE_ROLE_KEY = "service-role-key";
  clearAdSettingsCache();
}

function restore() {
  global.fetch = originalFetch;
  if (originalUrl === undefined) {
    delete process.env.SUPABASE_URL;
  } else {
    process.env.SUPABASE_URL = originalUrl;
  }
  if (originalKey === undefined) {
    delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  } else {
    process.env.SUPABASE_SERVICE_ROLE_KEY = originalKey;
  }
  clearAdSettingsCache();
}

async function run() {
  assert.equal(isAllowedAdSettingKey("ADS_ENABLED"), true);
  assert.equal(isAllowedAdSettingKey("UNKNOWN_SETTING"), false);

  delete process.env.SUPABASE_URL;
  delete process.env.SUPABASE_SERVICE_ROLE_KEY;
  clearAdSettingsCache();

  assert.equal((await getAdvertisingSettings()).source, "fallback");

  await assert.rejects(
    () =>
      updateAdvertisingSetting({
        key: "POPUP_ENABLED",
        value: false,
        updatedBy: "LeedsWire Admin",
      }),
    (error: unknown) =>
      error instanceof AdSettingsError &&
      error.code === "MISSING_SUPABASE_ENV" &&
      error.message.includes("SUPABASE_URL") &&
      error.message.includes("SUPABASE_SERVICE_ROLE_KEY"),
  );

  setSupabaseEnv();
  const fetchCalls: Array<{ url: string; init?: RequestInit }> = [];

  global.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = String(input);
    fetchCalls.push({ url, init });

    if (url.includes("ad_settings?select=setting_key")) {
      return Response.json([
        {
          setting_key: "ADS_ENABLED",
          setting_value: true,
          updated_at: "2026-06-15T00:00:00.000Z",
        },
        {
          setting_key: "POPUP_ENABLED",
          setting_value: false,
          updated_at: "2026-06-15T00:01:00.000Z",
        },
      ]);
    }

    if (url.includes("ad_settings?setting_key=eq.POPUP_ENABLED")) {
      if (init?.method === "PATCH") {
        return Response.json([
          {
            setting_key: "POPUP_ENABLED",
            setting_value: true,
            updated_at: "2026-06-15T00:02:00.000Z",
          },
        ]);
      }

      return Response.json([
        {
          setting_key: "POPUP_ENABLED",
          setting_value: false,
          updated_at: "2026-06-15T00:01:00.000Z",
        },
      ]);
    }

    if (url.includes("ad_settings_audit")) {
      return Response.json([]);
    }

    return Response.json([]);
  }) as typeof fetch;

  const settingsResult = await getAdvertisingSettings({ refresh: true });
  assert.equal(settingsResult.source, "supabase");
  assert.equal(settingsResult.settings.adsEnabled, true);
  assert.equal(settingsResult.settings.popupEnabled, false);
  assert.equal(settingsResult.updatedAt, "2026-06-15T00:01:00.000Z");

  await updateAdvertisingSetting({
    key: "POPUP_ENABLED",
    value: true,
    updatedBy: "LeedsWire Admin",
  });

  assert.equal(
    fetchCalls.some(
      (call) =>
        call.url.includes("ad_settings?setting_key=eq.POPUP_ENABLED") &&
        call.init?.method === "PATCH",
    ),
    true,
    "toggle updates Supabase ad_settings",
  );

  assert.equal(
    fetchCalls.some(
      (call) =>
        call.url.includes("ad_settings_audit") && call.init?.method === "POST",
    ),
    true,
    "toggle writes audit entry",
  );

  const audit = await getAdSettingsAudit();
  assert.equal(Array.isArray(audit), true);

  setSupabaseEnv();
  global.fetch = (async () =>
    Response.json(
      {
        code: "42P01",
        message: 'relation "public.ad_settings" does not exist',
      },
      { status: 404 },
    )) as typeof fetch;

  await assert.rejects(
    () =>
      updateAdvertisingSetting({
        key: "POPUP_ENABLED",
        value: false,
        updatedBy: "LeedsWire Admin",
      }),
    (error: unknown) =>
      error instanceof AdSettingsError &&
      error.code === "MISSING_SUPABASE_TABLE" &&
      error.message.includes("ad_settings"),
  );

  restore();

  console.log("ad settings Supabase tests passed");
}

run().catch((error) => {
  restore();
  throw error;
});
