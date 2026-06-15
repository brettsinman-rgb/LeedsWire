import { NextResponse } from "next/server";
import {
  AdSettingsError,
  isAllowedAdSettingKey,
  updateAdvertisingSetting,
} from "@/lib/adSettings";
import { hasAdminSession } from "@/lib/admin/auth";

export async function POST(request: Request) {
  if (!(await hasAdminSession())) {
    return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: "Invalid JSON" }, { status: 400 });
  }

  const settingKey =
    body && typeof body === "object" && "settingKey" in body
      ? String(body.settingKey)
      : "";
  const settingValue =
    body && typeof body === "object" && "settingValue" in body
      ? body.settingValue
      : undefined;

  if (!isAllowedAdSettingKey(settingKey)) {
    return NextResponse.json(
      { ok: false, error: "Unknown setting key" },
      { status: 400 },
    );
  }

  if (typeof settingValue !== "boolean") {
    return NextResponse.json(
      { ok: false, error: "Setting value must be boolean" },
      { status: 400 },
    );
  }

  try {
    const updated = await updateAdvertisingSetting({
      key: settingKey,
      value: settingValue,
      updatedBy: "LeedsWire Admin",
    });

    return NextResponse.json({ ok: true, updated });
  } catch (error) {
    if (process.env.NODE_ENV === "development") {
      console.warn("[LeedsWire ads] admin setting update failed", error);
    }

    if (error instanceof AdSettingsError) {
      return NextResponse.json(
        {
          ok: false,
          error: error.message,
          code: error.code,
          details: error.details,
        },
        { status: 503 },
      );
    }

    return NextResponse.json(
      {
        ok: false,
        error: "Unable to update advertising setting.",
        code: "SUPABASE_UPDATE_FAILED",
      },
      { status: 503 },
    );
  }
}
